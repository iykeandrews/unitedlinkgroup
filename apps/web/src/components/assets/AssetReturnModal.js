"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AssetReturnModal;
const react_1 = __importStar(require("react"));
const Modal_1 = require("../Modal");
const api_1 = __importDefault(require("../../lib/api"));
const CONDITIONS = [
    'NEW',
    'GOOD',
    'FAIR',
    'DAMAGED',
    'RETIRED',
];
function AssetReturnModal({ isOpen, onClose, onSuccess, asset }) {
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [formData, setFormData] = (0, react_1.useState)({
        returnDate: new Date().toISOString().split('T')[0],
        condition: 'GOOD',
        notes: '',
    });
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!asset)
            return;
        setLoading(true);
        try {
            await api_1.default.post(`/assets/${asset.id}/return`, {
                returnDate: new Date(formData.returnDate).toISOString(),
                condition: formData.condition,
                notes: formData.notes,
            });
            onSuccess();
            onClose();
        }
        catch (error) {
            console.error('Failed to return asset', error);
        }
        finally {
            setLoading(false);
        }
    };
    if (!asset)
        return null;
    return (<Modal_1.Modal isOpen={isOpen} onClose={onClose} title="Return Asset" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">Returning Asset:</p>
          <p className="font-medium text-slate-900 dark:text-white">{asset.name}</p>
          {asset.assignedTo && (<p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Currently assigned to: <span className="text-slate-900 dark:text-white font-medium">{asset.assignedTo.firstName} {asset.assignedTo.lastName}</span>
            </p>)}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Return Date</label>
          <input type="date" required className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={formData.returnDate} onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}/>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Returned Condition</label>
          <select required className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={formData.condition} onChange={(e) => setFormData({ ...formData, condition: e.target.value })}>
            {CONDITIONS.map(condition => (<option key={condition} value={condition}>{condition}</option>))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
          <textarea className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" rows={3} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Any comments about the return or condition..."/>
        </div>

        <div className="flex justify-end pt-4">
          <div className="flex gap-3">
            <Modal_1.ModalActionButton kind="cancel" onClick={onClose}>
              Cancel
            </Modal_1.ModalActionButton>
            <Modal_1.ModalActionButton kind="submit" type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Confirm Return'}
            </Modal_1.ModalActionButton>
          </div>
        </div>
      </form>
    </Modal_1.Modal>);
}
