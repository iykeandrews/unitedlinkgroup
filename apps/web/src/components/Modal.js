"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.Modal = Modal;
exports.ModalActionButton = ModalActionButton;
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md', className = '', bodyClassName = '', variant = 'default' }) {
    const modalRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        const handleEscape = (e) => {
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
    if (!isOpen)
        return null;
    const isClean = variant === 'clean';
    return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onMouseDown={(e) => {
            if (modalRef.current && !modalRef.current.contains(e.target)) {
                onClose();
            }
        }}>
      <div ref={modalRef} className={`${isClean ? '' : 'bg-white dark:bg-slate-800 shadow-2xl'} rounded-xl w-full ${maxWidth} max-h-[calc(100vh-2rem)] flex flex-col transform transition-all animate-in zoom-in-95 slide-in-from-bottom-2 duration-200 ${className}`} role="dialog" aria-modal="true">
        {!isClean && (<div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-transform active:scale-95">
              <lucide_react_1.X className="h-5 w-5"/>
            </button>
          </div>)}
        <div className={`${isClean ? '' : 'p-6'} flex-1 min-h-0 overflow-y-auto ${bodyClassName}`}>
          {children}
        </div>
      </div>
    </div>);
}
function ModalActionButton({ kind = 'submit', onClick, children, disabled, className = '', type = 'button', form }) {
    const [pulse, setPulse] = (0, react_1.useState)(false);
    const Icon = kind === 'submit' ? lucide_react_1.Check : kind === 'delete' ? lucide_react_1.Trash2 : lucide_react_1.X;
    const base = kind === 'delete'
        ? 'text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100'
        : kind === 'cancel'
            ? 'text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200'
            : 'text-white bg-purple-600 hover:bg-purple-700';
    return (<button type={type} form={form} disabled={disabled} onClick={(e) => {
            setPulse(true);
            setTimeout(() => setPulse(false), 250);
            onClick === null || onClick === void 0 ? void 0 : onClick(e);
        }} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors group flex items-center gap-2 ${base} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <Icon className={`w-4 h-4 transition-transform ${pulse ? 'scale-110 rotate-6' : ''}`}/>
      <span>{children}</span>
    </button>);
}
