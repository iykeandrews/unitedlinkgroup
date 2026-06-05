'use client';

import React, { useState } from 'react';
import { DesignProject, Product, ProductStatus } from '../../../types/fashion';
import { X, Layers, Settings, FileText, Factory, DollarSign, Clock, ArrowRight, Edit } from 'lucide-react';
import TechPackView from './TechPackView';
import ProductionView from './ProductionView';
import { useInventory } from '../../../context/inventory-context';

interface DesignDetailModalProps {
  project: DesignProject;
  onClose: () => void;
  onEdit?: (project: DesignProject) => void;
}

type Tab = 'overview' | 'techpack' | 'costing' | 'production';

export default function DesignDetailModal({ project, onClose, onEdit }: DesignDetailModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { addProduct } = useInventory();
  const [isPromoting, setIsPromoting] = useState(false);

  const handlePromote = () => {
    setIsPromoting(true);
    // Convert DesignProject to Product
    const newProduct: Product = {
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
        basePrice: project.costing?.targetCost ? project.costing.targetCost * 2 : 0, // Mock pricing logic
        status: 'Draft' as ProductStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    addProduct(newProduct);
    setTimeout(() => {
        setIsPromoting(false);
        alert('Design promoted to Product Inventory successfully!');
    }, 1000);
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'techpack', label: 'Tech Pack', icon: Layers },
    { id: 'costing', label: 'Costing', icon: DollarSign },
    { id: 'production', label: 'Production', icon: Factory },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                {project.thumbnailUrl && <img src={project.thumbnailUrl} alt="" className="w-full h-full object-cover" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{project.name}</h2>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>{project.season}</span>
                <span>•</span>
                <span>{project.category}</span>
                <span>•</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    project.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 
                    project.status === 'In Production' ? 'bg-purple-100 text-purple-700' : 
                    'bg-slate-100 text-slate-700'
                }`}>
                    {project.status}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
                <button 
                    onClick={() => onEdit(project)}
                    className="flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                    <Edit className="w-4 h-4" />
                    Edit Details
                </button>
            )}
            {project.status === 'Completed' && (
                <button 
                    onClick={handlePromote}
                    disabled={isPromoting}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                    {isPromoting ? 'Promoting...' : 'Promote to Product'}
                    {!isPromoting && <ArrowRight className="w-4 h-4" />}
                </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                <X className="w-6 h-6 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === tab.id 
                            ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
                            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                </button>
            ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900/50">
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-6">
                        {/* Design Stages Timeline */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
                            <h3 className="font-semibold text-slate-900 dark:text-white mb-6">Design Process</h3>
                            <div className="relative">
                                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
                                <div className="space-y-8 relative z-10">
                                    {project.stages.map((stage) => (
                                        <div key={stage.id} className="flex gap-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                stage.status === 'Completed' ? 'bg-emerald-500 text-white' : 
                                                stage.status === 'In Progress' ? 'bg-amber-500 text-white' : 
                                                'bg-slate-200 dark:bg-slate-700 text-slate-400'
                                            }`}>
                                                {stage.status === 'Completed' ? <CheckIcon /> : <Clock className="w-4 h-4" />}
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
                                        </div>
                                    ))}
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
                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-sm ${
                                        project.priority === 'High' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                                    }`}>
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
                </div>
            )}

            {activeTab === 'techpack' && <TechPackView techPack={project.techPack} />}
            
            {activeTab === 'costing' && (
                 <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 max-w-2xl mx-auto">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Cost Breakdown</h3>
                    {project.costing ? (
                        <div className="space-y-4">
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
                        </div>
                    ) : (
                        <p className="text-center text-slate-500 py-10">No costing data available.</p>
                    )}
                 </div>
            )}

            {activeTab === 'production' && <ProductionView production={project.production} />}
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
    )
}
