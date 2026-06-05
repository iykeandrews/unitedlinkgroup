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
exports.default = AssetModal;
const react_1 = __importStar(require("react"));
const Modal_1 = require("../Modal");
const api_1 = __importDefault(require("../../lib/api"));
const lucide_react_1 = require("lucide-react");
const ASSET_CATEGORIES = [
    { id: 'UNIFORMS', label: 'Uniforms', icon: lucide_react_1.Shirt },
    { id: 'WEAPONS', label: 'Weapons', icon: lucide_react_1.Shield },
    { id: 'PROTECTIVE_GEAR', label: 'Protective Equipment', icon: lucide_react_1.Shield },
    { id: 'COMM_DEVICES', label: 'Communication Devices', icon: lucide_react_1.Radio },
    { id: 'SURVEILLANCE', label: 'Surveillance & Gadgets', icon: lucide_react_1.Camera },
    { id: 'TRANSPORTATION', label: 'Transportation', icon: lucide_react_1.Car },
    { id: 'MISC', label: 'Misc. Security Equipment', icon: lucide_react_1.Box },
];
const UNIFORM_TYPES = [
    'Standard Security Officer Shirt (Short Sleeve)',
    'Standard Security Officer Shirt (Long Sleeve)',
    'Tactical Polo (Security-branded)',
    'Security Trousers',
    'High-Visibility Vest (DC-compliant)',
    'Jacket',
    'Rain Gear',
    'Security Cap / Headwear',
    'Duty Belt',
    'Footwear (Boots / Shoes)',
    'Name Badge',
    'Company Patch',
    'ID Holder',
];
const ASSET_COLORS = [
    'Black',
    'Navy Blue',
    'White',
    'Gray',
    'Green',
    'Red',
    'Yellow',
    'Orange',
    'Brown',
    'Tan',
    'Camouflage',
    'Silver',
    'Other'
];
const WEAPON_TYPES = [
    'Firearm (Pistol – licensed only)',
    'Baton (Expandable / Straight)',
    'Pepper Spray / OC Spray',
    'Handcuffs',
    'Taser',
];
const EQUIPMENT_TYPES = [
    'Two-way radio',
    'Body camera',
    'Flashlight',
    'Metal detector (handheld)',
    'CCTV Camera',
    'GPS Tracker',
    'Mobile phone / Tablet',
    'Alarm System',
    'First Aid Kit',
];
function AssetModal({ isOpen, onClose, onSuccess, initialData }) {
    var _a;
    const [step, setStep] = (0, react_1.useState)(1);
    const [category, setCategory] = (0, react_1.useState)('');
    const [formData, setFormData] = (0, react_1.useState)({
        name: '',
        category: '',
        type: '',
        brand: '',
        model: '',
        serialNumber: '',
        size: '',
        color: '',
        condition: 'NEW',
        vendor: '',
        quantity: 1,
        licenseNumber: '',
        complianceChecked: false,
        status: 'ACTIVE',
        purchaseDate: '',
        purchaseCost: '',
        warrantyExpiration: '',
        locationId: '',
        assignedToId: '',
        assignedDate: '',
        expectedReturnDate: '',
        notes: '',
        description: '',
    });
    const [locations, setLocations] = (0, react_1.useState)([]);
    const [employees, setEmployees] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        fetchLocations();
        fetchEmployees();
    }, []);
    (0, react_1.useEffect)(() => {
        if (initialData) {
            setStep(2);
            setCategory(initialData.category || 'MISC');
            setFormData({
                name: initialData.name || '',
                category: initialData.category || 'MISC',
                type: initialData.type || '',
                brand: initialData.brand || '',
                model: initialData.model || '',
                serialNumber: initialData.serialNumber || '',
                size: initialData.size || '',
                color: initialData.color || '',
                condition: initialData.condition || 'GOOD',
                vendor: initialData.vendor || '',
                quantity: initialData.quantity || 1,
                licenseNumber: initialData.licenseNumber || '',
                complianceChecked: initialData.complianceChecked || false,
                status: initialData.status || 'ACTIVE',
                purchaseDate: initialData.purchaseDate ? new Date(initialData.purchaseDate).toISOString().split('T')[0] : '',
                purchaseCost: initialData.purchaseCost || '',
                warrantyExpiration: initialData.warrantyExpiration ? new Date(initialData.warrantyExpiration).toISOString().split('T')[0] : '',
                locationId: initialData.locationId || '',
                assignedToId: initialData.assignedToId || '',
                assignedDate: initialData.assignedDate ? new Date(initialData.assignedDate).toISOString().split('T')[0] : '',
                expectedReturnDate: initialData.expectedReturnDate ? new Date(initialData.expectedReturnDate).toISOString().split('T')[0] : '',
                notes: initialData.notes || '',
                description: initialData.description || '',
            });
        }
        else {
            setStep(1);
            setCategory('');
            setFormData({
                name: '',
                category: '',
                type: '',
                brand: '',
                model: '',
                serialNumber: '',
                size: '',
                color: '',
                condition: 'NEW',
                vendor: '',
                quantity: 1,
                licenseNumber: '',
                complianceChecked: false,
                status: 'ACTIVE',
                purchaseDate: '',
                purchaseCost: '',
                warrantyExpiration: '',
                locationId: '',
                assignedToId: '',
                assignedDate: '',
                expectedReturnDate: '',
                notes: '',
                description: '',
            });
        }
    }, [initialData, isOpen]);
    const fetchLocations = async () => {
        try {
            const res = await api_1.default.get('/locations');
            setLocations(res.data);
        }
        catch (error) {
            console.error('Failed to fetch locations', error);
        }
    };
    const fetchEmployees = async () => {
        try {
            const res = await api_1.default.get('/employees');
            setEmployees(res.data);
        }
        catch (error) {
            console.error('Failed to fetch employees', error);
        }
    };
    const handleCategorySelect = (catId) => {
        setCategory(catId);
        setFormData(prev => ({ ...prev, category: catId }));
        setStep(2);
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate).toISOString() : undefined,
                purchaseCost: formData.purchaseCost ? parseFloat(formData.purchaseCost.toString()) : undefined,
                warrantyExpiration: formData.warrantyExpiration ? new Date(formData.warrantyExpiration).toISOString() : undefined,
                assignedDate: formData.assignedDate ? new Date(formData.assignedDate).toISOString() : undefined,
                expectedReturnDate: formData.expectedReturnDate ? new Date(formData.expectedReturnDate).toISOString() : undefined,
                quantity: parseInt(formData.quantity.toString()) || 1,
                // Ensure empty strings are converted to undefined for optional relationships
                locationId: formData.locationId || undefined,
                assignedToId: formData.assignedToId || undefined,
            };
            if (initialData) {
                await api_1.default.patch(`/assets/${initialData.id}`, payload);
            }
            else {
                await api_1.default.post('/assets', payload);
            }
            onSuccess();
            onClose();
        }
        catch (error) {
            console.error('Failed to save asset', error);
        }
        finally {
            setLoading(false);
        }
    };
    const renderCategorySelection = () => (<div className="grid grid-cols-2 gap-4">
      {ASSET_CATEGORIES.map((cat) => (<button key={cat.id} type="button" onClick={() => handleCategorySelect(cat.id)} className="flex flex-col items-center justify-center p-6 border-2 border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700/50 transition-all group">
          <cat.icon className="h-8 w-8 text-slate-500 dark:text-slate-400 group-hover:text-blue-500 mb-3"/>
          <span className="font-medium text-slate-700 dark:text-slate-200 text-center">{cat.label}</span>
        </button>))}
    </div>);
    const renderUniformFields = () => (<div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 mb-4">
        <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">DC Security Uniform Compliance</h4>
        <p className="text-xs text-blue-600 dark:text-blue-400">Ensure all uniform items meet District of Columbia private security regulations regarding badges, patches, and visibility.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Uniform Type</label>
          <select className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value, name: e.target.value })} required>
            <option value="">Select Item...</option>
            {UNIFORM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Size</label>
          <select className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={formData.size} onChange={(e) => setFormData({ ...formData, size: e.target.value })}>
            <option value="">Select Size...</option>
            {['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', 'One Size'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Color</label>
          <select className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })}>
            <option value="">Select Color...</option>
            {ASSET_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Quantity</label>
          <input type="number" min="1" className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}/>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Condition</label>
          <select className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={formData.condition} onChange={(e) => setFormData({ ...formData, condition: e.target.value })}>
            <option value="NEW">New</option>
            <option value="GOOD">Good</option>
            <option value="FAIR">Fair</option>
            <option value="DAMAGED">Damaged</option>
          </select>
        </div>
      </div>
    </div>);
    const renderWeaponFields = () => (<div className="space-y-4">
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-800 mb-4 flex items-start gap-3">
        <lucide_react_1.AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5"/>
        <div>
          <h4 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">Strict Compliance Warning</h4>
          <p className="text-xs text-red-600 dark:text-red-400">
            Weapons must be registered and compliant with Washington, DC firearm and security regulations. 
            Ensure serial numbers are accurate and permits are active.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Weapon Type</label>
          <select className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value, name: e.target.value })} required>
            <option value="">Select Weapon...</option>
            {WEAPON_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Make / Brand</label>
          <input type="text" className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} placeholder="e.g. Glock, Smith & Wesson"/>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Model</label>
          <input type="text" className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} placeholder="e.g. 19 Gen 5"/>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Serial Number <span className="text-red-500">*</span></label>
          <div className="relative">
            <lucide_react_1.Hash className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/>
            <input type="text" required className="pl-9 block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white uppercase" value={formData.serialNumber} onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })} placeholder="Unique Serial Number"/>
          </div>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">DC License / Permit Reference</label>
          <input type="text" className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={formData.licenseNumber} onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })} placeholder="Permit # or Reference ID"/>
        </div>

        <div className="col-span-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={formData.complianceChecked} onChange={(e) => setFormData({ ...formData, complianceChecked: e.target.checked })} required/>
            <span className="text-sm text-slate-700 dark:text-slate-300">
              I certify this weapon is compliant with DC regulations and company policy.
            </span>
          </label>
        </div>
      </div>
    </div>);
    const renderEquipmentFields = () => (<div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Equipment Type</label>
          <select className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value, name: e.target.value })}>
            <option value="">Select Equipment...</option>
            {EQUIPMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Brand</label>
          <input type="text" className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })}/>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Model</label>
          <input type="text" className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })}/>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Serial Number</label>
          <input type="text" className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={formData.serialNumber} onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}/>
        </div>
      </div>
    </div>);
    const renderCommonFields = () => (<div className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-700">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Purchase & Assignment Details</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Vendor / Supplier</label>
          <input type="text" className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={formData.vendor} onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}/>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Purchase Date</label>
          <input type="date" className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={formData.purchaseDate} onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}/>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cost (Per Unit)</label>
          <div className="relative">
            <lucide_react_1.DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/>
            <input type="number" step="0.01" className="pl-9 block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white" value={formData.purchaseCost} onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}/>
          </div>
        </div>
      </div>
    </div>);
    return (<Modal_1.Modal isOpen={isOpen} onClose={onClose} title={step === 1 ? 'Select Asset Category' : `Add ${((_a = ASSET_CATEGORIES.find(c => c.id === category)) === null || _a === void 0 ? void 0 : _a.label) || 'Asset'}`} maxWidth={step === 1 ? 'max-w-3xl' : 'max-w-2xl'}>
      {step === 1 ? (renderCategorySelection()) : (<form onSubmit={handleSubmit} className="space-y-6">
          <button type="button" onClick={() => setStep(1)} className="text-sm text-blue-600 hover:underline mb-2 flex items-center gap-1">
            ← Change Category
          </button>

          {/* Dynamic Fields Based on Category */}
          {category === 'UNIFORMS' && renderUniformFields()}
          {category === 'WEAPONS' && renderWeaponFields()}
          {['PROTECTIVE_GEAR', 'COMM_DEVICES', 'SURVEILLANCE', 'TRANSPORTATION', 'MISC'].includes(category) && renderEquipmentFields()}
          
          {/* Common Fields */}
          {renderCommonFields()}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Modal_1.ModalActionButton kind="cancel" onClick={onClose}>
              Cancel
            </Modal_1.ModalActionButton>
            <Modal_1.ModalActionButton kind="submit" type="submit" disabled={loading}>
              {loading ? 'Saving...' : (initialData ? 'Update Asset' : 'Save Asset')}
            </Modal_1.ModalActionButton>
          </div>
        </form>)}
    </Modal_1.Modal>);
}
