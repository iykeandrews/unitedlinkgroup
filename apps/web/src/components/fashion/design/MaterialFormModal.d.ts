import React from 'react';
import { DesignMaterial, Supplier } from '../../../types/fashion';
interface MaterialFormModalProps {
    material?: DesignMaterial;
    suppliers: Supplier[];
    onClose: () => void;
    onSubmit: (material: DesignMaterial) => void;
}
export default function MaterialFormModal({ material, suppliers, onClose, onSubmit }: MaterialFormModalProps): React.JSX.Element;
export {};
