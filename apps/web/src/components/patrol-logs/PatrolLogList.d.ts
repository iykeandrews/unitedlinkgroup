import React from 'react';
interface PatrolLogListProps {
    servicePinId?: string;
    locationId?: string;
    refreshTrigger?: number;
}
export default function PatrolLogList({ servicePinId, locationId, refreshTrigger }: PatrolLogListProps): React.JSX.Element;
export {};
