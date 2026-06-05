import React from 'react';
import { DesignMaterial, Supplier } from '../../../types/fashion';
interface MaterialLibraryProps {
    materials: DesignMaterial[];
    suppliers: Supplier[];
    onAddMaterial: () => void;
    onEditMaterial: (material: DesignMaterial) => void;
}
export default function MaterialLibrary({ materials, suppliers, onAddMaterial, onEditMaterial }: MaterialLibraryProps): React.JSX.Element;
export {};
