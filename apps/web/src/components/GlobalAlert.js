"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GlobalAlert;
const react_1 = require("react");
const Modal_1 = require("./Modal");
function GlobalAlert() {
    const originalAlertRef = (0, react_1.useRef)(null);
    const [isOpen, setIsOpen] = (0, react_1.useState)(false);
    const [message, setMessage] = (0, react_1.useState)('');
    (0, react_1.useEffect)(() => {
        if (typeof window === 'undefined')
            return;
        if (!originalAlertRef.current) {
            originalAlertRef.current = window.alert;
        }
        window.alert = (msg) => {
            setMessage(typeof msg === 'string'
                ? msg
                : msg == null
                    ? ''
                    : (() => {
                        try {
                            return JSON.stringify(msg);
                        }
                        catch {
                            return String(msg);
                        }
                    })());
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
    return (<Modal_1.Modal isOpen={isOpen} onClose={handleClose} title="Notice">
      <div className="text-sm text-slate-700 dark:text-slate-300 break-words">
        {message}
      </div>
      <div className="mt-6 flex justify-end">
        <Modal_1.ModalActionButton kind="submit" onClick={handleClose}>
          OK
        </Modal_1.ModalActionButton>
      </div>
    </Modal_1.Modal>);
}
