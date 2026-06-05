import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@unitedlinkgroup/types';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PushService } from '../push/push.service';
import { CreateGroupThreadDto } from './dto/create-group-thread.dto';
import { EditChatMessageDto } from './dto/edit-chat-message.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { UpdateThreadDto } from './dto/update-thread.dto';

@Injectable()
export class ChatsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private push: PushService
  ) {}

  private getUserId(user: any) {
    return user?.userId || user?.sub || user?.id;
  }

  private isAdmin(user: any) {
    return user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.BUSINESS_ADMIN;
  }

  private async getBusinessId(user: any, businessIdHeader?: string): Promise<string> {
    if (user.role === UserRole.SUPER_ADMIN) {
      if (businessIdHeader) return businessIdHeader;
      throw new BadRequestException('Business context required for Super Admin');
    }

    const userId = this.getUserId(user);
    const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: userId } });
    if (ownedBusiness) {
      if (businessIdHeader && businessIdHeader !== ownedBusiness.id) {
        throw new BadRequestException('Access denied: You cannot access another business data');
      }
      return ownedBusiness.id;
    }

    const employee = await this.prisma.employee.findFirst({ where: { userId } });
    if (!employee) throw new BadRequestException('User is not associated with a business');
    if (businessIdHeader && businessIdHeader !== employee.businessId) {
      throw new BadRequestException('Access denied: You cannot access another business data');
    }
    return employee.businessId;
  }

  private async getEmployeeForUser(user: any, businessId?: string) {
    const userId = this.getUserId(user);
    if (!userId) return null;
    return this.prisma.employee.findFirst({ where: { userId, ...(businessId ? { businessId } : {}) } });
  }

  private async requireEmployee(user: any, businessId: string) {
    const existing = await this.getEmployeeForUser(user, businessId);
    if (existing) return existing;

    if (!this.isAdmin(user)) throw new BadRequestException('Employee profile required for chat actions');

    const userId = this.getUserId(user);
    if (!userId) throw new BadRequestException('Employee profile required for chat actions');

    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });
    if (!u?.email) throw new BadRequestException('Employee profile required for chat actions');

    return this.prisma.employee.create({
      data: {
        firstName: u.firstName || 'Admin',
        lastName: u.lastName || 'User',
        email: u.email,
        businessId,
        userId: u.id,
        role: u.role === UserRole.SUPER_ADMIN ? UserRole.BUSINESS_ADMIN : u.role,
        type: 'FULL_TIME',
        payType: 'SALARY',
        status: 'ACTIVE',
      } as any,
    });
  }

  private async ensureEmployeeForUserId(businessId: string, userId: string) {
    const existing = await this.prisma.employee.findFirst({ where: { businessId, userId } });
    if (existing) return existing;

    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });
    if (!u?.email) throw new BadRequestException('Employee profile required for chat actions');

    const role = u.role === UserRole.SUPER_ADMIN ? UserRole.BUSINESS_ADMIN : u.role;
    return this.prisma.employee.create({
      data: {
        firstName: u.firstName || 'Admin',
        lastName: u.lastName || 'User',
        email: u.email,
        businessId,
        userId: u.id,
        role,
        type: 'FULL_TIME',
        payType: 'SALARY',
        status: 'ACTIVE',
      } as any,
    });
  }

  private async getThreadOrThrow(businessId: string, threadId: string) {
    const thread = await this.prisma.chatThread.findFirst({
      where: { id: threadId, businessId },
      include: {
        participants: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                badgeNumber: true,
                status: true,
                profileImageUrl: true,
                role: true,
                customRole: { select: { name: true } },
              },
            },
          },
        },
      },
    });
    if (!thread) throw new NotFoundException('Chat not found');
    return thread;
  }

  private async requireThreadAccess(user: any, businessId: string, threadId: string) {
    const thread = await this.getThreadOrThrow(businessId, threadId);
    const employee = await this.requireEmployee(user, businessId);
    const participant = thread.participants.find((p: any) => p.employeeId === employee.id);
    if (!participant) throw new ForbiddenException('You are not a participant in this chat');
    return { thread, employee, participant };
  }

  private directKey(a: string, b: string) {
    return [a, b].sort().join(':');
  }

  private roleToDesignation(rawRole: unknown, customRoleName?: string | null) {
    const custom = String(customRoleName || '').trim();
    if (custom) return custom;

    const role = String(rawRole || '').trim().toUpperCase();
    if (role === 'SUPER_ADMIN') return 'Administrator';
    if (role === 'BUSINESS_ADMIN') return 'Business Admin';
    if (role === 'MANAGER') return 'Manager';
    if (role === 'EMPLOYEE') return 'Employee';
    if (!role) return '';
    return role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  async notifyNewChatMessage(args: {
    businessId: string;
    threadId: string;
    messageId: string;
    senderEmployeeId: string;
    senderName: string;
    text: string | null;
    hasAttachments: boolean;
  }) {
    const thread = await this.prisma.chatThread.findFirst({
      where: { id: args.threadId, businessId: args.businessId },
      select: {
        id: true,
        type: true,
        title: true,
        participants: { select: { employeeId: true, employee: { select: { userId: true } } } },
      },
    });
    if (!thread) return;

    const previewBase = args.text?.trim() || '';
    const preview = previewBase
      ? previewBase.length > 140
        ? `${previewBase.slice(0, 140)}…`
        : previewBase
      : args.hasAttachments
        ? 'Sent an attachment'
        : 'New message';

    const title = thread.type === 'DIRECT' ? `New message from ${args.senderName}` : thread.title || 'New group message';
    const message = thread.type === 'DIRECT' ? preview : `${args.senderName}: ${preview}`;
    const metadata = { kind: 'CHAT', threadId: thread.id, messageId: args.messageId };
    const actionUrl = `/dashboard/communications/chats?threadId=${encodeURIComponent(thread.id)}&messageId=${encodeURIComponent(args.messageId)}`;

    for (const p of thread.participants) {
      if (p.employeeId === args.senderEmployeeId) continue;
      const userId = p.employee?.userId;
      if (!userId) continue;
      await this.notifications.createNotification(userId, 'CHAT', title, message, metadata);
      await this.notifications.sendPush(userId, { type: 'CHAT', title, message, metadata });
      await this.push.send(userId, { type: 'CHAT', title, message, metadata, actionUrl });
    }
  }

  async listThreads(user: any, businessIdHeader?: string, opts?: { type?: string }) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const employee = await this.getEmployeeForUser(user, businessId);
    if (!employee) return [];

    const where: any = {
      businessId,
      participants: { some: { employeeId: employee.id } },
    };
    if (opts?.type) where.type = opts.type;

    const threads = await this.prisma.chatThread.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        participants: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                badgeNumber: true,
                status: true,
                profileImageUrl: true,
                role: true,
                customRole: { select: { name: true } },
              },
            },
          },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            senderEmployee: { select: { id: true, firstName: true, lastName: true } },
            attachments: true,
          },
        },
      },
    });

    const unreadCounts = employee
      ? await Promise.all(
          threads.map(async (t) => {
            const mine = t.participants.find((p: any) => p.employeeId === employee.id);
            const lastReadAt = mine?.lastReadAt || null;
            const count = await this.prisma.chatMessage.count({
              where: {
                threadId: t.id,
                deletedAt: null,
                senderEmployeeId: { not: employee.id },
                ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
              },
            });
            return [t.id, count] as const;
          })
        )
      : [];

    const unreadMap = new Map<string, number>(unreadCounts as any);

    return threads.map((t: any) => {
      const last = t.messages[0] || null;
      const members = t.participants.map((p: any) => ({
        employeeId: p.employeeId,
        role: p.role,
        lastReadAt: p.lastReadAt,
        employee: p.employee,
      }));

      let displayTitle = t.title || 'Chat';
      let displayImageUrl = t.imageUrl || null;
      let displayDesignation = '';
      if (t.type === 'DIRECT' && employee) {
        const other = members.find((m: any) => m.employeeId !== employee.id);
        if (other?.employee) {
          displayTitle = `${other.employee.firstName} ${other.employee.lastName}`.trim();
          displayImageUrl = other.employee.profileImageUrl || displayImageUrl;
          displayDesignation = this.roleToDesignation(other.employee.role, other.employee.customRole?.name);
        }
      }

      return {
        id: t.id,
        type: t.type,
        title: t.title,
        imageUrl: t.imageUrl,
        displayTitle,
        displayImageUrl,
        displayDesignation,
        updatedAt: t.updatedAt,
        unreadCount: unreadMap.get(t.id) || 0,
        participants: members,
        lastMessage: last
          ? {
              id: last.id,
              text: last.text,
              createdAt: last.createdAt,
              senderEmployeeId: last.senderEmployeeId,
              senderName: `${last.senderEmployee?.firstName || ''} ${last.senderEmployee?.lastName || ''}`.trim(),
              attachments: last.attachments?.map((a: any) => ({ id: a.id, type: a.type, url: a.url, originalName: a.originalName, mimeType: a.mimeType })) || [],
            }
          : null,
      };
    });
  }

  async createDirectThread(user: any, businessIdHeader: string | undefined, otherEmployeeId: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const me = await this.requireEmployee(user, businessId);

    if (me.id === otherEmployeeId) throw new BadRequestException('Cannot create direct chat with yourself');
    const other = await this.prisma.employee.findFirst({ where: { id: otherEmployeeId, businessId, status: 'ACTIVE' } });
    if (!other) throw new NotFoundException('Employee not found');

    const key = this.directKey(me.id, other.id);
    const existing = await this.prisma.chatThread.findFirst({ where: { businessId, directKey: key } });
    if (existing) return existing;

    return this.prisma.chatThread.create({
      data: {
        businessId,
        type: 'DIRECT',
        directKey: key,
        participants: {
          create: [
            { employeeId: me.id, role: 'MEMBER' },
            { employeeId: other.id, role: 'MEMBER' },
          ],
        },
      },
    });
  }

  async createSupportThread(user: any, businessIdHeader: string | undefined) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const me = await this.requireEmployee(user, businessId);

    const business = await this.prisma.business.findUnique({
      where: { id: businessId },
      select: { ownerId: true },
    });

    let adminEmployee: any = null;
    if (business?.ownerId) {
      adminEmployee = await this.ensureEmployeeForUserId(businessId, business.ownerId);
    }

    if (!adminEmployee) {
      adminEmployee = await this.prisma.employee.findFirst({
        where: { businessId, userId: { not: null }, role: { in: [UserRole.BUSINESS_ADMIN, UserRole.MANAGER] } },
        orderBy: { createdAt: 'asc' } as any,
      });
    }

    if (!adminEmployee?.id) throw new BadRequestException('No admin account is available for support chat');
    if (adminEmployee.id === me.id) throw new BadRequestException('No admin account is available for support chat');
    return this.createDirectThread(user, businessIdHeader, adminEmployee.id);
  }

  async createGroupThread(user: any, businessIdHeader: string | undefined, dto: CreateGroupThreadDto) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    if (!this.isAdmin(user)) throw new ForbiddenException('Only admins can create groups');

    const memberIds = new Set<string>(dto.memberEmployeeIds || []);
    const me = await this.requireEmployee(user, businessId);
    memberIds.add(me.id);

    const employees = await this.prisma.employee.findMany({ where: { businessId, id: { in: Array.from(memberIds) }, status: 'ACTIVE' } });
    if (employees.length === 0) throw new BadRequestException('At least one active member required');

    const thread = await this.prisma.chatThread.create({
      data: {
        businessId,
        type: 'GROUP',
        title: dto.title.trim(),
        imageUrl: dto.imageUrl || null,
        createdById: this.getUserId(user) || null,
        participants: {
          create: employees.map((e) => ({
            employeeId: e.id,
            role: e.id === me.id ? 'ADMIN' : 'MEMBER',
          })),
        },
      },
    });
    return thread;
  }

  async getThread(user: any, businessIdHeader: string | undefined, threadId: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const { thread, participant } = await this.requireThreadAccess(user, businessId, threadId);
    return {
      id: thread.id,
      type: thread.type,
      title: thread.title,
      imageUrl: thread.imageUrl,
      directKey: thread.directKey,
      updatedAt: thread.updatedAt,
      myRole: participant?.role || null,
      myLastReadAt: participant?.lastReadAt || null,
      participants: thread.participants.map((p: any) => ({
        employeeId: p.employeeId,
        role: p.role,
        lastReadAt: p.lastReadAt,
        employee: p.employee,
      })),
    };
  }

  async updateThread(user: any, businessIdHeader: string | undefined, threadId: string, dto: UpdateThreadDto) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const { thread, employee } = await this.requireThreadAccess(user, businessId, threadId);
    if (thread.type !== 'GROUP') throw new BadRequestException('Only groups can be updated');

    const participant = employee ? thread.participants.find((p: any) => p.employeeId === employee.id) : null;
    if (!this.isAdmin(user) && participant?.role !== 'ADMIN') throw new ForbiddenException('Only admins can update group info');

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl || null;
    data.updatedAt = new Date();

    return this.prisma.chatThread.update({ where: { id: threadId }, data });
  }

  async addMember(user: any, businessIdHeader: string | undefined, threadId: string, employeeId: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const { thread, employee } = await this.requireThreadAccess(user, businessId, threadId);
    if (thread.type !== 'GROUP') throw new BadRequestException('Cannot add members to a direct chat');

    const participant = employee ? thread.participants.find((p: any) => p.employeeId === employee.id) : null;
    if (!this.isAdmin(user) && participant?.role !== 'ADMIN') throw new ForbiddenException('Only admins can add members');

    const emp = await this.prisma.employee.findFirst({ where: { id: employeeId, businessId, status: 'ACTIVE' } });
    if (!emp) throw new NotFoundException('Employee not found');

    await this.prisma.chatParticipant.upsert({
      where: { threadId_employeeId: { threadId, employeeId } },
      update: {},
      create: { threadId, employeeId, role: 'MEMBER' },
    });
    await this.prisma.chatThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });
    return { ok: true };
  }

  async removeMember(user: any, businessIdHeader: string | undefined, threadId: string, employeeId: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const { thread, employee } = await this.requireThreadAccess(user, businessId, threadId);
    if (thread.type !== 'GROUP') throw new BadRequestException('Cannot remove members from a direct chat');

    const participant = employee ? thread.participants.find((p: any) => p.employeeId === employee.id) : null;
    if (!this.isAdmin(user) && participant?.role !== 'ADMIN') throw new ForbiddenException('Only admins can remove members');

    await this.prisma.chatParticipant.deleteMany({ where: { threadId, employeeId } });
    await this.prisma.chatThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });
    return { ok: true };
  }

  async listMessages(user: any, businessIdHeader: string | undefined, threadId: string, before?: string, take = 50) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    await this.requireThreadAccess(user, businessId, threadId);

    const where: any = { threadId };
    if (before) where.createdAt = { lt: new Date(before) };

    const messages = await this.prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(200, Math.max(1, take)),
      include: {
        senderEmployee: { select: { id: true, firstName: true, lastName: true } },
        attachments: true,
        reactions: { include: { employee: { select: { id: true, firstName: true, lastName: true } } } },
        replyTo: {
          include: { senderEmployee: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    return messages
      .slice()
      .reverse()
      .map((m: any) => ({
        id: m.id,
        threadId: m.threadId,
        senderEmployeeId: m.senderEmployeeId,
        senderName: `${m.senderEmployee?.firstName || ''} ${m.senderEmployee?.lastName || ''}`.trim(),
        text: m.deletedAt ? null : m.text,
        createdAt: m.createdAt,
        editedAt: m.editedAt,
        deletedAt: m.deletedAt,
        replyTo: m.replyTo
          ? {
              id: m.replyTo.id,
              senderEmployeeId: m.replyTo.senderEmployeeId,
              senderName: `${m.replyTo.senderEmployee?.firstName || ''} ${m.replyTo.senderEmployee?.lastName || ''}`.trim(),
              text: m.replyTo.deletedAt ? null : m.replyTo.text,
            }
          : null,
        attachments: (m.attachments || []).map((a: any) => ({
          id: a.id,
          type: a.type,
          url: a.url,
          filename: a.filename,
          originalName: a.originalName,
          mimeType: a.mimeType,
          size: a.size,
        })),
        reactions: (m.reactions || []).map((r: any) => ({
          id: r.id,
          emoji: r.emoji,
          employeeId: r.employeeId,
          employeeName: `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.trim(),
        })),
      }));
  }

  async sendMessage(user: any, businessIdHeader: string | undefined, threadId: string, dto: SendChatMessageDto) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const { thread, employee } = await this.requireThreadAccess(user, businessId, threadId);
    const sender = employee || (this.isAdmin(user) ? await this.requireEmployee(user, businessId) : null);
    if (!sender) throw new BadRequestException('Employee profile required for sending messages');

    const text = dto.text?.trim() || '';
    const attachments = dto.attachments || [];
    if (!text && attachments.length === 0) throw new BadRequestException('Message text or attachments required');

    if (dto.replyToId) {
      const reply = await this.prisma.chatMessage.findFirst({ where: { id: dto.replyToId, threadId } });
      if (!reply) throw new BadRequestException('Reply target not found');
    }

    const msg = await this.prisma.chatMessage.create({
      data: {
        threadId,
        senderEmployeeId: sender.id,
        text: text || null,
        replyToId: dto.replyToId || null,
        attachments: {
          create: attachments.map((a: any) => ({
            type: a.type,
            url: a.url,
            filename: a.filename || null,
            originalName: a.originalName || null,
            mimeType: a.mimeType || null,
            size: typeof a.size === 'number' ? a.size : null,
          })),
        },
      },
      include: {
        senderEmployee: { select: { id: true, firstName: true, lastName: true } },
        attachments: true,
        reactions: true,
        replyTo: { include: { senderEmployee: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });

    await this.prisma.chatThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });

    await this.notifyNewChatMessage({
      businessId,
      threadId,
      messageId: msg.id,
      senderEmployeeId: msg.senderEmployeeId,
      senderName: `${msg.senderEmployee?.firstName || ''} ${msg.senderEmployee?.lastName || ''}`.trim(),
      text: msg.text,
      hasAttachments: (msg.attachments || []).length > 0,
    });

    return {
      id: msg.id,
      threadId: msg.threadId,
      senderEmployeeId: msg.senderEmployeeId,
      senderName: `${msg.senderEmployee?.firstName || ''} ${msg.senderEmployee?.lastName || ''}`.trim(),
      text: msg.text,
      createdAt: msg.createdAt,
      editedAt: msg.editedAt,
      deletedAt: msg.deletedAt,
      replyTo: msg.replyTo
        ? {
            id: msg.replyTo.id,
            senderEmployeeId: msg.replyTo.senderEmployeeId,
            senderName: `${msg.replyTo.senderEmployee?.firstName || ''} ${msg.replyTo.senderEmployee?.lastName || ''}`.trim(),
            text: msg.replyTo.deletedAt ? null : msg.replyTo.text,
          }
        : null,
      attachments: (msg.attachments || []).map((a: any) => ({
        id: a.id,
        type: a.type,
        url: a.url,
        filename: a.filename,
        originalName: a.originalName,
        mimeType: a.mimeType,
        size: a.size,
      })),
      reactions: [],
      thread: { type: thread.type },
    };
  }

  async markRead(user: any, businessIdHeader: string | undefined, threadId: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const employee = await this.requireEmployee(user, businessId);
    await this.requireThreadAccess(user, businessId, threadId);
    const lastReadAt = new Date();
    await this.prisma.chatParticipant.upsert({
      where: { threadId_employeeId: { threadId, employeeId: employee.id } },
      update: { lastReadAt },
      create: { threadId, employeeId: employee.id, lastReadAt, role: 'MEMBER' },
    });
    const userId = this.getUserId(user);
    if (userId) {
      const threadIdNeedle = `"threadId":"${threadId}"`;
      await this.prisma.notification.updateMany({
        where: { userId, type: 'CHAT', read: false, metadata: { contains: threadIdNeedle } },
        data: { read: true },
      });
    }
    return { threadId, employeeId: employee.id, lastReadAt };
  }

  async editMessage(user: any, businessIdHeader: string | undefined, messageId: string, dto: EditChatMessageDto) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const msg = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, thread: { businessId } },
      include: { thread: true },
    });
    if (!msg) throw new NotFoundException('Message not found');

    const employee = await this.requireEmployee(user, businessId);
    if (!this.isAdmin(user) && msg.senderEmployeeId !== employee.id) throw new ForbiddenException('You can only edit your own messages');
    if (msg.deletedAt) throw new BadRequestException('Cannot edit a deleted message');
    if (Date.now() - new Date(msg.createdAt).getTime() > 30 * 60 * 1000) throw new BadRequestException('Messages cannot be edited after 30 minutes');
    const replyExists = await this.prisma.chatMessage.findFirst({ where: { replyToId: messageId, deletedAt: null }, select: { id: true } });
    if (replyExists) throw new BadRequestException('Messages cannot be edited after a reply');

    const text = dto.text?.trim();
    if (!text) throw new BadRequestException('Message text is required');

    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { text, editedAt: new Date() },
    });
  }

  async deleteMessage(user: any, businessIdHeader: string | undefined, messageId: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const msg = await this.prisma.chatMessage.findFirst({ where: { id: messageId, thread: { businessId } } });
    if (!msg) throw new NotFoundException('Message not found');

    const employee = await this.requireEmployee(user, businessId);
    if (!this.isAdmin(user) && msg.senderEmployeeId !== employee.id) throw new ForbiddenException('You can only delete your own messages');

    await this.prisma.chatAttachment.deleteMany({ where: { messageId } });
    await this.prisma.chatReaction.deleteMany({ where: { messageId } });
    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), text: null },
    });
  }

  async addReaction(user: any, businessIdHeader: string | undefined, messageId: string, emoji: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const employee = await this.requireEmployee(user, businessId);
    const msg = await this.prisma.chatMessage.findFirst({ where: { id: messageId, thread: { businessId } } });
    if (!msg) throw new NotFoundException('Message not found');
    await this.requireThreadAccess(user, businessId, msg.threadId);

    const cleaned = String(emoji || '').trim();
    if (!cleaned) throw new BadRequestException('Emoji is required');

    await this.prisma.chatReaction.upsert({
      where: { messageId_employeeId_emoji: { messageId, employeeId: employee.id, emoji: cleaned } },
      update: {},
      create: { messageId, employeeId: employee.id, emoji: cleaned },
    });
    return { ok: true };
  }

  async removeReaction(user: any, businessIdHeader: string | undefined, messageId: string, emoji?: string) {
    const businessId = await this.getBusinessId(user, businessIdHeader);
    const employee = await this.requireEmployee(user, businessId);
    const msg = await this.prisma.chatMessage.findFirst({ where: { id: messageId, thread: { businessId } } });
    if (!msg) throw new NotFoundException('Message not found');
    await this.requireThreadAccess(user, businessId, msg.threadId);

    const cleaned = String(emoji || '').trim();
    if (!cleaned) throw new BadRequestException('Emoji is required');

    await this.prisma.chatReaction.deleteMany({ where: { messageId, employeeId: employee.id, emoji: cleaned } });
    return { ok: true };
  }
}
