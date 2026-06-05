"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimesheetDetailsModal = TimesheetDetailsModal;
const react_1 = require("react");
const date_fns_1 = require("date-fns");
const localization_1 = require("../../lib/localization");
const lucide_react_1 = require("lucide-react");
const api_1 = __importDefault(require("../../lib/api"));
const sonner_1 = require("sonner");
function TimesheetDetailsModal({ isOpen, onClose, timesheet, locations, onUpdate, currencyCode = 'USD' }) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const [loading, setLoading] = (0, react_1.useState)(false);
    const safeCurrencyCode = currencyCode || 'USD';
    const [formData, setFormData] = (0, react_1.useState)({
        startTime: '',
        endTime: '',
        locationId: '',
        managerComments: '',
        status: '',
        breaks: []
    });
    const [showDeleteConfirm, setShowDeleteConfirm] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        var _a;
        if (timesheet) {
            setFormData({
                startTime: timesheet.startTime ? (0, date_fns_1.format)(new Date(timesheet.startTime), "yyyy-MM-dd'T'HH:mm") : '',
                endTime: timesheet.endTime ? (0, date_fns_1.format)(new Date(timesheet.endTime), "yyyy-MM-dd'T'HH:mm") : '',
                locationId: timesheet.locationId || '',
                managerComments: timesheet.employeeNote || '',
                status: timesheet.status,
                breaks: ((_a = timesheet.breaks) === null || _a === void 0 ? void 0 : _a.map((b) => ({
                    startTime: b.startTime ? (0, date_fns_1.format)(new Date(b.startTime), 'HH:mm') : '',
                    endTime: b.endTime ? (0, date_fns_1.format)(new Date(b.endTime), 'HH:mm') : '',
                    type: b.type || 'MEAL'
                }))) || []
            });
            setShowDeleteConfirm(false);
        }
    }, [timesheet]);
    // Dynamic Calculations
    const calculatedStats = (0, react_1.useMemo)(() => {
        var _a;
        if (!formData.startTime)
            return { duration: 0, pay: 0 };
        const start = new Date(formData.startTime);
        let end = new Date(); // Default to now if active
        if (formData.endTime) {
            end = new Date(formData.endTime);
        }
        else if (timesheet === null || timesheet === void 0 ? void 0 : timesheet.endTime) {
            end = new Date(timesheet.endTime);
        }
        let minutes = (0, date_fns_1.differenceInMinutes)(end, start);
        // Subtract breaks
        formData.breaks.forEach((b) => {
            if (b.startTime && b.endTime) {
                // Breaks are still time-only relative to the shift day for now, 
                // or we could upgrade them too. For now, we'll assume they are on the start day 
                // unless we want to make them full datetime too. 
                // Given the user asked for start/end time of SHIFT to be datetime, we'll keep breaks simple for now
                // but we need to map them to the shift's date to calculate duration correctly.
                // However, simply subtracting minutes is safer if we just look at duration.
                const [bStartH, bStartM] = b.startTime.split(':').map(Number);
                const [bEndH, bEndM] = b.endTime.split(':').map(Number);
                const breakStart = new Date(start); // Use shift start as base
                breakStart.setHours(bStartH, bStartM);
                const breakEnd = new Date(start); // Use shift start as base
                breakEnd.setHours(bEndH, bEndM);
                // Handle overnight breaks if needed
                if (breakEnd < breakStart)
                    breakEnd.setDate(breakEnd.getDate() + 1);
                minutes -= (0, date_fns_1.differenceInMinutes)(breakEnd, breakStart);
            }
        });
        const duration = Math.max(0, minutes / 60);
        const hourlyRate = ((_a = timesheet === null || timesheet === void 0 ? void 0 : timesheet.employee) === null || _a === void 0 ? void 0 : _a.hourlyRate) || 0;
        const pay = duration * hourlyRate;
        return { duration, pay };
    }, [formData, timesheet]);
    const handleAddBreak = () => {
        setFormData(prev => ({
            ...prev,
            breaks: [...prev.breaks, { startTime: '', endTime: '', type: 'MEAL' }]
        }));
    };
    const handleRemoveBreak = (index) => {
        setFormData(prev => ({
            ...prev,
            breaks: prev.breaks.filter((_, i) => i !== index)
        }));
    };
    const handleBreakChange = (index, field, value) => {
        setFormData(prev => {
            const newBreaks = [...prev.breaks];
            newBreaks[index] = { ...newBreaks[index], [field]: value };
            return { ...prev, breaks: newBreaks };
        });
    };
    const handleSave = async (statusOverride) => {
        var _a, _b;
        try {
            setLoading(true);
            const start = new Date(formData.startTime);
            let end = null;
            if (formData.endTime) {
                end = new Date(formData.endTime);
            }
            // Reconstruct breaks with full dates
            // Since breaks are time-only inputs in UI, we assume they occur relative to the shift start date
            // This logic might need refinement if shifts span multiple days and breaks are on the second day
            // But for now, we assume breaks are on the start date unless overnight logic kicks in
            const baseDate = new Date(start);
            const processedBreaks = formData.breaks
                .filter(b => b.startTime && b.endTime)
                .map(b => {
                const [bStartH, bStartM] = b.startTime.split(':').map(Number);
                const [bEndH, bEndM] = b.endTime.split(':').map(Number);
                const breakStart = new Date(baseDate);
                breakStart.setHours(bStartH, bStartM);
                const breakEnd = new Date(baseDate);
                breakEnd.setHours(bEndH, bEndM);
                if (breakEnd < breakStart)
                    breakEnd.setDate(breakEnd.getDate() + 1);
                return {
                    startTime: breakStart.toISOString(),
                    endTime: breakEnd.toISOString(),
                    type: b.type
                };
            });
            await api_1.default.patch(`/time-tracking/timesheets/${timesheet.id}`, {
                startTime: start.toISOString(),
                endTime: end ? end.toISOString() : null,
                locationId: formData.locationId,
                employeeNote: formData.managerComments,
                status: statusOverride || formData.status,
                breaks: processedBreaks
            });
            sonner_1.toast.success('Timesheet updated successfully');
            onUpdate();
            onClose();
        }
        catch (error) {
            console.error(error);
            const msg = ((_b = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to update timesheet';
            sonner_1.toast.error(msg);
        }
        finally {
            setLoading(false);
        }
    };
    const handleDelete = async () => {
        try {
            setLoading(true);
            await api_1.default.delete(`/time-tracking/timesheets/${timesheet.id}`);
            sonner_1.toast.success('Timesheet discarded successfully');
            onUpdate();
            onClose();
        }
        catch (error) {
            console.error(error);
            sonner_1.toast.error('Failed to discard timesheet');
        }
        finally {
            setLoading(false);
            setShowDeleteConfirm(false);
        }
    };
    const handleRestore = async () => {
        try {
            setLoading(true);
            await api_1.default.post(`/time-tracking/timesheets/${timesheet.id}/restore`);
            sonner_1.toast.success('Timesheet restored successfully');
            onUpdate();
            onClose();
        }
        catch (error) {
            console.error(error);
            sonner_1.toast.error('Failed to restore timesheet');
        }
        finally {
            setLoading(false);
        }
    };
    if (!isOpen || !timesheet)
        return null;
    const getStatusColor = (status) => {
        switch (status) {
            case 'APPROVED': return 'bg-green-100 text-green-800 border-green-200';
            case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };
    return (<>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity" onClick={onClose}/>

      {/* Confirmation Modal */}
      {showDeleteConfirm && (<div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100 dark:border-slate-700 transform scale-100 transition-all">
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                        <lucide_react_1.Trash2 className="w-6 h-6"/>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Discard Timesheet?</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Are you sure you want to discard this timesheet? This action cannot be undone.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 w-full mt-2">
                        <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl transition-all">
                            Cancel
                        </button>
                        <button onClick={handleDelete} disabled={loading} className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-600/20 transition-all">
                            {loading ? 'Discarding...' : 'Yes, Discard'}
                        </button>
                    </div>
                </div>
            </div>
        </div>)}

      {/* Wider Slide-over Panel (max-w-3xl for 2 columns) */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-3xl bg-white dark:bg-slate-900 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-700 dark:text-purple-300 text-sm font-bold">
                    {(_b = (_a = timesheet.employee) === null || _a === void 0 ? void 0 : _a.firstName) === null || _b === void 0 ? void 0 : _b[0]}{(_d = (_c = timesheet.employee) === null || _c === void 0 ? void 0 : _c.lastName) === null || _d === void 0 ? void 0 : _d[0]}
                </div>
                <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                        {(_e = timesheet.employee) === null || _e === void 0 ? void 0 : _e.firstName} {(_f = timesheet.employee) === null || _f === void 0 ? void 0 : _f.lastName}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide border ${getStatusColor(timesheet.status)}`}>
                            {timesheet.status.replace('_', ' ')}
                        </span>
                    </div>
                </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <lucide_react_1.X className="w-5 h-5"/>
            </button>
        </div>

        {/* Scrollable Content - 2 Columns */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* LEFT COLUMN */}
                <div className="space-y-6">
                    {/* Shift Details */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <lucide_react_1.Clock className="w-3 h-3"/> Shift Details
                        </h3>
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Start Time</label>
                                    <input type="datetime-local" className="w-full px-2.5 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}/>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">End Time</label>
                                    <input type="datetime-local" className="w-full px-2.5 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}/>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Area / Location</label>
                                <select className="w-full px-2.5 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all" value={formData.locationId} onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}>
                                    <option value="">Select Area</option>
                                    {locations.map((loc) => (<option key={loc.id} value={loc.id}>{loc.name}</option>))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Employee Note (Read Only) */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <lucide_react_1.User className="w-3 h-3"/> Employee Note
                        </h3>
                        <div className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 italic min-h-[60px]">
                            {timesheet.employeeNote || <span className="text-slate-400 not-italic">No note provided by employee.</span>}
                        </div>
                    </div>

                    {/* Metadata & IPs */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <lucide_react_1.ShieldAlert className="w-3 h-3"/> Metadata
                        </h3>
                        <div className="space-y-3">
                             <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50 dark:border-slate-800">
                                 <div className="flex items-center gap-2 text-slate-500">
                                     <lucide_react_1.Globe className="w-3 h-3"/> Clock In IP
                                 </div>
                                 <span className="font-mono text-slate-700 dark:text-slate-300">{timesheet.clockInIp || 'N/A'}</span>
                             </div>
                             <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50 dark:border-slate-800">
                                 <div className="flex items-center gap-2 text-slate-500">
                                     <lucide_react_1.Globe className="w-3 h-3"/> Clock Out IP
                                 </div>
                                 <span className="font-mono text-slate-700 dark:text-slate-300">{timesheet.clockOutIp || 'N/A'}</span>
                             </div>
                             <div className="flex items-start gap-2 text-xs pt-1">
                                 <lucide_react_1.Zap className="w-3 h-3 text-slate-500 mt-0.5"/>
                                 <div>
                                     <div className="text-slate-500 mb-0.5">Start Coordinates</div>
                                     <div className="font-mono text-slate-700 dark:text-slate-300">
                                         {((_g = timesheet.location) === null || _g === void 0 ? void 0 : _g.geoLat) && ((_h = timesheet.location) === null || _h === void 0 ? void 0 : _h.geoLng)
            ? `${timesheet.location.geoLat.toFixed(6)}, ${timesheet.location.geoLng.toFixed(6)}`
            : 'Not captured'}
                                     </div>
                                 </div>
                             </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-6">
                    {/* Breaks Section */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <lucide_react_1.Clock className="w-3 h-3"/> Breaks
                            </h3>
                            <button onClick={handleAddBreak} className="text-xs flex items-center gap-1 text-purple-600 font-medium hover:text-purple-700 px-2 py-1 rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                                <lucide_react_1.Plus className="w-3 h-3"/> Add Break
                            </button>
                        </div>
                        
                        <div className="space-y-3">
                            {formData.breaks.map((brk, idx) => (<div key={idx} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800 group">
                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                        <input type="time" className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:ring-1 focus:ring-purple-500" value={brk.startTime} onChange={(e) => handleBreakChange(idx, 'startTime', e.target.value)}/>
                                        <input type="time" className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:ring-1 focus:ring-purple-500" value={brk.endTime} onChange={(e) => handleBreakChange(idx, 'endTime', e.target.value)}/>
                                    </div>
                                    <button onClick={() => handleRemoveBreak(idx)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors opacity-0 group-hover:opacity-100">
                                        <lucide_react_1.Trash2 className="w-3.5 h-3.5"/>
                                    </button>
                                </div>))}
                            {formData.breaks.length === 0 && (<div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                                    No breaks recorded
                                </div>)}
                        </div>
                    </div>

                    {/* Manager Comments */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-64">
                         <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <lucide_react_1.MessageSquare className="w-3 h-3"/> Manager Comments
                        </h3>
                        <textarea className="flex-1 w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none transition-all" placeholder="Add your comments here..." value={formData.managerComments} onChange={(e) => setFormData({ ...formData, managerComments: e.target.value })}/>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between gap-6 max-w-3xl mx-auto">
                <div className="flex gap-6 items-center">
                     {timesheet.status !== 'DISCARDED' && (<button onClick={() => setShowDeleteConfirm(true)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors group relative" title="Discard Timesheet">
                            <lucide_react_1.Trash2 className="w-5 h-5"/>
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs font-bold text-white bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                Discard
                            </span>
                         </button>)}
                    <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Duration</div>
                        <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">{calculatedStats.duration.toFixed(2)}<span className="text-sm font-normal text-slate-500 ml-0.5">h</span></div>
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Earned</div>
                        <div className="text-xl font-bold text-green-600 dark:text-green-400 font-mono">
                            {(0, localization_1.formatCurrency)(calculatedStats.pay, safeCurrencyCode)}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {timesheet.status === 'DISCARDED' ? (<button onClick={handleRestore} disabled={loading} className="px-6 py-2.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm disabled:opacity-50 transition-all uppercase tracking-wide flex items-center gap-2">
                            <lucide_react_1.RefreshCw className="w-4 h-4"/>
                            Restore Timesheet
                        </button>) : (<>
                            {timesheet.status === 'APPROVED' ? (<button onClick={() => handleSave('PENDING')} className="px-6 py-2.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 hover:border-red-300 rounded-lg shadow-sm transition-all uppercase tracking-wide">
                                    Unapprove
                                </button>) : (<button onClick={() => handleSave('APPROVED')} className="px-6 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg shadow-sm transition-all uppercase tracking-wide">
                                    Approve
                                </button>)}
                            <button onClick={() => handleSave()} disabled={loading} className="px-6 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm disabled:opacity-50 transition-all uppercase tracking-wide">
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </>)}
                </div>
            </div>
        </div>

      </div>
    </>);
}
