import React from 'react';
import { DesignProject } from '../../../types/fashion';
interface DesignDetailModalProps {
    project: DesignProject;
    onClose: () => void;
    onEdit?: (project: DesignProject) => void;
}
export default function DesignDetailModal({ project, onClose, onEdit }: DesignDetailModalProps): React.JSX.Element;
export {};
