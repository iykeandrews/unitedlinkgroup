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
exports.default = FashionDesignPage;
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const design_context_1 = require("../../../../context/design-context");
const DesignStats_1 = __importDefault(require("../../../../components/fashion/design/DesignStats"));
const DesignProjectList_1 = __importDefault(require("../../../../components/fashion/design/DesignProjectList"));
const DesignProjectBoard_1 = __importDefault(require("../../../../components/fashion/design/DesignProjectBoard"));
const DesignDetailModal_1 = __importDefault(require("../../../../components/fashion/design/DesignDetailModal"));
const MaterialLibrary_1 = __importDefault(require("../../../../components/fashion/design/MaterialLibrary"));
const DesignProjectFormModal_1 = __importDefault(require("../../../../components/fashion/design/DesignProjectFormModal"));
const MaterialFormModal_1 = __importDefault(require("../../../../components/fashion/design/MaterialFormModal"));
function FashionDesignContent() {
    const { projects, materials, suppliers, addProject, updateProject, addMaterial, updateMaterial } = (0, design_context_1.useDesign)();
    const [activeTab, setActiveTab] = (0, react_1.useState)('projects');
    const [viewMode, setViewMode] = (0, react_1.useState)('grid');
    // Modal States
    const [selectedProject, setSelectedProject] = (0, react_1.useState)(null);
    const [isProjectFormOpen, setIsProjectFormOpen] = (0, react_1.useState)(false);
    const [editingProject, setEditingProject] = (0, react_1.useState)(undefined);
    const [isMaterialFormOpen, setIsMaterialFormOpen] = (0, react_1.useState)(false);
    const [editingMaterial, setEditingMaterial] = (0, react_1.useState)(undefined);
    const handleCreateProject = () => {
        setEditingProject(undefined);
        setIsProjectFormOpen(true);
    };
    const handleEditProject = (project) => {
        setEditingProject(project);
        setIsProjectFormOpen(true);
    };
    const handleSaveProject = (project) => {
        if (editingProject) {
            updateProject(project.id, project);
        }
        else {
            addProject(project);
        }
        setIsProjectFormOpen(false);
    };
    const handleAddMaterial = () => {
        setEditingMaterial(undefined);
        setIsMaterialFormOpen(true);
    };
    const handleEditMaterial = (material) => {
        setEditingMaterial(material);
        setIsMaterialFormOpen(true);
    };
    const handleSaveMaterial = (material) => {
        if (editingMaterial) {
            updateMaterial(material.id, material);
        }
        else {
            addMaterial(material);
        }
        setIsMaterialFormOpen(false);
    };
    return (<div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg text-pink-600 dark:text-pink-400">
            <lucide_react_1.Palette className="w-6 h-6"/>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Design & Production</h1>
            <p className="text-slate-500 dark:text-slate-400">Manage designs, tech packs, and manufacturing.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
             {activeTab === 'projects' && (<div className="flex bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded ${viewMode === 'grid' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`} title="Grid View">
                        <lucide_react_1.LayoutGrid className="w-4 h-4"/>
                    </button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded ${viewMode === 'list' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`} title="List View">
                        <lucide_react_1.List className="w-4 h-4"/>
                    </button>
                    <button onClick={() => setViewMode('board')} className={`p-2 rounded ${viewMode === 'board' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`} title="Board View">
                        <lucide_react_1.Kanban className="w-4 h-4"/>
                    </button>
                </div>)}
            <button onClick={activeTab === 'projects' ? handleCreateProject : handleAddMaterial} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium">
                <lucide_react_1.Plus className="w-4 h-4"/>
                {activeTab === 'projects' ? 'New Design' : 'Add Material'}
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
        <button onClick={() => setActiveTab('projects')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'projects'
            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            <lucide_react_1.Palette className="w-4 h-4"/>
            Design Projects
        </button>
        <button onClick={() => setActiveTab('materials')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'materials'
            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            <lucide_react_1.Scissors className="w-4 h-4"/>
            Materials Library
        </button>
      </div>

      <DesignStats_1.default />

      {/* Main Content */}
      <div className="flex-1">
        {activeTab === 'projects' ? (viewMode === 'board' ? (<DesignProjectBoard_1.default projects={projects} onSelectProject={setSelectedProject}/>) : (<DesignProjectList_1.default projects={projects} viewMode={viewMode} onSelectProject={setSelectedProject}/>)) : (<MaterialLibrary_1.default materials={materials} suppliers={suppliers} onAddMaterial={handleAddMaterial} onEditMaterial={handleEditMaterial}/>)}
      </div>

      {/* Modals */}
      {selectedProject && (<DesignDetailModal_1.default project={selectedProject} onClose={() => setSelectedProject(null)} onEdit={handleEditProject}/>)}

      {isProjectFormOpen && (<DesignProjectFormModal_1.default project={editingProject} onClose={() => setIsProjectFormOpen(false)} onSubmit={handleSaveProject}/>)}

      {isMaterialFormOpen && (<MaterialFormModal_1.default material={editingMaterial} suppliers={suppliers} onClose={() => setIsMaterialFormOpen(false)} onSubmit={handleSaveMaterial}/>)}
    </div>);
}
function FashionDesignPage() {
    return (<design_context_1.DesignProvider>
      <FashionDesignContent />
    </design_context_1.DesignProvider>);
}
