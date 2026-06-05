import React from 'react';
import { DesignProject } from '../../../types/fashion';
interface DesignProjectListProps {
    projects: DesignProject[];
    viewMode: 'grid' | 'list';
    onSelectProject: (project: DesignProject) => void;
}
export default function DesignProjectList({ projects, viewMode, onSelectProject }: DesignProjectListProps): React.JSX.Element;
export {};
