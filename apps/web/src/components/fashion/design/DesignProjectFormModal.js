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
exports.default = DesignProjectFormModal;
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
function DesignProjectFormModal({ project, onClose, onSubmit }) {
    const [formData, setFormData] = (0, react_1.useState)(() => {
        if (project) {
            return {
                ...project,
                targetLaunchDate: new Date(project.targetLaunchDate),
            };
        }
        return {
            name: '',
            season: '',
            category: 'Women',
            productType: '',
            targetMarket: '',
            designer: 'Current User',
            status: 'Concept',
            priority: 'Medium',
            targetLaunchDate: new Date(),
        };
    });
    const handleSubmit = (e) => {
        e.preventDefault();
        // Construct the full project object
        const submittedProject = {
            id: (project === null || project === void 0 ? void 0 : project.id) || `dp-${Date.now()}`,
            name: formData.name || '',
            season: formData.season || '',
            category: formData.category || 'Women',
            productType: formData.productType || '',
            targetMarket: formData.targetMarket || '',
            designer: formData.designer || 'Current User',
            status: formData.status || 'Concept',
            priority: formData.priority || 'Medium',
            targetLaunchDate: formData.targetLaunchDate || new Date(),
            // Preserve existing complex fields if editing, or initialize empty for new
            stages: (project === null || project === void 0 ? void 0 : project.stages) || [],
            techPack: project === null || project === void 0 ? void 0 : project.techPack,
            costing: project === null || project === void 0 ? void 0 : project.costing,
            production: project === null || project === void 0 ? void 0 : project.production,
            createdAt: (project === null || project === void 0 ? void 0 : project.createdAt) || new Date(),
            updatedAt: new Date(),
            thumbnailUrl: project === null || project === void 0 ? void 0 : project.thumbnailUrl,
        };
        onSubmit(submittedProject);
    };
    return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {project ? 'Edit Design Project' : 'New Design Project'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <lucide_react_1.X className="w-6 h-6 text-slate-500"/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Project Name</label>
              <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Summer Breeze Dress"/>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Season</label>
              <input type="text" required value={formData.season} onChange={(e) => setFormData({ ...formData, season: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. SS25"/>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="Men">Men</option>
                <option value="Women">Women</option>
                <option value="Kids">Kids</option>
                <option value="Unisex">Unisex</option>
                <option value="Accessories">Accessories</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Product Type</label>
              <input type="text" required value={formData.productType} onChange={(e) => setFormData({ ...formData, productType: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Dress, T-Shirt"/>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Target Market</label>
              <input type="text" value={formData.targetMarket} onChange={(e) => setFormData({ ...formData, targetMarket: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Young Adult"/>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="Concept">Concept</option>
                <option value="Fabric Sourcing">Fabric Sourcing</option>
                <option value="Pattern Making">Pattern Making</option>
                <option value="Sampling">Sampling</option>
                <option value="Fit Review">Fit Review</option>
                <option value="Approvals">Approvals</option>
                <option value="Pre-Production">Pre-Production</option>
                <option value="In Production">In Production</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Priority</label>
              <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Target Launch</label>
              <input type="date" required value={formData.targetLaunchDate instanceof Date ? formData.targetLaunchDate.toISOString().split('T')[0] : ''} onChange={(e) => setFormData({ ...formData, targetLaunchDate: new Date(e.target.value) })} className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium">
              {project ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>);
}
