"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const helmet_1 = __importDefault(require("helmet"));
const common_1 = require("@nestjs/common");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    // Security Hardening: Helmet
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));
    // Security Hardening: Validation
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    // Trust proxy to get correct IP address
    const adapter = app.getHttpAdapter();
    if (adapter && adapter.getInstance && typeof adapter.getInstance === 'function') {
        const instance = adapter.getInstance();
        if (instance.set) {
            instance.set('trust proxy', 1);
        }
    }
    // Security Hardening: Strict CORS
    const defaultFrontend = process.env.FRONTEND_URL || 'http://localhost:3000';
    app.enableCors({
        origin: (origin, cb) => {
            if (!origin)
                return cb(null, true);
            if (origin === defaultFrontend || origin === 'http://localhost:3000') {
                return cb(null, true);
            }
            if (/^http:\/\/\d{1,3}(\.\d{1,3}){3}:3000$/.test(origin)) {
                return cb(null, true);
            }
            if (process.env.NODE_ENV !== 'production') {
                return cb(null, true);
            }
            return cb(new Error('Not allowed by CORS'), false);
        },
        credentials: true,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        preflightContinue: false,
        optionsSuccessStatus: 204,
    });
    const port = Number(process.env.API_PORT || 3002);
    await app.listen(port, '0.0.0.0');
    console.log(`Application is running on: http://0.0.0.0:${port}`);
}
bootstrap();
