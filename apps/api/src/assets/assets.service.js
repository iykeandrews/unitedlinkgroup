"use strict";
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
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetsService = void 0;
const common_1 = require("@nestjs/common");
let AssetsService = (() => {
    let _classDecorators = [(0, common_1.Injectable)()];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    var AssetsService = _classThis = class {
        constructor(prisma) {
            this.prisma = prisma;
        }
        async validateBusinessAccess(targetBusinessId, user) {
            if (user.role === 'SUPER_ADMIN')
                return;
            // Check if user owns the business
            const ownedBusiness = await this.prisma.business.findFirst({ where: { ownerId: user.userId || user.sub || user.id } });
            if (ownedBusiness && ownedBusiness.id === targetBusinessId)
                return;
            // Check if user is an employee of the business
            const employee = await this.prisma.employee.findFirst({
                where: { userId: user.userId || user.sub || user.id, businessId: targetBusinessId }
            });
            if (employee)
                return;
            throw new common_1.BadRequestException('Access denied: You do not have access to this business data');
        }
        async getBusinessId(user) {
            const userId = user.userId || user.sub || user.id;
            const employee = await this.prisma.employee.findFirst({ where: { userId } });
            if (employee)
                return employee.businessId;
            const business = await this.prisma.business.findFirst({ where: { ownerId: userId } });
            if (business)
                return business.id;
            throw new common_1.BadRequestException('User is not associated with a business');
        }
        async create(data, user, businessIdHeader) {
            try {
                let businessId = businessIdHeader;
                if (!businessId || user.role !== 'SUPER_ADMIN') {
                    businessId = await this.getBusinessId(user);
                }
                if (user.role === 'SUPER_ADMIN' && !businessId) {
                    throw new common_1.BadRequestException('Business context required for Super Admin');
                }
                await this.validateBusinessAccess(businessId, user);
                return await this.prisma.asset.create({
                    data: {
                        ...data,
                        businessId,
                    },
                });
            }
            catch (error) {
                console.error('Error in AssetsService.create:', error);
                throw error;
            }
        }
        async findAll(user, businessIdHeader) {
            try {
                let businessId = businessIdHeader;
                if (!businessId || user.role !== 'SUPER_ADMIN') {
                    try {
                        businessId = await this.getBusinessId(user);
                    }
                    catch (e) {
                        if (user.role === 'SUPER_ADMIN')
                            return [];
                        throw e;
                    }
                }
                if (businessId) {
                    await this.validateBusinessAccess(businessId, user);
                    return await this.prisma.asset.findMany({
                        where: {
                            businessId,
                            parentId: null, // Only show main assets or parents, not split assignments
                        },
                        include: {
                            location: true,
                            assignedTo: true,
                        },
                        orderBy: { createdAt: 'desc' }
                    });
                }
                return [];
            }
            catch (error) {
                console.error('Error in AssetsService.findAll:', error);
                throw error;
            }
        }
        async findOne(id, user) {
            const asset = await this.prisma.asset.findUnique({
                where: { id },
                include: {
                    location: true,
                    assignedTo: true,
                    children: {
                        include: { assignedTo: true }
                    }
                }
            });
            if (!asset)
                throw new common_1.NotFoundException('Asset not found');
            await this.validateBusinessAccess(asset.businessId, user);
            return asset;
        }
        async update(id, data, user) {
            const asset = await this.prisma.asset.findUnique({ where: { id } });
            if (!asset)
                throw new common_1.NotFoundException('Asset not found');
            await this.validateBusinessAccess(asset.businessId, user);
            return this.prisma.asset.update({
                where: { id },
                data,
            });
        }
        async assign(id, data, user) {
            const asset = await this.prisma.asset.findUnique({ where: { id } });
            if (!asset)
                throw new common_1.NotFoundException('Asset not found');
            await this.validateBusinessAccess(asset.businessId, user);
            const quantityToAssign = data.quantity || 1;
            if (quantityToAssign > asset.quantity) {
                throw new common_1.BadRequestException('Insufficient quantity available');
            }
            let assignedAssetId = id;
            // If assigning the entire quantity, just update the asset
            if (quantityToAssign === asset.quantity) {
                await this.prisma.asset.update({
                    where: { id },
                    data: {
                        assignedToId: data.assignedToId,
                        assignedDate: data.assignedDate,
                        expectedReturnDate: data.expectedReturnDate,
                        notes: data.notes,
                        status: 'ASSIGNED',
                    },
                });
            }
            else {
                // Otherwise, split the asset
                // 1. Decrement the original asset
                await this.prisma.asset.update({
                    where: { id },
                    data: {
                        quantity: asset.quantity - quantityToAssign,
                    },
                });
                // 2. Create a new asset for the assignment
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { id: _, createdAt, updatedAt, assignmentHistory, children, parent, ...assetData } = asset;
                const newAsset = await this.prisma.asset.create({
                    data: {
                        ...assetData,
                        quantity: quantityToAssign,
                        assignedToId: data.assignedToId,
                        assignedDate: data.assignedDate,
                        expectedReturnDate: data.expectedReturnDate,
                        notes: data.notes,
                        status: 'ASSIGNED',
                        businessId: asset.businessId, // Explicitly set, though included in assetData
                        parentId: id, // Link back to parent
                    },
                });
                assignedAssetId = newAsset.id;
            }
            // Create assignment history record
            await this.prisma.assetAssignmentHistory.create({
                data: {
                    assetId: assignedAssetId,
                    employeeId: data.assignedToId,
                    assignedDate: data.assignedDate ? new Date(data.assignedDate) : new Date(),
                    notes: data.notes,
                },
            });
            return this.prisma.asset.findUnique({ where: { id: assignedAssetId } });
        }
        async returnAsset(id, data, user) {
            const asset = await this.prisma.asset.findUnique({
                where: { id },
                include: { assignedTo: true }
            });
            if (!asset)
                throw new common_1.NotFoundException('Asset not found');
            if (!asset.assignedToId)
                throw new common_1.BadRequestException('Asset is not currently assigned');
            await this.validateBusinessAccess(asset.businessId, user);
            // Update the history record
            const history = await this.prisma.assetAssignmentHistory.findFirst({
                where: {
                    assetId: id,
                    employeeId: asset.assignedToId,
                    returnedDate: null,
                },
                orderBy: { assignedDate: 'desc' },
            });
            if (history) {
                await this.prisma.assetAssignmentHistory.update({
                    where: { id: history.id },
                    data: {
                        returnedDate: new Date(data.returnDate),
                        returnCondition: data.condition,
                        notes: data.notes ? (history.notes ? `${history.notes}\nReturn Notes: ${data.notes}` : data.notes) : history.notes,
                    },
                });
            }
            else {
                console.warn(`No open assignment history found for asset ${id} return`);
            }
            // Handle Asset State (Merge if child, or Update if standalone)
            if (asset.parentId) {
                // It's a split asset. Merge back to parent.
                // 1. Update Parent Quantity
                await this.prisma.asset.update({
                    where: { id: asset.parentId },
                    data: {
                        quantity: { increment: asset.quantity },
                    },
                });
                // 2. We need to preserve history. 
                // The history is linked to `assetId`. If we delete `asset`, history is gone (Cascade).
                // We must re-link history to the Parent Asset.
                // NOTE: This assumes history records are compatible.
                await this.prisma.assetAssignmentHistory.updateMany({
                    where: { assetId: id },
                    data: { assetId: asset.parentId },
                });
                // 3. Delete the child asset
                // This will now be safe regarding history, as history has moved.
                return this.prisma.asset.delete({
                    where: { id },
                });
            }
            else {
                // It's a standalone asset (or parent itself). Just update status.
                return this.prisma.asset.update({
                    where: { id },
                    data: {
                        assignedToId: null,
                        assignedDate: null,
                        expectedReturnDate: null,
                        status: 'ACTIVE',
                        condition: data.condition,
                        notes: data.notes,
                    },
                });
            }
        }
        async getAssignmentHistory(id, user) {
            const asset = await this.prisma.asset.findUnique({ where: { id } });
            if (!asset)
                throw new common_1.NotFoundException('Asset not found');
            await this.validateBusinessAccess(asset.businessId, user);
            return this.prisma.assetAssignmentHistory.findMany({
                where: { assetId: id },
                include: { employee: true },
                orderBy: { assignedDate: 'desc' },
            });
        }
        async remove(id, user) {
            const asset = await this.prisma.asset.findUnique({ where: { id } });
            if (!asset)
                throw new common_1.NotFoundException('Asset not found');
            await this.validateBusinessAccess(asset.businessId, user);
            return this.prisma.asset.delete({ where: { id } });
        }
    };
    __setFunctionName(_classThis, "AssetsService");
    (() => {
        const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AssetsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AssetsService = _classThis;
})();
exports.AssetsService = AssetsService;
