
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'supersecretkey',
    });
  }

  async validate(payload: any) {
    const userId = payload.sub;
    const [user, employee] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.employee.findFirst({
        where: {
          userId,
          ...(payload.businessId ? { businessId: payload.businessId } : {}),
        },
        select: { id: true, role: true, businessId: true },
      }),
    ]);
    if (!user) {
      throw new UnauthorizedException('Invalid session. Please log in again.');
    }
    return {
      userId: user.id,
      email: user.email,
      role: payload.role || user.role,
      businessId: payload.businessId || employee?.businessId,
      employeeId: employee?.id,
      employeeRole: employee?.role || null,
    };
  }
}
