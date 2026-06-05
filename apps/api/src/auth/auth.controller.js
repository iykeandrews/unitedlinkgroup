"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const roles_guard_1 = require("./roles.guard");
const roles_decorator_1 = require("./roles.decorator");
const types_1 = require("@unitedlinkgroup/types");
const VENDOR_ROLE = 'VENDOR';
let AuthController = (() => {
    let _classDecorators = [(0, common_1.Controller)('auth')];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _instanceExtraInitializers = [];
    let _login_decorators;
    let _vendorLogin_decorators;
    let _register_decorators;
    let _bootstrap_decorators;
    let _getProfile_decorators;
    let _getVendorProfile_decorators;
    var AuthController = _classThis = class {
        constructor(authService) {
            this.authService = (__runInitializers(this, _instanceExtraInitializers), authService);
        }
        async login(loginDto) {
            const user = await this.authService.validateUser(loginDto.email, loginDto.password);
            if (user) {
                return this.authService.login(user);
            }
            if (process.env.ALLOW_DEV_LOGIN === 'true') {
                return this.authService.devLogin(loginDto.email);
            }
            const count = await this.authService.getUserCount();
            if (count === 0) {
                throw new common_1.UnauthorizedException('No users exist. Bootstrap an admin account first.');
            }
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        async vendorLogin(body) {
            const user = await this.authService.validateVendorUser(body.email, body.password, body.portalSlug);
            if (!user)
                throw new common_1.UnauthorizedException('Invalid vendor credentials');
            return this.authService.login(user);
        }
        async register(registerDto) {
            return this.authService.register(registerDto);
        }
        async bootstrap(registerDto) {
            var _a;
            try {
                return await this.authService.bootstrap(registerDto);
            }
            catch (e) {
                const message = ((_a = e === null || e === void 0 ? void 0 : e.response) === null || _a === void 0 ? void 0 : _a.message) || (e === null || e === void 0 ? void 0 : e.message) || 'Bootstrap failed';
                throw new common_1.BadRequestException(message);
            }
        }
        async getProfile(req, businessId) {
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
        async getVendorProfile(req) {
            return this.authService.getVendorProfile(req.user);
        }
    };
    __setFunctionName(_classThis, "AuthController");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _login_decorators = [(0, common_1.Post)('login')];
        _vendorLogin_decorators = [(0, common_1.Post)('vendor-login')];
        _register_decorators = [(0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(types_1.UserRole.SUPER_ADMIN), (0, common_1.Post)('register')];
        _bootstrap_decorators = [(0, common_1.Post)('bootstrap')];
        _getProfile_decorators = [(0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')), (0, common_1.Get)('profile')];
        _getVendorProfile_decorators = [(0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)(VENDOR_ROLE), (0, common_1.Get)('vendor-profile')];
        __esDecorate(_classThis, null, _login_decorators, { kind: "method", name: "login", static: false, private: false, access: { has: obj => "login" in obj, get: obj => obj.login }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _vendorLogin_decorators, { kind: "method", name: "vendorLogin", static: false, private: false, access: { has: obj => "vendorLogin" in obj, get: obj => obj.vendorLogin }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _register_decorators, { kind: "method", name: "register", static: false, private: false, access: { has: obj => "register" in obj, get: obj => obj.register }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _bootstrap_decorators, { kind: "method", name: "bootstrap", static: false, private: false, access: { has: obj => "bootstrap" in obj, get: obj => obj.bootstrap }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getProfile_decorators, { kind: "method", name: "getProfile", static: false, private: false, access: { has: obj => "getProfile" in obj, get: obj => obj.getProfile }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getVendorProfile_decorators, { kind: "method", name: "getVendorProfile", static: false, private: false, access: { has: obj => "getVendorProfile" in obj, get: obj => obj.getVendorProfile }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AuthController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AuthController = _classThis;
})();
exports.AuthController = AuthController;
