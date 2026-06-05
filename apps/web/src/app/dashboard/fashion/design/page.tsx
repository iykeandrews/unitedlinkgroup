'use client';

import React, { useState } from 'react';
import { Palette, Plus, LayoutGrid, List, Kanban, Scissors } from 'lucide-react';
import { DesignProvider, useDesign } from '../../../../context/design-context';
import { DesignProject, DesignMaterial } from '../../../../types/fashion';
import DesignStats from '../../../../components/fashion/design/DesignStats';
import DesignProjectList from '../../../../components/fashion/design/DesignProjectList';
import DesignProjectBoard from '../../../../components/fashion/design/DesignProjectBoard';
import DesignDetailModal from '../../../../components/fashion/design/DesignDetailModal';
import MaterialLibrary from '../../../../components/fashion/design/MaterialLibrary';
import DesignProjectFormModal from '../../../../components/fashion/design/DesignProjectFormModal';
import MaterialFormModal from '../../../../components/fashion/design/MaterialFormModal';

function FashionDesignContent() {
  const { projects, materials, suppliers, addProject, updateProject, addMaterial, updateMaterial } = useDesign();
  const [activeTab, setActiveTab] = useState<'projects' | 'materials'>('projects');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'board'>('grid');
  
  // Modal States
  const [selectedProject, setSelectedProject] = useState<DesignProject | null>(null);
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<DesignProject | undefined>(undefined);
  
  const [isMaterialFormOpen, setIsMaterialFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<DesignMaterial | undefined>(undefined);

  const handleCreateProject = () => {
    setEditingProject(undefined);
    setIsProjectFormOpen(true);
  };

  const handleEditProject = (project: DesignProject) => {
      setEditingProject(project);
      setIsProjectFormOpen(true);
  };

  const handleSaveProject = (project: DesignProject) => {
    if (editingProject) {
        updateProject(project.id, project);
    } else {
        addProject(project);
    }
    setIsProjectFormOpen(false);
  };

  const handleAddMaterial = () => {
      setEditingMaterial(undefined);
      setIsMaterialFormOpen(true);
  };

  const handleEditMaterial = (material: DesignMaterial) => {
      setEditingMaterial(material);
      setIsMaterialFormOpen(true);
  };

  const handleSaveMaterial = (material: DesignMaterial) => {
      if (editingMaterial) {
          updateMaterial(material.id, material);
      } else {
          addMaterial(material);
      }
      setIsMaterialFormOpen(false);
  };

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg text-pink-600 dark:text-pink-400">
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Design & Production</h1>
            <p className="text-slate-500 dark:text-slate-400">Manage designs, tech packs, and manufacturing.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
             {activeTab === 'projects' && (
                <div className="flex bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1">
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded ${viewMode === 'grid' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}
                        title="Grid View"
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded ${viewMode === 'list' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}
                        title="List View"
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setViewMode('board')}
                        className={`p-2 rounded ${viewMode === 'board' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700'}`}
                        title="Board View"
                    >
                        <Kanban className="w-4 h-4" />
                    </button>
                </div>
            )}
            <button 
                onClick={activeTab === 'projects' ? handleCreateProject : handleAddMaterial}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
            >
                <Plus className="w-4 h-4" />
                {activeTab === 'projects' ? 'New Design' : 'Add Material'}
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
        <button 
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'projects' 
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
        >
            <Palette className="w-4 h-4" />
            Design Projects
        </button>
        <button 
            onClick={() => setActiveTab('materials')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'materials' 
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
        >
            <Scissors className="w-4 h-4" />
            Materials Library
        </button>
      </div>

      <DesignStats />

      {/* Main Content */}
      <div className="flex-1">
        {activeTab === 'projects' ? (
            viewMode === 'board' ? (
                <DesignProjectBoard projects={projects} onSelectProject={setSelectedProject} />
            ) : (
                <DesignProjectList 
                    projects={projects} 
                    viewMode={viewMode as 'grid' | 'list'} 
                    onSelectProject={setSelectedProject} 
                />
            )
        ) : (
            <MaterialLibrary 
                materials={materials} 
                suppliers={suppliers} 
                onAddMaterial={handleAddMaterial}
                onEditMaterial={handleEditMaterial}
            />
        )}
      </div>

      {/* Modals */}
      {selectedProject && (
        <DesignDetailModal 
            project={selectedProject} 
            onClose={() => setSelectedProject(null)}
            onEdit={handleEditProject}
        />
      )}

      {isProjectFormOpen && (
          <DesignProjectFormModal
              project={editingProject}
              onClose={() => setIsProjectFormOpen(false)}
              onSubmit={handleSaveProject}
          />
      )}

      {isMaterialFormOpen && (
          <MaterialFormModal
              material={editingMaterial}
              suppliers={suppliers}
              onClose={() => setIsMaterialFormOpen(false)}
              onSubmit={handleSaveMaterial}
          />
      )}
    </div>
  );
}

export default function FashionDesignPage() {
  return (
    <DesignProvider>
      <FashionDesignContent />
    </DesignProvider>
  );
}
