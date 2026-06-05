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
exports.default = AssetAssignmentModal;
const react_1 = __importStar(require("react"));
const Modal_1 = require("../Modal");
const api_1 = __importDefault(require("../../lib/api"));
const lucide_react_1 = require("lucide-react");
function AssetAssignmentModal({ isOpen, onClose, onSuccess, asset }) {
    const [employees, setEmployees] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [formData, setFormData] = (0, react_1.useState)({
        assignedToId: '',
        assignedDate: new Date().toISOString().split('T')[0],
        expectedReturnDate: '',
        notes: '',
        quantity: 1,
    });
    (0, react_1.useEffect)(() => {
        if (isOpen) {
            fetchEmployees();
            // Reset form or populate if asset is already assigned
            if (asset === null || asset === void 0 ? void 0 : asset.assignedToId) {
                setFormData({
                    assignedToId: asset.assignedToId,
                    assignedDate: asset.assignedDate ? new Date(asset.assignedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    expectedReturnDate: asset.expectedReturnDate ? new Date(asset.expectedReturnDate).toISOString().split('T')[0] : '',
                    notes: asset.notes || '',
                    quantity: asset.quantity || 1,
                });
            }
            else {
                setFormData({
                    assignedToId: '',
                    assignedDate: new Date().toISOString().split('T')[0],
                    expectedReturnDate: '',
                    notes: '',
                    quantity: 1,
                });
            }
        }
    }, [isOpen, asset]);
    const fetchEmployees = async () => {
        try {
            const res = await api_1.default.get('/employees');
            setEmployees(res.data);
        }
        catch (error) {
            console.error('Failed to fetch employees', error);
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!asset)
            return;
        setLoading(true);
        try {
            const payload = {
                assignedToId: formData.assignedToId,
                assignedDate: formData.assignedDate ? new Date(formData.assignedDate).toISOString() : null,
                expectedReturnDate: formData.expectedReturnDate ? new Date(formData.expectedReturnDate).toISOString() : null,
                notes: formData.notes,
                quantity: formData.quantity,
            };
            await api_1.default.post(`/assets/${asset.id}/assign`, payload);
            onSuccess();
            onClose();
        }
        catch (error) {
            console.error('Failed to assign asset', error);
        }
        finally {
            setLoading(false);
        }
    };
    const handleUnassign = async () => {
        if (!confirm('Are you sure you want to unassign this asset?'))
            return;
        setLoading(true);
        try {
            const payload = {
                assignedToId: null,
                assignedDate: null,
                expectedReturnDate: null,
            };
            await api_1.default.patch(`/assets/${asset.id}`, payload);
            onSuccess();
            onClose();
        }
        catch (error) {
            console.error('Failed to unassign asset', error);
        }
        finally {
            setLoading(false);
        }
    };
    if (!asset)
        return null;
    return (<Modal_1.Modal isOpen={isOpen} onClose={onClose} title="Assign Asset" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
          <h4 className="font-semibold text-slate-900 dark:text-white">{asset.name}</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">SN: {asset.serialNumber || 'N/A'}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assign To (Employee)</label>
          <div className="relative">
            <lucide_react_1.User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/>
            <select required className="pl-9 block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={formData.assignedToId} onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}>
              <option value="">Select Employee...</option>
              {employees.map(emp => (<option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Quantity to Assign (Max: {asset.quantity})</label>
          <input type="number" min="1" max={asset.quantity} required className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}/>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assignment Date</label>
            <div className="relative">
              <lucide_react_1.Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/>
              <input type="date" required className="pl-9 block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={formData.assignedDate} onChange={(e) => setFormData({ ...formData, assignedDate: e.target.value })}/>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Expected Return</label>
            <div className="relative">
              <lucide_react_1.Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/>
              <input type="date" className="pl-9 block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={formData.expectedReturnDate} onChange={(e) => setFormData({ ...formData, expectedReturnDate: e.target.value })}/>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label>
          <div className="relative">
            <lucide_react_1.FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400"/>
            <textarea rows={3} className="pl-9 block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Condition notes, specific instructions, etc."/>
          </div>
        </div>

        <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
          {asset.assignedToId ? (<button type="button" onClick={handleUnassign} disabled={loading} className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors">
              Unassign Asset
            </button>) : (<div></div>)}
          <div className="flex gap-3">
            <Modal_1.ModalActionButton kind="cancel" onClick={onClose}>
              Cancel
            </Modal_1.ModalActionButton>
            <Modal_1.ModalActionButton kind="submit" type="submit" disabled={loading}>
              {loading ? 'Assigning...' : 'Assign Asset'}
            </Modal_1.ModalActionButton>
          </div>
        </div>
      </form>
    </Modal_1.Modal>);
}
