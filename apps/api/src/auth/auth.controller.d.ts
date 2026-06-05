import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(loginDto: LoginDto): Promise<{
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
    vendorLogin(body: LoginDto & {
        portalSlug?: string;
    }): Promise<{
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
    getProfile(req: any, businessId?: string): Promise<any>;
    getVendorProfile(req: any): Promise<{
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
}
