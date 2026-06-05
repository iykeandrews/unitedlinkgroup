import React from 'react';
import { Shift } from './types';
interface ShiftCardProps {
    shift: Shift;
    onEdit: (shift: Shift) => void;
    draggable?: boolean;
    isMine?: boolean;
}
export declare function ShiftCard({ shift, onEdit, draggable, isMine }: ShiftCardProps): React.JSX.Element;
export {};
