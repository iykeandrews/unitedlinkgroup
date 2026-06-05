import React, { ReactNode } from 'react';
import { DesignProject, DesignMaterial, Supplier, DesignStatus } from '../types/fashion';
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
export declare function DesignProvider({ children }: {
    children: ReactNode;
}): React.JSX.Element;
export declare function useDesign(): DesignContextType;
export {};
