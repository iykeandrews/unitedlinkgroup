"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SiteDetailsPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const lucide_react_1 = require("lucide-react");
const api_1 = __importDefault(require("../../../../../lib/api"));
const PatrolLogList_1 = __importDefault(require("../../../../../components/patrol-logs/PatrolLogList"));
const CreatePatrolLogModal_1 = __importDefault(require("../../../../../components/patrol-logs/CreatePatrolLogModal"));
const AddressAutocomplete_1 = __importDefault(require("../../../../../components/ui/AddressAutocomplete"));
function SiteDetailsPage() {
    const router = (0, navigation_1.useRouter)();
    const params = (0, navigation_1.useParams)();
    const { id } = params;
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [activeTab, setActiveTab] = (0, react_1.useState)('pins'); // Default to pins as that's the main task
    const [site, setSite] = (0, react_1.useState)(null);
    const [pins, setPins] = (0, react_1.useState)([]);
    // Site Form State
    const [siteFormData, setSiteFormData] = (0, react_1.useState)({
        name: '',
        code: '',
        workOrder: '',
        startDate: '',
        endDate: '',
        address: '',
        status: '',
        geoLat: '',
        geoLng: '',
        radius: 100,
        clientId: ''
    });
    // Pin Modal State
    const [isPinModalOpen, setIsPinModalOpen] = (0, react_1.useState)(false);
    const [editingPinId, setEditingPinId] = (0, react_1.useState)(null);
    const [pinFormData, setPinFormData] = (0, react_1.useState)({
        positionType: 'Security Officer',
        count: 1,
        shiftType: 'CUSTOM',
        startTime: '',
        endTime: '',
        days: 'Mon-Fri',
        payRate: '',
        specialInstructions: '',
        status: 'ACTIVE'
    });
    // Log Modal State
    const [isLogModalOpen, setIsLogModalOpen] = (0, react_1.useState)(false);
    const [selectedPinForLog, setSelectedPinForLog] = (0, react_1.useState)(null);
    const [logsRefreshTrigger, setLogsRefreshTrigger] = (0, react_1.useState)(0);
    (0, react_1.useEffect)(() => {
        fetchSite();
    }, [id]);
    const fetchSite = async () => {
        try {
            const res = await api_1.default.get(`/locations/${id}`);
            setSite(res.data);
            setSiteFormData({
                name: res.data.name || '',
                code: res.data.code || '',
                workOrder: res.data.workOrder || '',
                startDate: res.data.startDate ? res.data.startDate.split('T')[0] : '',
                endDate: res.data.endDate ? res.data.endDate.split('T')[0] : '',
                address: res.data.address || '',
                status: res.data.status || 'INACTIVE',
                geoLat: res.data.geoLat || '',
                geoLng: res.data.geoLng || '',
                radius: res.data.radius || 100,
                clientId: res.data.clientId || ''
            });
            if (res.data.servicePins) {
                setPins(res.data.servicePins);
            }
        }
        catch (error) {
            console.error('Failed to fetch site', error);
        }
        finally {
            setLoading(false);
        }
    };
    const handleSiteChange = (e) => {
        const { name, value } = e.target;
        setSiteFormData(prev => ({ ...prev, [name]: value }));
    };
    const handleAddressSelect = (data) => {
        setSiteFormData(prev => ({
            ...prev,
            address: data.address,
            geoLat: data.lat,
            geoLng: data.lon
        }));
    };
    const handleSiteSubmit = async (e) => {
        var _a, _b;
        e.preventDefault();
        try {
            const payload = {
                ...siteFormData,
                geoLat: siteFormData.geoLat ? parseFloat(String(siteFormData.geoLat)) : null,
                geoLng: siteFormData.geoLng ? parseFloat(String(siteFormData.geoLng)) : null,
                radius: Number(siteFormData.radius),
                startDate: siteFormData.startDate || null,
                endDate: siteFormData.endDate || null,
                workOrder: siteFormData.workOrder || null,
            };
            await api_1.default.patch(`/locations/${id}`, payload);
            alert('Site updated successfully');
            fetchSite();
        }
        catch (error) {
            console.error('Failed to update site', error);
            alert(((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to update site');
        }
    };
    // Log Functions
    const openLogModal = (pin) => {
        setSelectedPinForLog({ id: pin.id, name: pin.positionType });
        setIsLogModalOpen(true);
    };
    const handleLogSuccess = () => {
        setLogsRefreshTrigger(prev => prev + 1);
    };
    // Pin Functions
    const openAddPinModal = () => {
        setEditingPinId(null);
        setPinFormData({
            positionType: 'Security Officer',
            count: 1,
            shiftType: 'CUSTOM',
            startTime: '',
            endTime: '',
            days: 'Mon-Fri',
            payRate: '',
            specialInstructions: '',
            status: 'ACTIVE'
        });
        setIsPinModalOpen(true);
    };
    const openEditPinModal = (pin) => {
        setEditingPinId(pin.id);
        setPinFormData({
            positionType: pin.positionType,
            count: pin.count,
            shiftType: pin.shiftType,
            startTime: pin.startTime || '',
            endTime: pin.endTime || '',
            days: pin.days || '',
            payRate: pin.payRate || '',
            specialInstructions: pin.specialInstructions || '',
            status: pin.status
        });
        setIsPinModalOpen(true);
    };
    const handlePinChange = (e) => {
        const { name, value } = e.target;
        setPinFormData(prev => ({ ...prev, [name]: value }));
    };
    const handlePinSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...pinFormData,
                locationId: id,
                count: Number(pinFormData.count),
                payRate: pinFormData.payRate ? Number(pinFormData.payRate) : undefined
            };
            if (editingPinId) {
                await api_1.default.patch(`/service-pins/${editingPinId}`, payload);
            }
            else {
                await api_1.default.post('/service-pins', payload);
            }
            setIsPinModalOpen(false);
            fetchSite(); // Refresh to show new pin and update site status potential
        }
        catch (error) {
            console.error('Failed to save pin', error);
            alert('Failed to save service pin');
        }
    };
    const handleDeletePin = async (pinId) => {
        if (!confirm('Are you sure you want to delete this service pin?'))
            return;
        try {
            await api_1.default.delete(`/service-pins/${pinId}`);
            fetchSite();
        }
        catch (error) {
            console.error('Failed to delete pin', error);
            alert('Failed to delete pin');
        }
    };
    if (loading)
        return <div className="p-8 text-center text-slate-500">Loading site details...</div>;
    if (!site)
        return <div className="p-8 text-center text-slate-500">Site not found</div>;
    return (<div className="max-w-6xl mx-auto py-8 px-4 relative">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <lucide_react_1.ChevronLeft size={24} className="text-slate-600 dark:text-slate-400"/>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{site.name}</h1>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${site.status === 'ACTIVE'
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'}`}>
                {site.status}
              </span>
              <span>{site.code}</span>
              {site.client && (<>
                   <span>•</span>
                   <span className="flex items-center gap-1">
                     <lucide_react_1.Building size={12}/> {site.client.name}
                   </span>
                 </>)}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button onClick={() => setActiveTab('pins')} className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'pins'
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            Service Pins
            <span className="ml-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 py-0.5 px-2 rounded-full text-xs">
              {pins.length}
            </span>
          </button>
          <button onClick={() => setActiveTab('details')} className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'details'
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            Site Details & Geo-Fence
          </button>
          <button onClick={() => setActiveTab('logs')} className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'logs'
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            Patrol Logs
          </button>
        </nav>
      </div>

      {activeTab === 'details' && (<form onSubmit={handleSiteSubmit} className="space-y-6 max-w-4xl">
           <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Site Name</label>
                  <input type="text" name="name" required value={siteFormData.name} onChange={handleSiteChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"/>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Site Code</label>
                  <input type="text" name="code" value={siteFormData.code} onChange={handleSiteChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"/>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Work Order <span className="text-slate-400 font-normal">(Optional)</span></label>
                  <input type="text" name="workOrder" value={siteFormData.workOrder} onChange={handleSiteChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"/>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
                  <input type="date" name="startDate" value={siteFormData.startDate} onChange={handleSiteChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"/>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Date</label>
                  <input type="date" name="endDate" value={siteFormData.endDate} onChange={handleSiteChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"/>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select name="status" value={siteFormData.status} onChange={handleSiteChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                  {siteFormData.status === 'ACTIVE' && pins.filter(p => p.status === 'ACTIVE').length === 0 && (<p className="text-xs text-red-500 mt-1">Warning: Cannot activate without active service pins.</p>)}
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address</label>
                  <AddressAutocomplete_1.default value={siteFormData.address} onChange={(val) => setSiteFormData(prev => ({ ...prev, address: val }))} onSelect={handleAddressSelect} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"/>
                </div>
                
                <div className="col-span-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <h3 className="font-semibold mb-3">Geo-Fencing</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Latitude</label>
                  <input type="number" step="any" name="geoLat" value={siteFormData.geoLat} onChange={handleSiteChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"/>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Longitude</label>
                  <input type="number" step="any" name="geoLng" value={siteFormData.geoLng} onChange={handleSiteChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"/>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Radius (Meters)</label>
                  <input type="number" name="radius" value={siteFormData.radius} onChange={handleSiteChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"/>
                </div>
             </div>
           </div>
           
           <div className="flex justify-end">
             <button type="submit" className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
               <lucide_react_1.Save size={20}/>
               Save Details
             </button>
           </div>
        </form>)}

      {activeTab === 'pins' && (<div className="space-y-6">
           <div className="flex justify-between items-center">
             <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Active Service Pins</h3>
             <button onClick={openAddPinModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm">
               <lucide_react_1.Plus size={16}/>
               Add Service Pin
             </button>
           </div>

           {pins.length === 0 ? (<div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
               <lucide_react_1.Shield size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4"/>
               <p className="text-slate-500 dark:text-slate-400">No service pins defined. The site cannot be activated.</p>
               <button onClick={openAddPinModal} className="mt-4 text-blue-600 dark:text-blue-400 hover:underline font-medium">
                 Create first pin
               </button>
             </div>) : (<div className="grid grid-cols-1 gap-4">
                {pins.map((pin) => (<div key={pin.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4">
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400 h-fit">
                            <lucide_react_1.Shield size={24}/>
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                                <h4 className="font-bold text-slate-900 dark:text-white text-lg">{pin.positionType}</h4>
                                <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full font-medium">
                                    x{pin.count}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pin.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'}`}>
                                    {pin.status}
                                </span>
                            </div>
                            
                            <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-300">
                                <div className="flex items-center gap-1.5">
                                    <lucide_react_1.Clock size={16} className="text-slate-400"/>
                                    <span>{pin.shiftType}</span>
                                    {pin.startTime && pin.endTime && (<span className="text-slate-500">({pin.startTime} - {pin.endTime})</span>)}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-slate-500">Days:</span>
                                    <span>{pin.days || 'All Days'}</span>
                                </div>
                            </div>
                            
                            {pin.specialInstructions && (<p className="mt-2 text-sm text-slate-500 italic">
                                    &quot;{pin.specialInstructions}&quot;
                                </p>)}
                          </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                          <button onClick={() => openLogModal(pin)} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="Add Patrol Log">
                              <lucide_react_1.FileText size={18}/>
                          </button>
                          <button onClick={() => openEditPinModal(pin)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                              <lucide_react_1.Edit2 size={18}/>
                          </button>
                          <button onClick={() => handleDeletePin(pin.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                              <lucide_react_1.Trash2 size={18}/>
                          </button>
                      </div>
                    </div>
                  </div>))}
             </div>)}
        </div>)}

      {activeTab === 'logs' && (<div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Site Patrol Logs</h3>
            </div>
            <PatrolLogList_1.default locationId={id} refreshTrigger={logsRefreshTrigger}/>
        </div>)}

      {/* Pin Modal */}
      {isPinModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingPinId ? 'Edit Service Pin' : 'Add Service Pin'}
              </h3>
              <button onClick={() => setIsPinModalOpen(false)} className="text-slate-500 hover:text-slate-700">
                &times;
              </button>
            </div>
            
            <form onSubmit={handlePinSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Position Type</label>
                  <select name="positionType" value={pinFormData.positionType} onChange={handlePinChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <option value="Security Officer">Security Officer</option>
                    <option value="Armed SPO">Armed SPO</option>
                    <option value="Unarmed SPO">Unarmed SPO</option>
                    <option value="Patrol Officer">Patrol Officer</option>
                    <option value="Supervisor">Supervisor</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Quantity</label>
                        <input type="number" min="1" name="count" value={pinFormData.count} onChange={handlePinChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Shift Type</label>
                        <select name="shiftType" value={pinFormData.shiftType} onChange={handlePinChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                            <option value="CUSTOM">Custom Hours</option>
                            <option value="DAY">Day Shift</option>
                            <option value="NIGHT">Night Shift</option>
                            <option value="24_HOUR">24 Hour</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Time</label>
                        <input type="time" name="startTime" value={pinFormData.startTime} onChange={handlePinChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Time</label>
                        <input type="time" name="endTime" value={pinFormData.endTime} onChange={handlePinChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"/>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Days (e.g. Mon-Fri)</label>
                    <input type="text" name="days" value={pinFormData.days} onChange={handlePinChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg" placeholder="Mon,Tue,Wed,Thu,Fri"/>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Special Instructions</label>
                    <textarea name="specialInstructions" value={pinFormData.specialInstructions} onChange={handlePinChange} rows={2} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"/>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                    <select name="status" value={pinFormData.status} onChange={handlePinChange} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                    </select>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button type="button" onClick={() => setIsPinModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg">
                        Cancel
                    </button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg">
                        {editingPinId ? 'Update Pin' : 'Create Pin'}
                    </button>
                </div>
            </form>
          </div>
        </div>)}
      {/* Log Modal */}
      {selectedPinForLog && (<CreatePatrolLogModal_1.default isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} onSuccess={handleLogSuccess} servicePinId={selectedPinForLog.id} servicePinName={selectedPinForLog.name}/>)}
    </div>);
}
