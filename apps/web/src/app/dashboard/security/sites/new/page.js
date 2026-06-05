"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NewSitePage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const lucide_react_1 = require("lucide-react");
const api_1 = __importDefault(require("../../../../../lib/api"));
const AddressAutocomplete_1 = __importDefault(require("../../../../../components/ui/AddressAutocomplete"));
function NewSiteForm() {
    const router = (0, navigation_1.useRouter)();
    const searchParams = (0, navigation_1.useSearchParams)();
    const preSelectedClientId = searchParams.get('clientId');
    const preSelectedClientName = searchParams.get('clientName');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [clients, setClients] = (0, react_1.useState)([]);
    const [formData, setFormData] = (0, react_1.useState)({
        name: '',
        code: '',
        workOrder: '',
        startDate: '',
        endDate: '',
        clientId: preSelectedClientId || '',
        address: '',
        geoLat: '',
        geoLng: '',
        radius: 100,
        status: 'INACTIVE'
    });
    (0, react_1.useEffect)(() => {
        fetchClients();
    }, []);
    const fetchClients = async () => {
        try {
            const res = await api_1.default.get('/clients');
            setClients(res.data);
        }
        catch (error) {
            console.error('Failed to fetch clients', error);
        }
    };
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    const handleAddressSelect = (data) => {
        setFormData(prev => ({
            ...prev,
            address: data.address,
            geoLat: data.lat,
            geoLng: data.lon
        }));
    };
    const handleSubmit = async (e) => {
        var _a, _b;
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                geoLat: formData.geoLat ? parseFloat(formData.geoLat) : null,
                geoLng: formData.geoLng ? parseFloat(formData.geoLng) : null,
                radius: Number(formData.radius),
                startDate: formData.startDate || null,
                endDate: formData.endDate || null,
                workOrder: formData.workOrder || null,
            };
            await api_1.default.post('/locations', payload);
            if (preSelectedClientId) {
                router.push(`/dashboard/security/clients/${preSelectedClientId}`);
            }
            else {
                router.push('/dashboard/security/sites');
            }
        }
        catch (error) {
            console.error('Failed to create site', error);
            alert(((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to create site. Please try again.');
        }
        finally {
            setLoading(false);
        }
    };
    return (<div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
          <lucide_react_1.ChevronLeft size={24} className="text-slate-600 dark:text-slate-400"/>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Add New Site</h1>
          <p className="text-slate-500 dark:text-slate-400">Create a new security location.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Client Link */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <lucide_react_1.Building size={20}/>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Client Association</h2>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Client *</label>
            <select name="clientId" required value={formData.clientId} onChange={handleChange} disabled={!!preSelectedClientId} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60">
              <option value="">-- Select Client --</option>
              {clients.map(client => (<option key={client.id} value={client.id}>{client.name}</option>))}
            </select>
            {preSelectedClientId && (<p className="mt-1 text-xs text-slate-500">Linked to: {preSelectedClientName || 'Selected Client'}</p>)}
          </div>
        </div>

        {/* Section 2: Site Details */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
              <lucide_react_1.MapPin size={20}/>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Site Details</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Site Name *</label>
              <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Main HQ Entrance"/>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Site Code</label>
              <input type="text" name="code" value={formData.code} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. SITE-001"/>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Work Order <span className="text-slate-400 font-normal">(Optional)</span></label>
              <input type="text" name="workOrder" value={formData.workOrder} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. WO-2024-001"/>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
              <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Date</label>
              <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Initial Status</label>
              <select name="status" value={formData.status} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="INACTIVE">Inactive (Setup Mode)</option>
                <option value="ACTIVE" disabled>Active (Requires Service Pins)</option>
              </select>
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                You must add service pins before activating this site.
              </p>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address</label>
              <AddressAutocomplete_1.default value={formData.address} onChange={(val) => setFormData(prev => ({ ...prev, address: val }))} onSelect={handleAddressSelect} required className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Full address of the site"/>
            </div>
          </div>
        </div>

        {/* Section 3: Geo-Fencing */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
              <lucide_react_1.Navigation size={20}/>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Geo-Fencing</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Latitude</label>
              <input type="number" step="any" name="geoLat" value={formData.geoLat} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0.000000"/>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Longitude</label>
              <input type="number" step="any" name="geoLng" value={formData.geoLng} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="0.000000"/>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Radius (Meters)</label>
              <input type="number" name="radius" value={formData.radius} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>
          </div>
          <p className="mt-4 text-sm text-slate-500">
             Geo-coordinates are used for mobile clock-in verification. 
             If left blank, address geocoding will be attempted (feature coming soon).
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.back()} className="px-6 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">
            <lucide_react_1.Save size={20}/>
            {loading ? 'Creating...' : 'Create Site'}
          </button>
        </div>
      </form>
    </div>);
}
function NewSitePage() {
    return (<react_1.Suspense fallback={<div>Loading...</div>}>
            <NewSiteForm />
        </react_1.Suspense>);
}
