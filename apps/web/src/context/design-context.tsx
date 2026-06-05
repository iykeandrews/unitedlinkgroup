'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { DesignProject, DesignMaterial, Supplier, DesignStatus } from '../types/fashion';

const MOCK_MATERIALS: DesignMaterial[] = [
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

const MOCK_SUPPLIERS: Supplier[] = [
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

const MOCK_PROJECTS: DesignProject[] = [
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

interface DesignContextType {
  projects: DesignProject[];
  materials: DesignMaterial[];
  suppliers: Supplier[];
  addProject: (project: DesignProject) => void;
  updateProject: (id: string, updates: Partial<DesignProject>) => void;
  deleteProject: (id: string) => void;
  updateProjectStatus: (id: string, status: DesignStatus) => void;
  addMaterial: (material: DesignMaterial) => void;
  updateMaterial: (id: string, updates: Partial<DesignMaterial>) => void;
  deleteMaterial: (id: string) => void;
}

const DesignContext = createContext<DesignContextType | undefined>(undefined);

export function DesignProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<DesignProject[]>(MOCK_PROJECTS);
  const [materials, setMaterials] = useState<DesignMaterial[]>(MOCK_MATERIALS);
  const [suppliers, setSuppliers] = useState<Supplier[]>(MOCK_SUPPLIERS);

  const addProject = (project: DesignProject) => {
    setProjects(prev => [project, ...prev]);
  };

  const updateProject = (id: string, updates: Partial<DesignProject>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const updateProjectStatus = (id: string, status: DesignStatus) => {
      setProjects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
  };

  const addMaterial = (material: DesignMaterial) => {
    setMaterials(prev => [material, ...prev]);
  };

  const updateMaterial = (id: string, updates: Partial<DesignMaterial>) => {
    setMaterials(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const deleteMaterial = (id: string) => {
    setMaterials(prev => prev.filter(m => m.id !== id));
  };

  return (
    <DesignContext.Provider value={{
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
    </DesignContext.Provider>
  );
}

export function useDesign() {
  const context = useContext(DesignContext);
  if (context === undefined) {
    throw new Error('useDesign must be used within a DesignProvider');
  }
  return context;
}
