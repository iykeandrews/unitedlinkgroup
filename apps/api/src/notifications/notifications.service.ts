import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationsStreamService } from './notifications-stream.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService, private stream: NotificationsStreamService) {}

  async createNotification(userId: string, type: string, title: string, message: string, metadata?: any) {
    return this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  }

  async getUserNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.userId !== userId) throw new ForbiddenException('You cannot access this notification');

    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async remove(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) throw new NotFoundException('Notification not found');
    if (notification.userId !== userId) throw new ForbiddenException('You cannot access this notification');

    return this.prisma.notification.delete({
      where: { id },
    });
  }

  // Stub for sending email (using console.log for now)
  async sendEmail(to: string, subject: string, body: string) {
    console.log(`[EMAIL STUB] To: ${to}, Subject: ${subject}, Body: ${body}`);
    // In real app, use SendGrid / AWS SES / Nodemailer
  }

  // Push via SSE to connected clients
  async sendPush(userId: string, payload: { type: string; title: string; message: string; metadata?: any; actionUrl?: string }) {
    this.stream.emitToUser(userId, payload);
  }

  // Create a message in an employee-admin conversation, persist audit, and notify recipient
  async addConversationMessage(employeeId: string, senderUserId: string, text: string, senderUser?: any) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true, business: true }
    });
    if (!employee) throw new NotFoundException('Employee not found');

    // Access Control Check
    if (senderUser) {
        if (senderUser.role !== 'SUPER_ADMIN') {
             if (senderUser.userId === employee.userId) {
                 // Allowed
             } else {
                 const isBusinessAdmin = senderUser.role === 'BUSINESS_ADMIN' || senderUser.role === 'MANAGER';
                 const isSameBusiness = senderUser.businessId === employee.businessId;
                 
                 if (!isBusinessAdmin || !isSameBusiness) {
                      const isOwner = employee.business.ownerId === senderUser.userId;
                      if (!isOwner) {
                           throw new ForbiddenException('Access denied to this conversation');
                      }
                 }
             }
        }
    }

    const sender = await this.prisma.user.findUnique({ where: { id: senderUserId } });
    if (!sender) throw new NotFoundException('Sender not found');

    const senderRole = sender.role;

    // Decide recipient:
    // - If sender is admin/superadmin/manager, recipient is the employee user (if linked)
    // - If sender is employee, recipient is business owner (admin)
    let recipientUserId: string | null = null;
    if (senderRole === 'EMPLOYEE') {
      recipientUserId = employee.business.ownerId;
    } else {
      recipientUserId = employee.userId || null;
    }

    // Persist audit trail for conversation thread tied to the employee
    await this.prisma.auditLog.create({
      data: {
        businessId: employee.businessId,
        userId: senderUserId,
        action: 'MESSAGE',
        resource: 'EMPLOYEE',
        resourceId: employeeId,
        details: JSON.stringify({
          text,
          senderRole,
          senderUserId,
          employeeId
        })
      } as any
    });

    // Notify recipient (if exists) with a concise preview and metadata for deep linking
    if (recipientUserId) {
      const title =
        senderRole === 'EMPLOYEE'
          ? `New message from ${employee.firstName} ${employee.lastName}`
          : `New message regarding ${employee.firstName} ${employee.lastName}`;
      const preview = text.length > 140 ? text.slice(0, 140) + '…' : text;
      await this.createNotification(recipientUserId, 'MESSAGE', title, preview, {
        kind: 'MESSAGE',
        employeeId,
        employeeName: `${employee.firstName} ${employee.lastName}`
      });
      this.sendPush(recipientUserId, {
        type: 'MESSAGE',
        title,
        message: preview,
        metadata: { employeeId }
      });
    }

    return { ok: true };
  }

  // Fetch the threaded conversation for an employee (admin and employee can view)
  async getConversation(employeeId: string, requestUser: any) {
    // Validate access
    const employee = await this.prisma.employee.findUnique({
        where: { id: employeeId },
        include: { business: true }
    });
    
    if (!employee) {
        // Return empty or throw? Throwing reveals existence, but it's okay for now.
        // Actually, if we want to be strict, we should check existence.
        throw new NotFoundException('Conversation not found');
    }

    if (requestUser.role !== 'SUPER_ADMIN') {
        const isEmployee = requestUser.userId === employee.userId;
        const isBusinessAdmin = (requestUser.role === 'BUSINESS_ADMIN' || requestUser.role === 'MANAGER') && requestUser.businessId === employee.businessId;
        const isOwner = employee.business.ownerId === requestUser.userId;

        if (!isEmployee && !isBusinessAdmin && !isOwner) {
            throw new ForbiddenException('Access denied');
        }
    }

    const logs = await this.prisma.auditLog.findMany({
      where: {
        resource: 'EMPLOYEE',
        resourceId: employeeId,
        action: 'MESSAGE'
      },
      orderBy: { createdAt: 'asc' }
    });

    // Optionally hydrate sender names
    const userIds = Array.from(new Set(logs.map(l => l.userId).filter(Boolean))) as string[];
    const users = userIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: userIds } } })
      : [];
    const userMap = new Map(users.map(u => [u.id, u]));

    return logs.map(l => {
      let details: any = {};
      try {
        details = l.details ? JSON.parse(l.details as any) : {};
      } catch {}
      const sender = l.userId ? userMap.get(l.userId) : undefined;
      return {
        id: l.id,
        text: details?.text || '',
        senderUserId: l.userId,
        senderRole: details?.senderRole || (sender?.role ?? 'UNKNOWN'),
        senderName: sender ? `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || sender.email : 'System',
        createdAt: l.createdAt
      };
    });
  }
}
