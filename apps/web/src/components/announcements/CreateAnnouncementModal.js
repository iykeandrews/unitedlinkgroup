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
exports.default = CreateAnnouncementModal;
const react_1 = require("react");
const react_2 = require("@headlessui/react");
const lucide_react_1 = require("lucide-react");
const api_1 = __importDefault(require("@/lib/api"));
const dynamic_1 = __importDefault(require("next/dynamic"));
require("react-quill-new/dist/quill.snow.css");
// Fix for React 18 strict mode + ReactQuill findDOMNode issue
const ReactQuill = (0, dynamic_1.default)(async () => {
    const { default: RQ } = await Promise.resolve().then(() => __importStar(require('react-quill-new')));
    const ForwardedReactQuill = ({ forwardedRef, ...props }) => <RQ ref={forwardedRef} {...props}/>;
    ForwardedReactQuill.displayName = 'ForwardedReactQuill';
    return ForwardedReactQuill;
}, { ssr: false });
function CreateAnnouncementModal({ isOpen, onClose, onSuccess, initialData }) {
    const [title, setTitle] = (0, react_1.useState)('');
    const [content, setContent] = (0, react_1.useState)('');
    const [priority, setPriority] = (0, react_1.useState)('NORMAL');
    const [targetType, setTargetType] = (0, react_1.useState)('ALL');
    const [targetValue, setTargetValue] = (0, react_1.useState)('');
    const [scheduledAt, setScheduledAt] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [departments, setDepartments] = (0, react_1.useState)([]);
    const [roles, setRoles] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        if (isOpen) {
            fetchMetadata();
            if (initialData) {
                setTitle(initialData.title);
                setContent(initialData.content);
                setPriority(initialData.priority);
                setTargetType(initialData.targetType);
                setTargetValue(initialData.targetValue || '');
                setScheduledAt(initialData.scheduledAt ? new Date(initialData.scheduledAt).toISOString().slice(0, 16) : '');
            }
            else {
                // Reset form
                setTitle('');
                setContent('');
                setPriority('NORMAL');
                setTargetType('ALL');
                setTargetValue('');
                setScheduledAt('');
            }
        }
    }, [isOpen, initialData]);
    const fetchMetadata = async () => {
        try {
            const [deptRes, roleRes] = await Promise.all([
                api_1.default.get('/departments'),
                api_1.default.get('/roles')
            ]);
            setDepartments(deptRes.data);
            setRoles(roleRes.data);
        }
        catch (error) {
            console.error('Failed to fetch metadata', error);
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                title,
                content,
                priority,
                targetType,
                targetValue: targetType === 'ALL' ? null : targetValue,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
                status: (initialData === null || initialData === void 0 ? void 0 : initialData.status) || 'PUBLISHED' // Preserve status or default to published
            };
            if (initialData) {
                await api_1.default.patch(`/announcements/${initialData.id}`, payload);
            }
            else {
                await api_1.default.post('/announcements', payload);
            }
            onSuccess();
            onClose();
            // Reset form
            setTitle('');
            setContent('');
            setPriority('NORMAL');
            setTargetType('ALL');
        }
        catch (error) {
            console.error('Failed to save announcement', error);
        }
        finally {
            setLoading(false);
        }
    };
    return (<react_2.Transition show={isOpen} as={react_1.Fragment}>
      <react_2.Dialog as="div" className="relative z-50" onClose={onClose}>
        <react_2.Transition.Child as={react_1.Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm"/>
        </react_2.Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <react_2.Transition.Child as={react_1.Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <react_2.Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-900 p-6 text-left align-middle shadow-xl transition-all border border-gray-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-6">
                  <react_2.Dialog.Title as="h3" className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <lucide_react_1.Megaphone className="w-5 h-5 text-indigo-500"/>
                    {initialData ? 'Edit Announcement' : 'New Announcement'}
                  </react_2.Dialog.Title>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                    <lucide_react_1.X className="w-5 h-5"/>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                    <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" placeholder="e.g., Office Closure for Holidays"/>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
                      <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                        <option value="NORMAL">Normal</option>
                        <option value="HIGH">High Importance</option>
                        <option value="URGENT">Urgent / Emergency</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Scheduled Date (Optional)</label>
                      <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"/>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Target Audience</label>
                      <select value={targetType} onChange={(e) => setTargetType(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                        <option value="ALL">All Staff</option>
                        <option value="DEPARTMENT">Specific Department</option>
                        <option value="ROLE">Specific Role</option>
                      </select>
                    </div>

                    {targetType === 'DEPARTMENT' && (<div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Department</label>
                        <select required value={targetValue} onChange={(e) => setTargetValue(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                          <option value="">Select Department...</option>
                          {departments.map(dept => (<option key={dept.id} value={dept.id}>{dept.name}</option>))}
                        </select>
                      </div>)}

                    {targetType === 'ROLE' && (<div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Role</label>
                        <select required value={targetValue} onChange={(e) => setTargetValue(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                          <option value="">Select Role...</option>
                          {roles.map(role => (<option key={role.id} value={role.id}>{role.name}</option>))}
                        </select>
                      </div>)}
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Content</label>
                    <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
                      <ReactQuill theme="snow" value={content} onChange={setContent} className="h-64 mb-12 text-gray-900 dark:text-white" modules={{
            toolbar: [
                [{ 'header': [1, 2, false] }],
                ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['link', 'clean']
            ],
        }}/>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading ? (<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>) : (<>
                          <lucide_react_1.Send className="w-4 h-4"/>
                          {initialData ? 'Update Announcement' : 'Publish Announcement'}
                        </>)}
                    </button>
                  </div>
                </form>
              </react_2.Dialog.Panel>
            </react_2.Transition.Child>
          </div>
        </div>
      </react_2.Dialog>
    </react_2.Transition>);
}
