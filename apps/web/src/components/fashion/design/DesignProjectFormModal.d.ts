import React from 'react';
import { DesignProject } from '../../../types/fashion';
interface DesignProjectFormModalProps {
    project?: DesignProject;
    onClose: () => void;
    onSubmit: (project: DesignProject) => void;
}
export default function DesignProjectFormModal({ project, onClose, onSubmit }: DesignProjectFormModalProps): React.JSX.Element;
export {};
