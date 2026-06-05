'use client';

import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface SideModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  widthClassName?: string;
}

export function SideModal({ isOpen, onClose, title, children, widthClassName = 'w-full max-w-xl' }: SideModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
      }}
    >
      <div className="absolute inset-0 flex justify-end">
        <div
          ref={modalRef}
          className={`h-full ${widthClassName} bg-white dark:bg-slate-900 shadow-2xl border-l border-gray-200/60 dark:border-slate-700/60 flex flex-col animate-in slide-in-from-right duration-200`}
          role="dialog"
          aria-modal="true"
        >
          <div className="h-16 flex items-center justify-between px-5 border-b border-gray-200/60 dark:border-slate-700/60">
            <div className="text-lg font-bold text-gray-900 dark:text-white truncate">{title}</div>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center justify-center text-gray-500 dark:text-gray-300"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

