export declare class CreateAnnouncementDto {
    title: string;
    content: string;
    priority: 'NORMAL' | 'HIGH' | 'URGENT';
    targetType: 'ALL' | 'DEPARTMENT' | 'ROLE';
    targetValue?: string;
    scheduledAt?: Date;
    status: 'DRAFT' | 'PUBLISHED';
}
