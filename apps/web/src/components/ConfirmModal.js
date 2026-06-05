"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfirmModal = ConfirmModal;
const Modal_1 = require("./Modal");
const lucide_react_1 = require("lucide-react");
function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'primary', isLoading = false }) {
    return (<Modal_1.Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-md">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full flex-shrink-0 ${variant === 'danger' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
            {variant === 'danger' ? <lucide_react_1.AlertTriangle size={24}/> : <lucide_react_1.Info size={24}/>}
          </div>
          <div className="mt-1">
             <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {message}
            </p>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-4">
          <Modal_1.ModalActionButton kind="cancel" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Modal_1.ModalActionButton>
          {variant === 'danger' ? (<Modal_1.ModalActionButton kind="delete" onClick={onConfirm} disabled={isLoading}>
              {isLoading ? 'Processing...' : confirmText}
            </Modal_1.ModalActionButton>) : (<Modal_1.ModalActionButton kind="submit" onClick={onConfirm} disabled={isLoading}>
              {isLoading ? 'Processing...' : confirmText}
            </Modal_1.ModalActionButton>)}
        </div>
      </div>
    </Modal_1.Modal>);
}
