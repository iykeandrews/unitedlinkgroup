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
exports.default = CreatePatrolLogModal;
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const api_1 = __importDefault(require("../../lib/api"));
function CreatePatrolLogModal({ isOpen, onClose, onSuccess, servicePinId, servicePinName }) {
    const [formData, setFormData] = (0, react_1.useState)({
        message: '',
        type: 'CHECK',
        geoLat: undefined,
        geoLng: undefined,
        imageUrl: ''
    });
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [locating, setLocating] = (0, react_1.useState)(false);
    if (!isOpen)
        return null;
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api_1.default.post('/patrol-logs', {
                ...formData,
                servicePinId
            });
            onSuccess();
            onClose();
            // Reset form
            setFormData({
                message: '',
                type: 'CHECK',
                geoLat: undefined,
                geoLng: undefined,
                imageUrl: ''
            });
        }
        catch (error) {
            console.error('Failed to create patrol log', error);
            alert('Failed to create patrol log');
        }
        finally {
            setLoading(false);
        }
    };
    const handleGetCurrentLocation = () => {
        setLocating(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                setFormData(prev => ({
                    ...prev,
                    geoLat: position.coords.latitude,
                    geoLng: position.coords.longitude
                }));
                setLocating(false);
            }, (error) => {
                console.error('Error getting location', error);
                alert('Could not get current location');
                setLocating(false);
            });
        }
        else {
            alert('Geolocation is not supported by this browser.');
            setLocating(false);
        }
    };
    return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Add Patrol Log
            {servicePinName && <span className="block text-sm font-normal text-slate-500 mt-1">for {servicePinName}</span>}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <lucide_react_1.X size={20} className="text-slate-500"/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
            <select value={formData.type} onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="CHECK">Regular Check</option>
              <option value="INCIDENT">Incident Report</option>
              <option value="MAINTENANCE">Maintenance Issue</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Message</label>
            <textarea required value={formData.message} onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none" placeholder="Describe the situation..."/>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={handleGetCurrentLocation} disabled={locating} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
              {locating ? <lucide_react_1.Loader2 size={16} className="animate-spin"/> : <lucide_react_1.MapPin size={16}/>}
              {formData.geoLat ? 'Update Location' : 'Add Location'}
            </button>
            
            {formData.geoLat && (<span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle size={12}/>
                Location captured
              </span>)}
          </div>
          
          <div>
             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Image URL (Optional)</label>
             <div className="relative">
                <input type="text" value={formData.imageUrl} onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))} className="w-full pl-9 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="https://..."/>
                <lucide_react_1.Camera className="absolute left-3 top-2.5 text-slate-400" size={16}/>
             </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2">
              {loading && <lucide_react_1.Loader2 size={16} className="animate-spin"/>}
              Submit Log
            </button>
          </div>
        </form>
      </div>
    </div>);
}
function CheckCircle({ size, className }) {
    return (<svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>);
}
