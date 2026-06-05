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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DesignDetailModal;
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const TechPackView_1 = __importDefault(require("./TechPackView"));
const ProductionView_1 = __importDefault(require("./ProductionView"));
const inventory_context_1 = require("../../../context/inventory-context");
function DesignDetailModal({ project, onClose, onEdit }) {
    const [activeTab, setActiveTab] = (0, react_1.useState)('overview');
    const { addProduct } = (0, inventory_context_1.useInventory)();
    const [isPromoting, setIsPromoting] = (0, react_1.useState)(false);
    const handlePromote = () => {
        var _a;
        setIsPromoting(true);
        // Convert DesignProject to Product
        const newProduct = {
            id: `prod-${Date.now()}`,
            name: project.name,
            slug: project.name.toLowerCase().replace(/\s+/g, '-'),
            sku: `SKU-${Date.now().toString().slice(-6)}`,
            description: `Product created from design ${project.name}`,
            shortDescription: project.category,
            category: project.category,
            productType: 'Apparel',
            brand: 'United Link',
            collections: [project.season],
            occasions: ['Casual'], // Default
            tags: [project.targetMarket],
            materials: [],
            countryOfOrigin: 'Unknown',
            careInstructions: [],
            sustainabilityTags: [],
            fitType: 'Regular',
            images: project.thumbnailUrl ? [{
                    id: 'img-1',
                    url: project.thumbnailUrl,
                    alt: project.name,
                    isPrimary: true
                }] : [],
            variants: [], // Would need to be generated
            basePrice: ((_a = project.costing) === null || _a === void 0 ? void 0 : _a.targetCost) ? project.costing.targetCost * 2 : 0, // Mock pricing logic
            status: 'Draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        addProduct(newProduct);
        setTimeout(() => {
            setIsPromoting(false);
            alert('Design promoted to Product Inventory successfully!');
        }, 1000);
    };
    const tabs = [
        { id: 'overview', label: 'Overview', icon: lucide_react_1.FileText },
        { id: 'techpack', label: 'Tech Pack', icon: lucide_react_1.Layers },
        { id: 'costing', label: 'Costing', icon: lucide_react_1.DollarSign },
        { id: 'production', label: 'Production', icon: lucide_react_1.Factory },
    ];
    return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                {project.thumbnailUrl && <img src={project.thumbnailUrl} alt="" className="w-full h-full object-cover"/>}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{project.name}</h2>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>{project.season}</span>
                <span>•</span>
                <span>{project.category}</span>
                <span>•</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${project.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
            project.status === 'In Production' ? 'bg-purple-100 text-purple-700' :
                'bg-slate-100 text-slate-700'}`}>
                    {project.status}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (<button onClick={() => onEdit(project)} className="flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <lucide_react_1.Edit className="w-4 h-4"/>
                    Edit Details
                </button>)}
            {project.status === 'Completed' && (<button onClick={handlePromote} disabled={isPromoting} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50">
                    {isPromoting ? 'Promoting...' : 'Promote to Product'}
                    {!isPromoting && <lucide_react_1.ArrowRight className="w-4 h-4"/>}
                </button>)}
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <lucide_react_1.X className="w-6 h-6 text-slate-500"/>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6">
            {tabs.map((tab) => (<button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                    <tab.icon className="w-4 h-4"/>
                    {tab.label}
                </button>))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900/50">
            {activeTab === 'overview' && (<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                        {/* Design Stages Timeline */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                            <h3 className="font-semibold text-slate-900 dark:text-white mb-6">Design Process</h3>
                            <div className="relative">
                                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
                                <div className="space-y-8 relative z-10">
                                    {project.stages.map((stage) => (<div key={stage.id} className="flex gap-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${stage.status === 'Completed' ? 'bg-emerald-500 text-white' :
                    stage.status === 'In Progress' ? 'bg-amber-500 text-white' :
                        'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                                                {stage.status === 'Completed' ? <CheckIcon /> : <lucide_react_1.Clock className="w-4 h-4"/>}
                                            </div>
                                            <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className="font-medium text-slate-900 dark:text-white">{stage.name}</h4>
                                                    <span className="text-xs text-slate-500">{stage.updatedAt.toLocaleDateString()}</span>
                                                </div>
                                                <p className="text-sm text-slate-500">
                                                    Status: <span className="font-medium">{stage.status}</span>
                                                </p>
                                            </div>
                                        </div>))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Project Info */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Project Details</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-semibold">Designer</label>
                                    <p className="text-slate-900 dark:text-white">{project.designer}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-semibold">Target Market</label>
                                    <p className="text-slate-900 dark:text-white">{project.targetMarket}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-semibold">Priority</label>
                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-sm ${project.priority === 'High' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {project.priority}
                                    </span>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase font-semibold">Launch Date</label>
                                    <p className="text-slate-900 dark:text-white">{new Date(project.targetLaunchDate).toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>)}

            {activeTab === 'techpack' && <TechPackView_1.default techPack={project.techPack}/>}
            
            {activeTab === 'costing' && (<div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 max-w-2xl mx-auto">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Cost Breakdown</h3>
                    {project.costing ? (<div className="space-y-4">
                            <div className="flex justify-between py-3 border-b border-slate-100 dark:border-slate-700">
                                <span className="text-slate-600 dark:text-slate-400">Material Cost</span>
                                <span className="font-medium">${project.costing.materialCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between py-3 border-b border-slate-100 dark:border-slate-700">
                                <span className="text-slate-600 dark:text-slate-400">Labor Cost</span>
                                <span className="font-medium">${project.costing.laborCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between py-3 border-b border-slate-100 dark:border-slate-700">
                                <span className="text-slate-600 dark:text-slate-400">Overhead</span>
                                <span className="font-medium">${project.costing.overheadCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between py-3 bg-slate-50 dark:bg-slate-700/50 px-4 rounded-lg mt-4">
                                <span className="font-bold text-slate-900 dark:text-white">Total Cost</span>
                                <span className="font-bold text-slate-900 dark:text-white">${project.costing.actualCost.toFixed(2)}</span>
                            </div>
                             <div className="flex justify-between py-3 px-4">
                                <span className="text-slate-500">Target Cost</span>
                                <span className="text-slate-500">${project.costing.targetCost.toFixed(2)}</span>
                            </div>
                        </div>) : (<p className="text-center text-slate-500 py-10">No costing data available.</p>)}
                 </div>)}

            {activeTab === 'production' && <ProductionView_1.default production={project.production}/>}
        </div>
      </div>
    </div>);
}
function CheckIcon() {
    return (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>);
}
