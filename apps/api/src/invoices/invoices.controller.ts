import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  UsePipes,
  ValidationPipe,
  Headers,
  Query,
  Res,
} from "@nestjs/common";
import { InvoicesService } from "./invoices.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "@unitedlinkgroup/types";
import { UpdateInvoiceDto } from "./dto/update-invoice.dto";
import { RecordPaymentDto, VoidPaymentDto } from "./dto/record-payment.dto";
import { generateInvoicePdf } from "./invoice-pdf";
import { CreateInvoiceDto } from "./dto/create-invoice.dto";

@Controller("invoices")
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  // --- Clients ---

  @Post("clients")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_ADMIN,
    UserRole.MANAGER,
  )
  createClient(
    @Request() req: any,
    @Body()
    createClientDto: {
      name: string;
      email?: string;
      phone?: string;
      address?: string;
    },
    @Headers("x-business-id") headerBusinessId?: string,
  ) {
    return this.invoicesService.createClient(
      createClientDto,
      req.user,
      headerBusinessId,
    );
  }

  @Get("clients")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_ADMIN,
    UserRole.MANAGER,
  )
  findAllClients(
    @Request() req: any,
    @Headers("x-business-id") headerBusinessId?: string,
  ) {
    return this.invoicesService.findAllClients(req.user, headerBusinessId);
  }

  // --- Invoices ---

  @Post()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_ADMIN,
    UserRole.MANAGER,
  )
  @UsePipes(new ValidationPipe({ whitelist: true }))
  createInvoice(
    @Request() req: any,
    @Body() createInvoiceDto: CreateInvoiceDto,
    @Headers("x-business-id") headerBusinessId?: string,
  ) {
    return this.invoicesService.createInvoice(
      createInvoiceDto,
      req.user,
      headerBusinessId,
    );
  }

  @Patch(":id")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_ADMIN,
    UserRole.MANAGER,
  )
  @UsePipes(new ValidationPipe({ whitelist: true }))
  updateInvoice(
    @Request() req: any,
    @Param("id") id: string,
    @Body() updateData: UpdateInvoiceDto,
    @Headers("x-business-id") header?: string,
  ) {
    return this.invoicesService.updateInvoice(id, updateData, req.user, header);
  }

  @Post(":id/send")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_ADMIN,
    UserRole.MANAGER,
  )
  sendInvoice(
    @Request() req: any,
    @Param("id") id: string,
    @Headers("x-business-id") header?: string,
  ) {
    return this.invoicesService.sendInvoice(id, req.user, header);
  }

  @Get("email-config")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_ADMIN,
    UserRole.MANAGER,
  )
  getInvoiceEmailConfig() {
    const host = process.env.INVOICE_SMTP_HOST || "";
    const port = process.env.INVOICE_SMTP_PORT || "";
    const secure = process.env.INVOICE_SMTP_SECURE || "";
    const user = process.env.INVOICE_SMTP_USER || "";
    const pass = process.env.INVOICE_SMTP_PASS || "";
    const from = process.env.INVOICE_FROM || "";
    const replyTo = process.env.INVOICE_REPLY_TO || "";
    const cc = process.env.INVOICE_CC || "";

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
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_ADMIN,
    UserRole.MANAGER,
  )
  findAllInvoices(
    @Request() req: any,
    @Headers("x-business-id") headerBusinessId?: string,
  ) {
    return this.invoicesService.findAllInvoices(req.user, headerBusinessId);
  }

  @Get("tax-context")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_ADMIN,
    UserRole.MANAGER,
  )
  taxContext(
    @Request() req: any,
    @Headers("x-business-id") header?: string,
    @Query("clientId") clientId?: string,
    @Query("locationId") locationId?: string,
  ) {
    return this.invoicesService.taxContext(
      req.user,
      header,
      clientId,
      locationId,
    );
  }

  @Post(":id/payments")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_ADMIN,
    UserRole.MANAGER,
  )
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  recordPayment(
    @Request() req: any,
    @Param("id") id: string,
    @Body() data: RecordPaymentDto,
    @Headers("x-business-id") header?: string,
  ) {
    return this.invoicesService.recordPayment(id, data, req.user, header);
  }

  @Post(":id/payments/:paymentId/reverse")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_ADMIN,
    UserRole.MANAGER,
  )
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  reversePayment(
    @Request() req: any,
    @Param("id") id: string,
    @Param("paymentId") paymentId: string,
    @Body() data: VoidPaymentDto,
    @Headers("x-business-id") header?: string,
  ) {
    return this.invoicesService.voidPayment(
      id,
      paymentId,
      data,
      req.user,
      header,
    );
  }

  @Get(":id/pdf")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_ADMIN,
    UserRole.MANAGER,
  )
  async downloadPdf(
    @Request() req: any,
    @Param("id") id: string,
    @Headers("x-business-id") header: string | undefined,
    @Res() res: any,
  ) {
    const invoice = await this.invoicesService.findOneInvoice(
      id,
      req.user,
      header,
    );
    const business = await this.invoicesService.invoiceBusiness(
      id,
      req.user,
      header,
    );
    const pdf = await generateInvoicePdf({ business, invoice });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="invoice-${id}.pdf"`,
    );
    res.send(pdf);
  }

  @Get("client/:clientId")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_ADMIN,
    UserRole.MANAGER,
  )
  findAllByClient(
    @Param("clientId") clientId: string,
    @Request() req: any,
    @Headers("x-business-id") header?: string,
  ) {
    return this.invoicesService.findAllByClient(clientId, req.user, header);
  }

  @Get(":id")
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.BUSINESS_ADMIN,
    UserRole.MANAGER,
  )
  findOneInvoice(
    @Param("id") id: string,
    @Request() req: any,
    @Headers("x-business-id") header?: string,
  ) {
    return this.invoicesService.findOneInvoice(id, req.user, header);
  }
}
