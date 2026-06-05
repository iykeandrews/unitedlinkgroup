import { PrismaService } from '../prisma.service';
import { User, Prisma } from '@unitedlinkgroup/database';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findOne(email: string): Promise<User | null>;
    create(data: Prisma.UserCreateInput): Promise<User>;
}
