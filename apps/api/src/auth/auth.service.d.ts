import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { PrismaService } from '../prisma.service';
export declare class AuthService {
    private usersService;
    private jwtService;
    private prisma;
    constructor(usersService: UsersService, jwtService: JwtService, prisma: PrismaService);
    validateUser(email: string, pass: string): Promise<any>;
    validateVendorUser(email: string, pass: string, portalSlug?: string): Promise<any>;
    login(user: any): Promise<{
        access_token: string;
        businessId: string | undefined;
        business: any;
        vendor: {
            id: any;
            companyName: any;
            portalSlug: any;
            status: any;
        } | undefined;
    }>;
    getEnhancedProfile(user: any, businessId?: string): Promise<any>;
    getVendorProfile(user: any): Promise<{
        userId: any;
        role: string;
        vendorId: any;
        businessId: any;
        portalSlug: any;
        companyName: any;
        email: any;
        status: any;
        business: any;
    }>;
    register(registerDto: RegisterDto): Promise<any>;
    bootstrap(registerDto: RegisterDto): Promise<{
        access_token: string;
        businessId: string | undefined;
        business: any;
        vendor: {
            id: any;
            companyName: any;
            portalSlug: any;
            status: any;
        } | undefined;
    }>;
    getUserCount(): Promise<number>;
}
