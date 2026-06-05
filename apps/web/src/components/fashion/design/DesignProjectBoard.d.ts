import React from 'react';
import { DesignProject } from '../../../types/fashion';
interface DesignProjectBoardProps {
    projects: DesignProject[];
    onSelectProject: (project: DesignProject) => void;
}
export default function DesignProjectBoard({ projects, onSelectProject }: DesignProjectBoardProps): React.JSX.Element;
export {};
