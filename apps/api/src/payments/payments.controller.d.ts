import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    create(req: any, createPaymentDto: CreatePaymentDto, headerBusinessId?: string): Promise<{
        id: string;
        businessId: string;
        status: string;
        type: string;
        createdAt: Date;
        updatedAt: Date;
        amount: number;
        method: string | null;
        description: string | null;
        date: Date;
        category: string | null;
        notes: string | null;
        payeeName: string | null;
        reference: string | null;
        dcWard: string | null;
    }>;
    findAll(req: any, headerBusinessId?: string): Promise<{
        id: string;
        businessId: string;
        status: string;
        type: string;
        createdAt: Date;
        updatedAt: Date;
        amount: number;
        method: string | null;
        description: string | null;
        date: Date;
        category: string | null;
        notes: string | null;
        payeeName: string | null;
        reference: string | null;
        dcWard: string | null;
    }[]>;
    findOne(id: string, req: any, headerBusinessId?: string): Promise<{
        id: string;
        businessId: string;
        status: string;
        type: string;
        createdAt: Date;
        updatedAt: Date;
        amount: number;
        method: string | null;
        description: string | null;
        date: Date;
        category: string | null;
        notes: string | null;
        payeeName: string | null;
        reference: string | null;
        dcWard: string | null;
    }>;
}
