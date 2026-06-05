import React from 'react';
interface SlideOverProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    width?: string;
}
export default function SlideOver({ isOpen, onClose, title, children, width }: SlideOverProps): React.JSX.Element | null;
export {};
