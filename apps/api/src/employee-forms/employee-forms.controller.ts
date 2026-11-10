import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "@unitedlinkgroup/types";
import { EmployeeFormsService } from "./employee-forms.service";
import { CreateEmployeeFormTemplateDto } from "./dto/create-employee-form-template.dto";
import { UpdateEmployeeFormTemplateDto } from "./dto/update-employee-form-template.dto";
import { AssignEmployeeFormTemplateDto } from "./dto/assign-employee-form-template.dto";
import { SubmitEmployeeFormAssignmentDto } from "./dto/submit-employee-form-assignment.dto";
import type { Response } from "express";
import { EmailEmploymentLetterDto, EmploymentLetterDto, OpenEmploymentLetterDto } from "./dto/employment-letter.dto";

@Controller("employee-forms")
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmployeeFormsController {
  constructor(private readonly employeeFormsService: EmployeeFormsService) {}

  @Post("letters/draft")
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  openLetterDraft(@Request() req: any, @Body() dto: OpenEmploymentLetterDto,
    @Headers("x-business-id") businessId?: string) {
    return this.employeeFormsService.saveAppointmentDraft(req.user, dto.employeeId, undefined, businessId);
  }

  @Patch("letters/draft")
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  saveLetterDraft(@Request() req: any, @Body() dto: EmploymentLetterDto,
    @Headers("x-business-id") businessId?: string) {
    return this.employeeFormsService.saveAppointmentDraft(req.user, dto.employeeId, dto, businessId);
  }

  @Post("letters/pdf")
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  async downloadLetter(@Request() req: any, @Body() dto: EmploymentLetterDto,
    @Headers("x-business-id") businessId: string | undefined, @Res() res: Response) {
    const { data, filename } = await this.employeeFormsService.downloadEmploymentLetter(req.user, dto, businessId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).send(data);
  }

  @Post("letters/email")
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.SUPER_ADMIN)
  emailLetter(@Request() req: any, @Body() dto: EmailEmploymentLetterDto,
    @Headers("x-business-id") businessId?: string) {
    return this.employeeFormsService.emailEmploymentLetter(req.user, dto, businessId);
  }

  @Get("templates")
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  listTemplates(
    @Request() req: any,
    @Headers("x-business-id") businessId?: string,
    @Query() query?: any,
  ) {
    return this.employeeFormsService.listTemplates(req.user, businessId, query);
  }

  @Post("templates")
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  createTemplate(
    @Request() req: any,
    @Body() dto: CreateEmployeeFormTemplateDto,
    @Headers("x-business-id") businessId?: string,
  ) {
    return this.employeeFormsService.createTemplate(req.user, dto, businessId);
  }

  @Patch("templates/:id")
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  updateTemplate(
    @Request() req: any,
    @Param("id") id: string,
    @Body() dto: UpdateEmployeeFormTemplateDto,
  ) {
    return this.employeeFormsService.updateTemplate(req.user, id, dto);
  }

  @Delete("templates/:id")
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  archiveTemplate(@Request() req: any, @Param("id") id: string) {
    return this.employeeFormsService.archiveTemplate(req.user, id);
  }

  @Post("templates/:id/assign")
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  assignTemplate(
    @Request() req: any,
    @Param("id") id: string,
    @Body() dto: AssignEmployeeFormTemplateDto,
    @Headers("x-business-id") businessId?: string,
  ) {
    return this.employeeFormsService.assignTemplate(
      req.user,
      id,
      dto,
      businessId,
    );
  }

  @Get("assignments")
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  listAssignments(
    @Request() req: any,
    @Headers("x-business-id") businessId?: string,
    @Query() query?: any,
  ) {
    return this.employeeFormsService.listAssignmentsAdmin(
      req.user,
      businessId,
      query,
    );
  }

  @Get("assignments/:id")
  @Roles(UserRole.BUSINESS_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  adminGetAssignment(@Request() req: any, @Param("id") id: string) {
    return this.employeeFormsService.adminGetAssignment(req.user, id);
  }

  @Get("my-assignments")
  myAssignments(@Request() req: any, @Query() query?: any) {
    return this.employeeFormsService.listMyAssignments(req.user, query);
  }

  @Get("my-sops")
  mySops(@Request() req: any) {
    return this.employeeFormsService.mySops(req.user);
  }

  @Get("my-assignments/:id")
  myAssignment(@Request() req: any, @Param("id") id: string) {
    return this.employeeFormsService.getMyAssignment(req.user, id);
  }

  @Post("my-assignments/:id/submit")
  mySubmit(
    @Request() req: any,
    @Param("id") id: string,
    @Body() dto: SubmitEmployeeFormAssignmentDto,
  ) {
    return this.employeeFormsService.submitMyAssignment(req.user, id, dto);
  }
}
