export type Gender = 'Men' | 'Women' | 'Kids' | 'Unisex';
export type Occasion = 'Casual' | 'Formal' | 'Party' | 'Work' | 'Sports';
export type ProductStatus = 'Draft' | 'Published' | 'Archived';
export type StockStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';
export interface ProductImage {
    id: string;
    url: string;
    alt: string;
    isPrimary: boolean;
    colorCode?: string;
}
export interface ProductVariant {
    id: string;
    sku: string;
    size: string;
    color: string;
    colorCode: string;
    price: number;
    salePrice?: number;
    costPrice?: number;
    stockQuantity: number;
    stockStatus: StockStatus;
    images: string[];
}
export type StockAdjustmentReason = 'Purchase' | 'Sale' | 'Return' | 'Damage' | 'Theft' | 'Correction' | 'Transfer';
export interface StockLog {
    id: string;
    productId: string;
    variantId: string;
    previousQuantity: number;
    newQuantity: number;
    changeAmount: number;
    reason: StockAdjustmentReason;
    note?: string;
    userId: string;
    userName: string;
    timestamp: Date;
}
export type DesignStatus = 'Concept' | 'Sampling' | 'Approved' | 'In Production' | 'Completed';
export type DesignPriority = 'High' | 'Medium' | 'Low';
export type DesignStageType = 'Concept' | 'Fabric Sourcing' | 'Pattern Making' | 'Sampling' | 'Approvals';
export interface DesignStage {
    id: string;
    name: DesignStageType;
    status: 'Pending' | 'In Progress' | 'Completed' | 'Blocked';
    assignedTo?: string;
    notes?: string;
    files: string[];
    completedAt?: Date;
    updatedAt: Date;
}
export interface DesignMaterial {
    id: string;
    name: string;
    type: 'Fabric' | 'Trim' | 'Packaging';
    supplierId: string;
    costPerUnit: number;
    unit: string;
    leadTime: number;
    moq: number;
    status: 'Pending' | 'Approved' | 'Rejected';
    imageUrl?: string;
}
export interface Supplier {
    id: string;
    name: string;
    contactName: string;
    email: string;
    phone: string;
    location: string;
    materials: string[];
}
export interface TechPackMeasurement {
    id: string;
    pointOfMeasure: string;
    tolerance: number;
    values: Record<string, number>;
}
export interface BOMItem {
    id: string;
    materialId: string;
    placement: string;
    consumption: number;
    wastage: number;
    cost: number;
}
export interface TechPack {
    id: string;
    designId: string;
    version: number;
    sketches: {
        front: string;
        back: string;
        detail: string[];
    };
    measurements: TechPackMeasurement[];
    bom: BOMItem[];
    constructionDetails: string;
    stitchingSpecs: string;
    colorways: {
        name: string;
        pantone: string;
    }[];
    labels: string;
    packaging: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Costing {
    materialCost: number;
    laborCost: number;
    overheadCost: number;
    sampleCost: number;
    targetCost: number;
    actualCost: number;
    margin: number;
    currency: string;
}
export interface ProductionStage {
    name: 'Cutting' | 'Sewing' | 'Finishing' | 'QC';
    status: 'Pending' | 'In Progress' | 'Completed';
    startDate?: Date;
    endDate?: Date;
    progress: number;
}
export interface ProductionRun {
    id: string;
    designId: string;
    factoryName: string;
    quantity: number;
    startDate: Date;
    targetEndDate: Date;
    actualEndDate?: Date;
    stages: ProductionStage[];
    status: 'Planned' | 'In Progress' | 'Completed' | 'Delayed';
    notes?: string;
}
export interface DesignProject {
    id: string;
    name: string;
    season: string;
    category: Gender;
    productType: string;
    targetMarket: string;
    designer: string;
    status: DesignStatus;
    priority: DesignPriority;
    targetLaunchDate: Date;
    thumbnailUrl?: string;
    stages: DesignStage[];
    techPack?: TechPack;
    costing?: Costing;
    production?: ProductionRun;
    createdAt: Date;
    updatedAt: Date;
}
export interface Product {
    id: string;
    name: string;
    slug: string;
    sku: string;
    description: string;
    shortDescription: string;
    category: Gender;
    productType: string;
    brand: string;
    collections: string[];
    occasions: Occasion[];
    tags: string[];
    materials: {
        name: string;
        percentage: number;
    }[];
    countryOfOrigin: string;
    careInstructions: string[];
    sustainabilityTags: string[];
    fitType: 'Slim' | 'Regular' | 'Oversized' | 'Loose';
    images: ProductImage[];
    videoUrl?: string;
    variants: ProductVariant[];
    basePrice: number;
    status: ProductStatus;
    createdAt: string;
    updatedAt: string;
    metaTitle?: string;
    metaDescription?: string;
    rating?: number;
    reviewCount?: number;
}
export interface Customer {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone: string;
    gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
    dateOfBirth?: string;
    address?: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
    };
    preferredContact?: 'Email' | 'SMS' | 'None';
    notes?: string;
    tags?: string[];
    totalSpent: number;
    createdAt: Date;
}
export interface Transaction {
    id: string;
    date: Date;
    cashierName: string;
    customerId?: string;
    customerName?: string;
    items: {
        productId: string;
        productName: string;
        variantId: string;
        sku: string;
        size: string;
        color: string;
        quantity: number;
        price: number;
        returned?: boolean;
        returnReason?: string;
    }[];
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod: 'Cash' | 'Card' | 'Mobile' | 'Split';
    status: 'Completed' | 'Refunded' | 'Partially Refunded';
}
