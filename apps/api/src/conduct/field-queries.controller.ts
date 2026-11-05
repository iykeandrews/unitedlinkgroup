import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { FieldQueriesService } from "./field-queries.service";
class IssueFieldQueryDto {
  @IsString() @Matches(/^[-a-zA-Z0-9]{16,80}$/) submissionId!: string;
  @IsString() employeeId!: string;
  @IsOptional() @IsString() locationId?: string;
  @IsString() @MinLength(3) @MaxLength(200) title!: string;
  @IsString() @MinLength(10) @MaxLength(20000) description!: string;
  @IsString() @MinLength(2) @MaxLength(80) category!: string;
  @IsOptional() @IsIn(["LOW", "MEDIUM", "HIGH", "URGENT"]) priority?: string;
  @IsDateString() dueAt!: string;
}
@Controller("conduct/mobile")
@UseGuards(JwtAuthGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class FieldQueriesController {
  constructor(private service: FieldQueriesService) {}
  @Get("options") options(
    @Request() req: any,
    @Headers("x-business-id") header?: string,
  ) {
    return this.service.options(req.user, header);
  }
  @Get("queries") list(
    @Request() req: any,
    @Headers("x-business-id") header?: string,
    @Query("page") page?: number,
  ) {
    return this.service.list(req.user, header, page);
  }
  @Get("queries/:id") detail(
    @Param("id") id: string,
    @Request() req: any,
    @Headers("x-business-id") header?: string,
  ) {
    return this.service.detail(id, req.user, header);
  }
  @Post("queries") create(
    @Body() body: IssueFieldQueryDto,
    @Request() req: any,
    @Headers("x-business-id") header?: string,
  ) {
    return this.service.createAndIssue(body, req.user, header);
  }
  @Post("queries/:id/issue") issue(
    @Param("id") id: string,
    @Request() req: any,
    @Headers("x-business-id") header?: string,
  ) {
    return this.service.issue(id, req.user, header);
  }
}
