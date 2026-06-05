export declare class CreateLeaveRequestDto {
    employeeId: string;
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    isAllDay?: boolean;
    startTime?: string;
    endTime?: string;
    totalHours?: number;
    reason?: string;
}
