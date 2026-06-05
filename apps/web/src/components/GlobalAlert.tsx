'use client';

import { useEffect, useRef, useState } from 'react';
import { Modal, ModalActionButton } from './Modal';

export default function GlobalAlert() {
  const originalAlertRef = useRef<((message?: any) => void) | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!originalAlertRef.current) {
      originalAlertRef.current = window.alert;
    }
    window.alert = (msg?: any) => {
      setMessage(
        typeof msg === 'string'
          ? msg
          : msg == null
          ? ''
          : (() => {
              try {
                return JSON.stringify(msg);
              } catch {
                return String(msg);
              }
            })()
      );
      setIsOpen(true);
    };

    return () => {
      if (originalAlertRef.current) {
        window.alert = originalAlertRef.current;
      }
    };
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    setMessage('');
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Notice">
      <div className="text-sm text-slate-700 dark:text-slate-300 break-words">
        {message}
      </div>
      <div className="mt-6 flex justify-end">
        <ModalActionButton kind="submit" onClick={handleClose}>
          OK
        </ModalActionButton>
      </div>
    </Modal>
  );
}

