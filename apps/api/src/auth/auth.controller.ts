import { Controller, Request, Post, UseGuards, Body, Get, UnauthorizedException, BadRequestException, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { UserRole } from '@unitedlinkgroup/types';

const VENDOR_ROLE = 'VENDOR';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (user) {
      return this.authService.login(user);
    }

    const count = await this.authService.getUserCount();
    if (count === 0) {
      throw new UnauthorizedException('No users exist. Bootstrap an admin account first.');
    }
    throw new UnauthorizedException('Invalid credentials');
  }

  @Post('vendor-login')
  async vendorLogin(@Body() body: LoginDto & { portalSlug?: string }) {
    const user = await this.authService.validateVendorUser(body.email, body.password, body.portalSlug);
    if (!user) throw new UnauthorizedException('Invalid vendor credentials');
    return this.authService.login(user);
  }
  
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('bootstrap')
  async bootstrap(@Body() registerDto: RegisterDto) {
    try {
      return await this.authService.bootstrap(registerDto);
    } catch (e: any) {
      const message = e?.response?.message || e?.message || 'Bootstrap failed';
      throw new BadRequestException(message);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async getProfile(@Request() req: any, @Headers('x-business-id') businessId?: string) {
    const user = req.user;
    // Enhance user profile with employee details if available
    if (user.userId) {
       // We use dynamic import or inject service ideally, but for now we can rely on what we have or just return what's in token.
       // However, to get employeeId, we need to query db.
       // Ideally we should inject UsersService or similar.
       // Let's rely on AuthService to do this or just return basic info and let frontend fetch /my-profile?
       // Better: inject PrismaService into AuthController (or use AuthService)
    }
    return this.authService.getEnhancedProfile(user, businessId);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(VENDOR_ROLE as any)
  @Get('vendor-profile')
  async getVendorProfile(@Request() req: any) {
    return this.authService.getVendorProfile(req.user);
  }
}
