import { UserRole } from '@unitedlinkgroup/types';
export declare class RegisterDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    businessName: string;
    role?: UserRole;
}
