import { Modal, ModalActionButton } from './Modal';
import { AlertTriangle, Info } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

export function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  variant = 'primary',
  isLoading = false
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full flex-shrink-0 ${variant === 'danger' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
            {variant === 'danger' ? <AlertTriangle size={24} /> : <Info size={24} />}
          </div>
          <div className="mt-1">
             <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {message}
            </p>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-4">
          <ModalActionButton kind="cancel" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </ModalActionButton>
          {variant === 'danger' ? (
            <ModalActionButton kind="delete" onClick={onConfirm} disabled={isLoading}>
              {isLoading ? 'Processing...' : confirmText}
            </ModalActionButton>
          ) : (
            <ModalActionButton kind="submit" onClick={onConfirm} disabled={isLoading}>
              {isLoading ? 'Processing...' : confirmText}
            </ModalActionButton>
          )}
        </div>
      </div>
    </Modal>
  );
}
