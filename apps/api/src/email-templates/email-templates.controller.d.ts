import { EmailTemplatesService } from './email-templates.service';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
export declare class EmailTemplatesController {
    private readonly emailTemplatesService;
    constructor(emailTemplatesService: EmailTemplatesService);
    create(req: any, createEmailTemplateDto: CreateEmailTemplateDto): Promise<{
        id: string;
        businessId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        content: string;
        subject: string;
        createdBy: string;
    }>;
    findAll(req: any): Promise<{
        id: string;
        businessId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        content: string;
        subject: string;
        createdBy: string;
    }[]>;
    findOne(id: string, req: any): Promise<{
        id: string;
        businessId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        content: string;
        subject: string;
        createdBy: string;
    } | null>;
    update(req: any, id: string, updateEmailTemplateDto: CreateEmailTemplateDto): Promise<{
        id: string;
        businessId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        content: string;
        subject: string;
        createdBy: string;
    }>;
    remove(req: any, id: string): Promise<{
        id: string;
        businessId: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        content: string;
        subject: string;
        createdBy: string;
    }>;
}
