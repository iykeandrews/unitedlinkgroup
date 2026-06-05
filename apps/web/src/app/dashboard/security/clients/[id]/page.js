"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ClientDetailsPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const lucide_react_1 = require("lucide-react");
const sonner_1 = require("sonner");
const api_1 = __importDefault(require("../../../../../lib/api"));
const InvoiceList_1 = __importDefault(require("../../../../../components/invoices/InvoiceList"));
const AddressAutocomplete_1 = __importDefault(require("../../../../../components/ui/AddressAutocomplete"));
function ClientDetailsPage() {
    const router = (0, navigation_1.useRouter)();
    const params = (0, navigation_1.useParams)();
    const { id } = params;
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [activeTab, setActiveTab] = (0, react_1.useState)('profile');
    const [client, setClient] = (0, react_1.useState)(null);
    const [locations, setLocations] = (0, react_1.useState)([]);
    // Location Filter State
    const [locationSearchQuery, setLocationSearchQuery] = (0, react_1.useState)('');
    const [locationStatusFilter, setLocationStatusFilter] = (0, react_1.useState)('ALL');
    const [isLocationFilterOpen, setIsLocationFilterOpen] = (0, react_1.useState)(false);
    const filteredLocations = locations.filter(loc => {
        var _a, _b, _c;
        const matchesSearch = ((_a = loc.name) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(locationSearchQuery.toLowerCase())) ||
            ((_b = loc.code) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(locationSearchQuery.toLowerCase())) ||
            ((_c = loc.address) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes(locationSearchQuery.toLowerCase()));
        const matchesStatus = locationStatusFilter === 'ALL' || loc.status === locationStatusFilter;
        return matchesSearch && matchesStatus;
    });
    // Form State
    const [formData, setFormData] = (0, react_1.useState)({
        name: '',
        type: 'CORPORATE',
        industry: '',
        status: 'ACTIVE',
        address: '',
        street: '',
        city: '',
        state: '',
        zip: '',
        country: '',
        contactPerson: '',
        email: '',
        phone: '',
        alternateContact: '',
        billingAddressSameAsOffice: true,
        billingAddress: '',
        billingContactEmail: '',
        billingContactEmail2: '',
        billingContactEmail3: '',
        paymentTerms: '',
    });
    const fetchClient = (0, react_1.useCallback)(async (updateForm = true) => {
        var _a;
        try {
            const res = await api_1.default.get(`/clients/${id}`);
            setClient(res.data);
            if (updateForm) {
                setFormData({
                    name: res.data.name || '',
                    type: res.data.type || 'CORPORATE',
                    industry: res.data.industry || '',
                    status: res.data.status || 'ACTIVE',
                    address: res.data.address || '',
                    street: res.data.street || '',
                    city: res.data.city || '',
                    state: res.data.state || '',
                    zip: res.data.zip || '',
                    country: res.data.country || 'USA',
                    contactPerson: res.data.contactPerson || '',
                    email: res.data.email || '',
                    phone: res.data.phone || '',
                    alternateContact: res.data.alternateContact || '',
                    billingAddressSameAsOffice: (_a = res.data.billingAddressSameAsOffice) !== null && _a !== void 0 ? _a : true,
                    billingAddress: res.data.billingAddress || '',
                    billingContactEmail: res.data.billingContactEmail || '',
                    billingContactEmail2: res.data.billingContactEmail2 || '',
                    billingContactEmail3: res.data.billingContactEmail3 || '',
                    paymentTerms: res.data.paymentTerms || '',
                });
            }
            if (res.data.locations) {
                setLocations(res.data.locations);
            }
        }
        catch (error) {
            console.error('Failed to fetch client', error);
        }
        finally {
            setLoading(false);
        }
    }, [id]);
    (0, react_1.useEffect)(() => {
        fetchClient(true);
    }, [fetchClient]);
    (0, react_1.useEffect)(() => {
        const onFocus = () => {
            fetchClient(false);
        };
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [fetchClient]);
    const handleToggleStatus = async (locationId, currentStatus) => {
        var _a, _b;
        const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        // Optimistic update
        setLocations(prev => prev.map(loc => loc.id === locationId ? { ...loc, status: newStatus } : loc));
        try {
            await api_1.default.patch(`/locations/${locationId}`, { status: newStatus });
            sonner_1.toast.success(`Site marked as ${newStatus}`);
        }
        catch (error) {
            console.error('Failed to update location status', error);
            // Revert on error
            setLocations(prev => prev.map(loc => loc.id === locationId ? { ...loc, status: currentStatus } : loc));
            const errorMessage = ((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to update status';
            sonner_1.toast.error(errorMessage);
        }
    };
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    const handleCheckboxChange = (e) => {
        const { name, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: checked }));
    };
    const handleAddressSelect = (data) => {
        setFormData(prev => ({
            ...prev,
            street: data.street || data.address || '',
            city: data.city || '',
            state: data.state || '',
            zip: data.zip || '',
            country: data.country || 'USA'
        }));
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api_1.default.patch(`/clients/${id}`, formData);
            alert('Client updated successfully');
            fetchClient();
        }
        catch (error) {
            console.error('Failed to update client', error);
            alert('Failed to update client');
        }
    };
    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading client details...</div>;
    }
    if (!client) {
        return <div className="p-8 text-center text-slate-500">Client not found</div>;
    }
    return (<div className="py-8 px-4">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/dashboard/security/clients')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <lucide_react_1.ChevronLeft size={24} className="text-slate-600 dark:text-slate-400"/>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{client.name}</h1>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${client.status === 'ACTIVE'
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'}`}>
                {client.status}
              </span>
              <span>{client.type}</span>
              <span>•</span>
              <span>ID: {client.id.slice(0, 8)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button onClick={() => setActiveTab('profile')} className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'profile'
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            Client Profile
          </button>
          <button onClick={() => setActiveTab('locations')} className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'locations'
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            Locations / Sites
            <span className="ml-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-0.5 px-2 rounded-full text-xs">
              {locations.length}
            </span>
          </button>
          <button onClick={() => setActiveTab('invoices')} className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'invoices'
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            Invoices & Billing
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'profile' && (<form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
           {/* Section 1: Basic Info */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <lucide_react_1.Building size={20}/>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Client Profile</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Client / Business Name *</label>
              <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Client Type</label>
              <select name="type" value={formData.type} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="CORPORATE">Corporate</option>
                <option value="GOVERNMENT">Government</option>
                <option value="INDIVIDUAL">Individual</option>
                <option value="RESIDENTIAL">Residential</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Industry</label>
              <input type="text" name="industry" value={formData.industry} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
              <select name="status" value={formData.status} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="PROSPECT">Prospect</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Contact Info */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
              <lucide_react_1.Phone size={20}/>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Contact Details</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Primary Contact Person</label>
              <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Alternate Contact</label>
              <input type="text" name="alternateContact" value={formData.alternateContact} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>
          </div>
        </div>

        {/* Section 3: Office Address */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
              <lucide_react_1.MapPin size={20}/>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Office Address</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Street Address</label>
              <AddressAutocomplete_1.default value={formData.street} onChange={(val) => setFormData(prev => ({ ...prev, street: val }))} onSelect={handleAddressSelect} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">City</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">State</label>
              <input type="text" name="state" value={formData.state} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ZIP Code</label>
              <input type="text" name="zip" value={formData.zip} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Country</label>
              <input type="text" name="country" value={formData.country} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>
          </div>
        </div>

        {/* Section 4: Billing */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
              <lucide_react_1.CreditCard size={20}/>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Billing Information</h2>
          </div>

          <div className="mb-4">
             <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
               <input type="checkbox" name="billingAddressSameAsOffice" checked={formData.billingAddressSameAsOffice} onChange={handleCheckboxChange} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
               Billing address same as office address
             </label>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {!formData.billingAddressSameAsOffice && (<div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Billing Address</label>
                <textarea name="billingAddress" value={formData.billingAddress} onChange={handleChange} rows={2} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
              </div>)}
            
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Billing Email (Primary)</label>
              <input type="email" name="billingContactEmail" value={formData.billingContactEmail} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Billing Email 2 (CC)</label>
              <input type="email" name="billingContactEmail2" value={formData.billingContactEmail2} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Billing Email 3 (CC)</label>
              <input type="email" name="billingContactEmail3" value={formData.billingContactEmail3} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Payment Terms</label>
              <select name="paymentTerms" value={formData.paymentTerms} onChange={handleChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 60">Net 60</option>
                <option value="Due on Receipt">Due on Receipt</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            <lucide_react_1.Save size={20}/>
            Save Changes
          </button>
        </div>
        </form>)}

      {activeTab === 'locations' && (<div className="space-y-6">
           <div className="flex justify-between items-center">
             <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Client Sites</h3>
             <button onClick={() => router.push(`/dashboard/security/sites/new?clientId=${id}&clientName=${encodeURIComponent(client.name)}`)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm">
               <lucide_react_1.Plus size={16}/>
               Add Site
             </button>
           </div>

           {/* Search & Filters */}
           <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex gap-4">
                <div className="relative flex-1 max-w-md">
                  <lucide_react_1.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                  <input type="text" placeholder="Search sites..." value={locationSearchQuery} onChange={(e) => setLocationSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
                <button onClick={() => setIsLocationFilterOpen(!isLocationFilterOpen)} className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${isLocationFilterOpen
                ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                  <lucide_react_1.Filter size={20}/>
                  Filters
                </button>
              </div>

              {isLocationFilterOpen && (<div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-6">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                      <select value={locationStatusFilter} onChange={(e) => setLocationStatusFilter(e.target.value)} className="block w-48 px-3 py-2 text-sm border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md bg-slate-50 dark:bg-slate-900">
                        <option value="ALL">All Statuses</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </select>
                    </div>
                    
                    {(locationStatusFilter !== 'ALL') && (<button onClick={() => setLocationStatusFilter('ALL')} className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 mt-6">
                        <lucide_react_1.X size={16}/>
                        Clear Filters
                      </button>)}
                  </div>
                </div>)}
           </div>
           
           {locations.length === 0 ? (<div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
               <lucide_react_1.MapPin size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4"/>
               <p className="text-slate-500 dark:text-slate-400">No sites added for this client yet.</p>
               <button onClick={() => router.push(`/dashboard/security/sites/new?clientId=${id}&clientName=${encodeURIComponent(client.name)}`)} className="mt-4 text-blue-600 dark:text-blue-400 hover:underline font-medium">
                 Create first site
               </button>
             </div>) : filteredLocations.length === 0 ? (<div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
                <p className="text-slate-500 dark:text-slate-400">No sites found matching your filters.</p>
             </div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLocations.map((loc) => {
                    var _a;
                    return (<div key={loc.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                          <lucide_react_1.MapPin size={18} className="text-slate-600 dark:text-slate-300"/>
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white">{loc.name}</h4>
                          <p className="text-xs text-slate-500">{loc.code || 'No Code'}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <button onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(loc.id, loc.status);
                        }} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${loc.status === 'ACTIVE' ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-600'}`}>
                          <span className={`${loc.status === 'ACTIVE' ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}/>
                        </button>
                        <span className="text-[10px] font-medium text-slate-500 uppercase">
                          {loc.status}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-2 min-h-[40px]">
                      {loc.address}
                    </p>
                    
                    <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-700">
                      <div className="text-xs text-slate-500">
                        {((_a = loc.servicePins) === null || _a === void 0 ? void 0 : _a.length) || 0} Service Pins
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => router.push(`/dashboard/security/sites/${loc.id}`)} className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm flex items-center gap-1">
                          View <lucide_react_1.ExternalLink size={14}/>
                        </button>
                        <button onClick={() => router.push(`/dashboard/security/sites/${loc.id}`)} className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center gap-1">
                          Edit <lucide_react_1.Edit size={14}/>
                        </button>
                      </div>
                    </div>
                  </div>);
                })}
             </div>)}
        </div>)}

      {activeTab === 'invoices' && (<InvoiceList_1.default clientId={id} client={client}/>)}
    </div>);
}
