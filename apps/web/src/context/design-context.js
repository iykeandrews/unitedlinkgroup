"use strict";
'use client';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DesignProvider = DesignProvider;
exports.useDesign = useDesign;
const react_1 = __importStar(require("react"));
const MOCK_MATERIALS = [
    {
        id: 'm1',
        name: 'Organic Cotton Jersey',
        type: 'Fabric',
        supplierId: 's1',
        costPerUnit: 12.50,
        unit: 'meter',
        leadTime: 14,
        moq: 100,
        status: 'Approved',
    },
    {
        id: 'm2',
        name: 'YKK Zipper #5',
        type: 'Trim',
        supplierId: 's2',
        costPerUnit: 0.85,
        unit: 'piece',
        leadTime: 7,
        moq: 500,
        status: 'Approved',
    }
];
const MOCK_SUPPLIERS = [
    {
        id: 's1',
        name: 'Green Textiles Ltd',
        contactName: 'Sarah Green',
        email: 'sarah@greentextiles.com',
        phone: '+1-555-0123',
        location: 'Portland, OR',
        materials: ['m1'],
    },
    {
        id: 's2',
        name: 'Fast Trims Co',
        contactName: 'Mike Fast',
        email: 'mike@fasttrims.com',
        phone: '+1-555-0124',
        location: 'Los Angeles, CA',
        materials: ['m2'],
    }
];
const MOCK_PROJECTS = [
    {
        id: 'dp1',
        name: 'Summer Breeze Dress',
        season: 'SS25',
        category: 'Women',
        productType: 'Dress',
        targetMarket: 'Young Adult',
        designer: 'Elena Fisher',
        status: 'Sampling',
        priority: 'High',
        targetLaunchDate: new Date('2025-05-15'),
        thumbnailUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
        stages: [
            { id: 'st1', name: 'Concept', status: 'Completed', updatedAt: new Date(), files: [] },
            { id: 'st2', name: 'Fabric Sourcing', status: 'Completed', updatedAt: new Date(), files: [] },
            { id: 'st3', name: 'Pattern Making', status: 'Completed', updatedAt: new Date(), files: [] },
            { id: 'st4', name: 'Sampling', status: 'In Progress', updatedAt: new Date(), files: [] },
            { id: 'st5', name: 'Approvals', status: 'Pending', updatedAt: new Date(), files: [] },
        ],
        techPack: {
            id: 'tp1',
            designId: 'dp1',
            version: 1,
            sketches: { front: '', back: '', detail: [] },
            measurements: [],
            bom: [],
            constructionDetails: 'Double stitch hem',
            stitchingSpecs: 'ISO 401',
            colorways: [{ name: 'Sky Blue', pantone: '14-4122' }],
            labels: 'Main Label, Size Label',
            packaging: 'Polybag',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        costing: {
            materialCost: 15.00,
            laborCost: 12.00,
            overheadCost: 5.00,
            sampleCost: 150.00,
            targetCost: 35.00,
            actualCost: 32.00,
            margin: 45,
            currency: 'USD'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: 'dp2',
        name: 'Urban Cargo Pants',
        season: 'FW24',
        category: 'Men',
        productType: 'Pants',
        targetMarket: 'Adult',
        designer: 'Marcus Chen',
        status: 'In Production',
        priority: 'Medium',
        targetLaunchDate: new Date('2024-09-01'),
        thumbnailUrl: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3',
        stages: [],
        production: {
            id: 'pr1',
            designId: 'dp2',
            factoryName: 'Blue Denim Mfg',
            quantity: 500,
            startDate: new Date('2024-06-01'),
            targetEndDate: new Date('2024-07-15'),
            status: 'In Progress',
            stages: [
                { name: 'Cutting', status: 'Completed', progress: 100 },
                { name: 'Sewing', status: 'In Progress', progress: 65 },
                { name: 'Finishing', status: 'Pending', progress: 0 },
                { name: 'QC', status: 'Pending', progress: 0 }
            ]
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    }
];
const DesignContext = (0, react_1.createContext)(undefined);
function DesignProvider({ children }) {
    const [projects, setProjects] = (0, react_1.useState)(MOCK_PROJECTS);
    const [materials, setMaterials] = (0, react_1.useState)(MOCK_MATERIALS);
    const [suppliers, setSuppliers] = (0, react_1.useState)(MOCK_SUPPLIERS);
    const addProject = (project) => {
        setProjects(prev => [project, ...prev]);
    };
    const updateProject = (id, updates) => {
        setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    };
    const deleteProject = (id) => {
        setProjects(prev => prev.filter(p => p.id !== id));
    };
    const updateProjectStatus = (id, status) => {
        setProjects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    };
    const addMaterial = (material) => {
        setMaterials(prev => [material, ...prev]);
    };
    const updateMaterial = (id, updates) => {
        setMaterials(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
    };
    const deleteMaterial = (id) => {
        setMaterials(prev => prev.filter(m => m.id !== id));
    };
    return (<DesignContext.Provider value={{
            projects,
            materials,
            suppliers,
            addProject,
            updateProject,
            deleteProject,
            updateProjectStatus,
            addMaterial,
            updateMaterial,
            deleteMaterial
        }}>
      {children}
    </DesignContext.Provider>);
}
function useDesign() {
    const context = (0, react_1.useContext)(DesignContext);
    if (context === undefined) {
        throw new Error('useDesign must be used within a DesignProvider');
    }
    return context;
}
