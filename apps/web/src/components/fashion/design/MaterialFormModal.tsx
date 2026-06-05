'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { DesignMaterial, Supplier } from '../../../types/fashion';

interface MaterialFormModalProps {
  material?: DesignMaterial; // If provided, we are editing
  suppliers: Supplier[];
  onClose: () => void;
  onSubmit: (material: DesignMaterial) => void;
}

export default function MaterialFormModal({ material, suppliers, onClose, onSubmit }: MaterialFormModalProps) {
  const [formData, setFormData] = useState<Partial<DesignMaterial>>(() => {
    if (material) return material;
    return {
      name: '',
      type: 'Fabric',
      supplierId: '',
      costPerUnit: 0,
      unit: 'meter',
      leadTime: 0,
      moq: 0,
      status: 'Pending',
    };
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submittedMaterial: DesignMaterial = {
      id: material?.id || `mat-${Date.now()}`,
      name: formData.name || '',
      type: formData.type as 'Fabric' | 'Trim' | 'Packaging',
      supplierId: formData.supplierId || '',
      costPerUnit: Number(formData.costPerUnit) || 0,
      unit: formData.unit || 'meter',
      leadTime: Number(formData.leadTime) || 0,
      moq: Number(formData.moq) || 0,
      status: formData.status as 'Pending' | 'Approved' | 'Rejected',
      imageUrl: formData.imageUrl,
    };

    onSubmit(submittedMaterial);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {material ? 'Edit Material' : 'Add New Material'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Material Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. 100% Cotton Jersey"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Type</label>
                <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="Fabric">Fabric</option>
                    <option value="Trim">Trim</option>
                    <option value="Packaging">Packaging</option>
                </select>
                </div>

                <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Supplier</label>
                <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Cost Per Unit</label>
                <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.costPerUnit}
                    onChange={(e) => setFormData({ ...formData, costPerUnit: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                </div>

                <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Unit</label>
                <input
                    type="text"
                    required
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. meter, yard, pc"
                />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Lead Time (Days)</label>
                <input
                    type="number"
                    min="0"
                    required
                    value={formData.leadTime}
                    onChange={(e) => setFormData({ ...formData, leadTime: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                </div>

                <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">MOQ</label>
                <input
                    type="number"
                    min="0"
                    required
                    value={formData.moq}
                    onChange={(e) => setFormData({ ...formData, moq: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium"
            >
              {material ? 'Save Changes' : 'Add Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
