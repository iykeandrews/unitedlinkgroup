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
exports.default = AssetDetailsModal;
const react_1 = __importStar(require("react"));
const Modal_1 = require("../Modal");
const api_1 = __importDefault(require("../../lib/api"));
const business_context_1 = require("../../context/business-context");
const localization_1 = require("../../lib/localization");
const lucide_react_1 = require("lucide-react");
function AssetDetailsModal({ isOpen, onClose, onAssign, onReturn, asset: initialAsset }) {
    var _a, _b;
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const [history, setHistory] = (0, react_1.useState)([]);
    const [assetDetails, setAssetDetails] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const fetchDetails = react_1.default.useCallback(async () => {
        try {
            setLoading(true);
            const [historyRes, assetRes] = await Promise.all([
                api_1.default.get(`/assets/${initialAsset.id}/history`),
                api_1.default.get(`/assets/${initialAsset.id}`)
            ]);
            setHistory(historyRes.data);
            setAssetDetails(assetRes.data);
        }
        catch (error) {
            console.error('Failed to fetch asset details', error);
        }
        finally {
            setLoading(false);
        }
    }, [initialAsset]);
    (0, react_1.useEffect)(() => {
        if (isOpen && initialAsset) {
            fetchDetails();
        }
    }, [isOpen, initialAsset, fetchDetails]);
    if (!initialAsset)
        return null;
    const displayAsset = assetDetails || initialAsset;
    return (<Modal_1.Modal isOpen={isOpen} onClose={onClose} title="Asset Details" maxWidth="max-w-4xl">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{displayAsset.name}</h3>
            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <lucide_react_1.Tag size={14}/>
                {displayAsset.type} {displayAsset.category ? `• ${displayAsset.category}` : ''}
              </span>
              {displayAsset.serialNumber && (<span className="flex items-center gap-1 font-mono bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-xs">
                  SN: {displayAsset.serialNumber}
                </span>)}
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium 
            ${displayAsset.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
            displayAsset.status === 'ASSIGNED' ? 'bg-purple-100 text-purple-800' :
                'bg-slate-100 text-slate-800'}`}>
            {displayAsset.status}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* General Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">
              General Information
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="block text-slate-500 dark:text-slate-400 text-xs">Location</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <lucide_react_1.MapPin size={14} className="text-slate-400"/>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {((_a = displayAsset.location) === null || _a === void 0 ? void 0 : _a.name) || 'Unassigned'}
                  </span>
                </div>
              </div>
              <div>
                <span className="block text-slate-500 dark:text-slate-400 text-xs">Quantity</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <lucide_react_1.Box size={14} className="text-slate-400"/>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {displayAsset.quantity}
                  </span>
                </div>
              </div>
              {displayAsset.purchaseDate && (<div>
                  <span className="block text-slate-500 dark:text-slate-400 text-xs">Purchase Date</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <lucide_react_1.Calendar size={14} className="text-slate-400"/>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {(0, localization_1.formatDate)(displayAsset.purchaseDate, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country)}
                    </span>
                  </div>
                </div>)}
              {displayAsset.purchaseCost && (<div>
                  <span className="block text-slate-500 dark:text-slate-400 text-xs">Cost</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <lucide_react_1.DollarSign size={14} className="text-slate-400"/>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {(0, localization_1.formatCurrency)(displayAsset.purchaseCost, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
                    </span>
                  </div>
                </div>)}
            </div>
            {displayAsset.description && (<div>
                <span className="block text-slate-500 dark:text-slate-400 text-xs mb-1">Description</span>
                <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700">
                  {displayAsset.description}
                </p>
              </div>)}
          </div>

          {/* Current Assignment */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-2">
              <h4 className="font-semibold text-slate-900 dark:text-white">
                Current Assignment
              </h4>
              {displayAsset.assignedTo ? (<button onClick={() => {
                onReturn(displayAsset);
            }} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/50 rounded-md text-sm transition-colors">
                  <lucide_react_1.RotateCcw size={14}/>
                  Return Asset
                </button>) : (<button onClick={() => {
                onAssign(displayAsset);
            }} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 rounded-md text-sm transition-colors">
                  <lucide_react_1.UserPlus size={14}/>
                  Assign Asset
                </button>)}
            </div>

            {/* Split/Child Assignments */}
            {displayAsset.children && displayAsset.children.length > 0 && (<div className="space-y-3 mb-4">
                <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300">Active Assignments ({displayAsset.children.length})</h5>
                <div className="space-y-3">
                  {displayAsset.children.map((child) => {
                var _a, _b;
                return (<div key={child.id} className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-100 dark:border-purple-800/30 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-300">
                          <lucide_react_1.User size={16}/>
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-white">
                            {(_a = child.assignedTo) === null || _a === void 0 ? void 0 : _a.firstName} {(_b = child.assignedTo) === null || _b === void 0 ? void 0 : _b.lastName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                             Qty: {child.quantity} • Assigned: {new Date(child.assignedDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button onClick={() => onReturn(child)} className="p-2 text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-full transition-colors" title="Return this item">
                        <lucide_react_1.RotateCcw size={16}/>
                      </button>
                    </div>);
            })}
                </div>
              </div>)}

            {displayAsset.assignedTo ? (<div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-800/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-300">
                    <lucide_react_1.User size={20}/>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {displayAsset.assignedTo.firstName} {displayAsset.assignedTo.lastName}
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-300">Currently Assigned</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Assigned Date</span>
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      {displayAsset.assignedDate ? (0, localization_1.formatDate)(displayAsset.assignedDate, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country) : '-'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Expected Return</span>
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      {displayAsset.expectedReturnDate ? (0, localization_1.formatDate)(displayAsset.expectedReturnDate, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country) : '-'}
                    </p>
                  </div>
                </div>
              </div>) : (!((_b = displayAsset.children) === null || _b === void 0 ? void 0 : _b.length) && (<div className="h-full flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6">
                  <lucide_react_1.Box size={32} className="mb-2 opacity-50"/>
                  <p className="text-sm">Not currently assigned</p>
                </div>))}
          </div>
        </div>

        {/* Assignment History */}
        <div className="pt-4">
          <h4 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <lucide_react_1.FileText size={18}/>
            Assignment History
          </h4>
          
          {loading ? (<div className="text-center py-8 text-slate-500">Loading history...</div>) : history.length === 0 ? (<div className="text-center py-8 text-slate-500 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              No assignment history found.
            </div>) : (<div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assigned</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Returned</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Condition</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Notes</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
                  {history.map((record) => (<tr key={record.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <lucide_react_1.User className="h-4 w-4 text-slate-400 mr-2"/>
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {record.employee.firstName} {record.employee.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                        {(0, localization_1.formatDate)(record.assignedDate, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.returnedDate ? (<span className="text-sm text-slate-500 dark:text-slate-400">
                            {(0, localization_1.formatDate)(record.returnedDate, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country)}
                          </span>) : (<span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            Current
                          </span>)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                        {record.returnCondition || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate" title={record.notes || ''}>
                        {record.notes || '-'}
                      </td>
                    </tr>))}
                </tbody>
              </table>
            </div>)}
        </div>
      </div>
    </Modal_1.Modal>);
}
