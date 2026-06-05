import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request, UsePipes, ValidationPipe, Headers } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@unitedlinkgroup/types';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  // --- Clients ---

  @Post('clients')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  createClient(@Request() req: any, @Body() createClientDto: { name: string; email?: string; phone?: string; address?: string }, @Headers('x-business-id') headerBusinessId?: string) {
    return this.invoicesService.createClient(createClientDto, req.user, headerBusinessId);
  }

  @Get('clients')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  findAllClients(@Request() req: any, @Headers('x-business-id') headerBusinessId?: string) {
    return this.invoicesService.findAllClients(req.user, headerBusinessId);
  }

  // --- Invoices ---

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  createInvoice(@Request() req: any, @Body() createInvoiceDto: CreateInvoiceDto, @Headers('x-business-id') headerBusinessId?: string) {
    console.log('Create Invoice Payload:', JSON.stringify(createInvoiceDto, null, 2));
    return this.invoicesService.createInvoice(createInvoiceDto, req.user, headerBusinessId);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  updateInvoice(@Request() req: any, @Param('id') id: string, @Body() updateData: Partial<CreateInvoiceDto>) {
    console.log('Update Invoice Payload:', id, JSON.stringify(updateData, null, 2));
    return this.invoicesService.updateInvoice(id, updateData, req.user);
  }

  @Post(':id/send')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  sendInvoice(@Request() req: any, @Param('id') id: string) {
    return this.invoicesService.sendInvoice(id, req.user);
  }

  @Get('email-config')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  getInvoiceEmailConfig() {
    const host = process.env.INVOICE_SMTP_HOST || '';
    const port = process.env.INVOICE_SMTP_PORT || '';
    const secure = process.env.INVOICE_SMTP_SECURE || '';
    const user = process.env.INVOICE_SMTP_USER || '';
    const pass = process.env.INVOICE_SMTP_PASS || '';
    const from = process.env.INVOICE_FROM || '';
    const replyTo = process.env.INVOICE_REPLY_TO || '';
    const cc = process.env.INVOICE_CC || '';

    return {
      configured: !!(host && user && pass && (from || user)),
      smtp: {
        host: host || null,
        port: port || null,
        secure: secure || null,
        userSet: !!user,
        passSet: !!pass,
      },
      mail: {
        from: from || null,
        replyTo: replyTo || null,
        cc: cc || null,
      },
    };
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  findAllInvoices(@Request() req: any, @Headers('x-business-id') headerBusinessId?: string) {
    return this.invoicesService.findAllInvoices(req.user, headerBusinessId);
  }

  @Get('client/:clientId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  findAllByClient(@Param('clientId') clientId: string, @Request() req: any) {
    return this.invoicesService.findAllByClient(clientId, req.user);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.BUSINESS_ADMIN, UserRole.MANAGER)
  findOneInvoice(@Param('id') id: string, @Request() req: any) {
    return this.invoicesService.findOneInvoice(id, req.user);
  }
}
