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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StockAdjustmentModal;
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const inventory_context_1 = require("../../../context/inventory-context");
function StockAdjustmentModal({ isOpen, onClose, productId, variantId, currentStock, productName, variantName }) {
    if (!isOpen)
        return null;
    return (<StockAdjustmentModalInner onClose={onClose} productId={productId} variantId={variantId} currentStock={currentStock} productName={productName} variantName={variantName}/>);
}
function StockAdjustmentModalInner({ onClose, productId, variantId, currentStock, productName, variantName, }) {
    const { updateStock } = (0, inventory_context_1.useInventory)();
    const [adjustmentType, setAdjustmentType] = (0, react_1.useState)('set');
    const [adjustmentAmount, setAdjustmentAmount] = (0, react_1.useState)(0);
    const [setQuantity, setSetQuantity] = (0, react_1.useState)(currentStock);
    const [reason, setReason] = (0, react_1.useState)('Correction');
    const [note, setNote] = (0, react_1.useState)('');
    const finalQuantity = (0, react_1.useMemo)(() => {
        if (adjustmentType === 'set')
            return Math.max(0, setQuantity);
        if (adjustmentType === 'add')
            return Math.max(0, currentStock + adjustmentAmount);
        return Math.max(0, currentStock - adjustmentAmount);
    }, [adjustmentAmount, adjustmentType, currentStock, setQuantity]);
    const handleSave = () => {
        updateStock(productId, variantId, finalQuantity, reason, note);
        onClose();
    };
    return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Adjust Stock</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <lucide_react_1.X size={20} className="text-slate-500"/>
          </button>
        </div>

        <div className="mb-6">
            <div className="text-sm text-slate-500 mb-1">{productName}</div>
            <div className="font-medium text-slate-900 dark:text-white">{variantName}</div>
            <div className="mt-2 text-sm">
                Current Stock: <span className="font-bold">{currentStock}</span>
            </div>
        </div>

        <div className="space-y-4 mb-6">
            {/* Adjustment Type Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1 rounded-xl">
                {['set', 'add', 'subtract'].map(type => (<button key={type} onClick={() => setAdjustmentType(type)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${adjustmentType === type
                ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                        {type === 'set' ? 'Set Total' : type === 'add' ? 'Add (+)' : 'Remove (-)'}
                    </button>))}
            </div>

            {/* Quantity Input */}
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {adjustmentType === 'set' ? 'New Total Quantity' : 'Quantity to Adjust'}
                </label>
                <input type="number" min="0" value={adjustmentType === 'set' ? setQuantity : adjustmentAmount} onChange={(e) => {
            const val = parseInt(e.target.value) || 0;
            if (adjustmentType === 'set') {
                setSetQuantity(val);
            }
            else {
                setAdjustmentAmount(val);
            }
        }} className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            </div>

            {/* Projected Result */}
            {adjustmentType !== 'set' && (<div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700/50">
                    <span className="text-sm text-slate-500">New Stock Level:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{finalQuantity}</span>
                </div>)}

            {/* Reason */}
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Reason
                </label>
                <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="Correction">Inventory Correction</option>
                    <option value="Purchase">New Purchase / Shipment</option>
                    <option value="Return">Customer Return</option>
                    <option value="Damage">Damaged / Expired</option>
                    <option value="Theft">Theft / Loss</option>
                    <option value="Transfer">Transfer In/Out</option>
                </select>
            </div>

            {/* Note */}
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Note (Optional)
                </label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reference #, details..." rows={2} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"/>
            </div>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-lg shadow-indigo-600/20 flex items-center gap-2">
            <lucide_react_1.Save size={18}/>
            Save Adjustment
          </button>
        </div>
      </div>
    </div>);
}
