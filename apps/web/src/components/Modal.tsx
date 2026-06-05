'use client';

import { X, Check, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
  bodyClassName?: string;
  variant?: 'default' | 'clean';
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md', className = '', bodyClassName = '', variant = 'default' }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
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

  const isClean = variant === 'clean';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onMouseDown={(e) => {
        if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
          onClose();
        }
      }}
    >
      <div 
        ref={modalRef}
        className={`${isClean ? '' : 'bg-white dark:bg-slate-800 shadow-2xl'} rounded-xl w-full ${maxWidth} max-h-[calc(100vh-2rem)] flex flex-col transform transition-all animate-in zoom-in-95 slide-in-from-bottom-2 duration-200 ${className}`}
        role="dialog"
        aria-modal="true"
      >
        {!isClean && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-transform active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className={`${isClean ? '' : 'p-6'} flex-1 min-h-0 overflow-y-auto ${bodyClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

interface ModalActionButtonProps {
  kind?: 'submit' | 'cancel' | 'delete';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  form?: string;
}

export function ModalActionButton({ kind = 'submit', onClick, children, disabled, className = '', type = 'button', form }: ModalActionButtonProps) {
  const [pulse, setPulse] = useState(false);
  const Icon = kind === 'submit' ? Check : kind === 'delete' ? Trash2 : X;
  const base =
    kind === 'delete'
      ? 'text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100'
      : kind === 'cancel'
      ? 'text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200'
      : 'text-white bg-purple-600 hover:bg-purple-700';
  return (
    <button
      type={type}
      form={form}
      disabled={disabled}
      onClick={(e) => {
        setPulse(true);
        setTimeout(() => setPulse(false), 250);
        onClick?.(e);
      }}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors group flex items-center gap-2 ${base} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <Icon className={`w-4 h-4 transition-transform ${pulse ? 'scale-110 rotate-6' : ''}`} />
      <span>{children}</span>
    </button>
  );
}
