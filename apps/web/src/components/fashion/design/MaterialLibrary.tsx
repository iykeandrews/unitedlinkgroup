'use client';

import React from 'react';
import { DesignMaterial, Supplier } from '../../../types/fashion';
import { Search, Plus, Filter, Scissors, Package } from 'lucide-react';

interface MaterialLibraryProps {
  materials: DesignMaterial[];
  suppliers: Supplier[];
  onAddMaterial: () => void;
  onEditMaterial: (material: DesignMaterial) => void;
}

export default function MaterialLibrary({ materials, suppliers, onAddMaterial, onEditMaterial }: MaterialLibraryProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterType, setFilterType] = React.useState<string>('All');

  const getSupplierName = (id: string) => {
    return suppliers.find(s => s.id === id)?.name || 'Unknown Supplier';
  };

  const filteredMaterials = materials.filter(material => {
      const matchesSearch = material.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'All' || material.type === filterType;
      return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
                type="text" 
                placeholder="Search fabrics, trims..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
        </div>
        <div className="flex gap-2">
            <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors bg-transparent"
            >
                <option value="All">All Types</option>
                <option value="Fabric">Fabric</option>
                <option value="Trim">Trim</option>
                <option value="Packaging">Packaging</option>
            </select>
            <button 
                onClick={onAddMaterial}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
            >
                <Plus className="w-4 h-4" />
                Add Material
            </button>
        </div>
      </div>

      {/* Material Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMaterials.map((material) => (
            <div 
                key={material.id} 
                onClick={() => onEditMaterial(material)}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-all group cursor-pointer"
            >
                <div className="h-40 bg-slate-100 dark:bg-slate-700 relative">
                    {material.imageUrl ? (
                        <img src={material.imageUrl} alt={material.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">
                            {material.type === 'Fabric' ? <Scissors className="w-8 h-8 opacity-50" /> : <Package className="w-8 h-8 opacity-50" />}
                        </div>
                    )}
                    <div className="absolute top-3 right-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            material.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                            {material.status}
                        </span>
                    </div>
                </div>
                
                <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                                {material.name}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{material.type}</p>
                        </div>
                    </div>

                    <div className="space-y-2 mt-4 text-sm">
                        <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700">
                            <span className="text-slate-500">Supplier</span>
                            <span className="font-medium text-slate-900 dark:text-white">{getSupplierName(material.supplierId)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700">
                            <span className="text-slate-500">Cost</span>
                            <span className="font-medium text-slate-900 dark:text-white">${material.costPerUnit.toFixed(2)} / {material.unit}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-700">
                            <span className="text-slate-500">Lead Time</span>
                            <span className="font-medium text-slate-900 dark:text-white">{material.leadTime} days</span>
                        </div>
                        <div className="flex justify-between py-1">
                            <span className="text-slate-500">MOQ</span>
                            <span className="font-medium text-slate-900 dark:text-white">{material.moq} {material.unit}s</span>
                        </div>
                    </div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}
