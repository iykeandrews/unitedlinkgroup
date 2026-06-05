import React from 'react';
import { Location, Shift, ViewType, GroupBy, Employee } from './types';
interface TimelineGridProps {
    view: ViewType;
    groupBy: GroupBy;
    startDate: Date;
    locations: Location[];
    employees: Employee[];
    shifts: Shift[];
    collapsed?: boolean;
    readOnly?: boolean;
    onShiftClick: (shift: Shift) => void;
    onAddShiftAtLocation: (locationId: string, date: Date) => void;
    onAddShiftForEmployee: (employeeId: string, date: Date) => void;
    currentUserId?: string;
}
export declare function TimelineGrid({ view, groupBy, startDate, locations, employees, shifts, collapsed, readOnly, onShiftClick, onAddShiftAtLocation, onAddShiftForEmployee, currentUserId }: TimelineGridProps): React.JSX.Element;
export {};
