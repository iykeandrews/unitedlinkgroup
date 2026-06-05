"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddTeamMemberModal = AddTeamMemberModal;
const react_1 = require("react");
const Modal_1 = require("./Modal");
const lucide_react_1 = require("lucide-react");
const sonner_1 = require("sonner");
const api_1 = __importDefault(require("../lib/api"));
const AddressAutocomplete_1 = __importDefault(require("./ui/AddressAutocomplete"));
function AddTeamMemberModal({ isOpen, onClose, onSuccess }) {
    const [formData, setFormData] = (0, react_1.useState)({
        firstName: '',
        lastName: '',
        mobile: '',
        email: '',
        role: 'EMPLOYEE',
        workerType: 'W2',
        type: 'ONBOARDING',
        payType: 'HOURLY',
        departmentId: '',
        ssn: '',
        contractorBusinessName: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        country: '',
        taxState: '',
        overtimeEligible: true
    });
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)('');
    const [departments, setDepartments] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
        if (!isOpen)
            return;
        const fetchDepartments = async () => {
            try {
                const res = await api_1.default.get('/departments', { params: { status: 'ACTIVE' } });
                const list = Array.isArray(res.data) ? res.data : [];
                setDepartments(list.map((d) => ({ id: d.id, name: d.name })));
            }
            catch {
                setDepartments([]);
            }
        };
        fetchDepartments();
    }, [isOpen]);
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            if (name !== 'role')
                return { ...prev, [name]: value };
            const nextRole = String(value || '').toUpperCase();
            const isEmployeeRole = nextRole === 'EMPLOYEE';
            const nextType = isEmployeeRole ? 'ONBOARDING' : (String(prev.type || '').toUpperCase() === 'ONBOARDING' ? 'FULL_TIME' : prev.type);
            return { ...prev, role: value, type: nextType };
        });
    };
    const handleSubmit = async () => {
        var _a, _b;
        try {
            setLoading(true);
            setError('');
            // Validate required fields
            if (!formData.firstName || !formData.lastName || !formData.email) {
                setError('Please fill in all required fields');
                setLoading(false);
                return;
            }
            if (formData.workerType === 'W2' && !formData.ssn) {
                setError('SSN is required for W-2 employees');
                setLoading(false);
                return;
            }
            await api_1.default.post('/employees', {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.mobile,
                role: formData.role,
                workerType: formData.workerType,
                type: formData.type,
                payType: formData.payType,
                departmentId: formData.departmentId || undefined,
                ssn: formData.ssn,
                contractorBusinessName: formData.contractorBusinessName,
                status: 'ACTIVE',
                address: formData.address,
                city: formData.city,
                state: formData.state,
                zip: formData.zip,
                country: formData.country,
                taxState: formData.taxState,
                overtimeEligible: formData.overtimeEligible
            });
            onSuccess();
            onClose();
            sonner_1.toast.success('Team member added successfully');
            // Reset form
            setFormData({
                firstName: '',
                lastName: '',
                mobile: '',
                email: '',
                role: 'EMPLOYEE',
                workerType: 'W2',
                type: 'ONBOARDING',
                payType: 'HOURLY',
                departmentId: '',
                ssn: '',
                contractorBusinessName: '',
                address: '',
                city: '',
                state: '',
                zip: '',
                country: '',
                taxState: '',
                overtimeEligible: true
            });
        }
        catch (err) {
            const msg = ((_b = (_a = err.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to add team member';
            setError(msg);
            sonner_1.toast.error(msg);
        }
        finally {
            setLoading(false);
        }
    };
    return (<Modal_1.Modal isOpen={isOpen} onClose={onClose} title="Add Team member" maxWidth="max-w-5xl">
      <div className="space-y-6">
        {error && (<div className="p-3 bg-red-100 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>)}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column: Personal Details */}
          <div className="flex-1 space-y-6">
            <h4 className="font-bold text-gray-900 dark:text-white text-lg border-b pb-2 dark:border-slate-700">Personal details</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">First name</label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Please input" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-800 dark:text-white"/>
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Last name</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Please input" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-800 dark:text-white"/>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Home Address (for Tax calculation)</label>
                <AddressAutocomplete_1.default value={formData.address || ''} onChange={(val) => setFormData(prev => ({ ...prev, address: val }))} onSelect={(data) => {
            setFormData(prev => ({
                ...prev,
                address: data.street || data.address.split(',')[0],
                city: data.city || '',
                state: data.state || '',
                zip: data.zip || '',
                country: data.country || '',
                taxState: data.state || '' // Auto-detect tax state
            }));
        }} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-800 dark:text-white"/>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Mobile</label>
                <input type="tel" name="mobile" value={formData.mobile} onChange={handleChange} placeholder="Please input" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-800 dark:text-white"/>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Please input" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-800 dark:text-white"/>
              </div>
            </div>
          </div>

          {/* Right Column: Employment Details */}
          <div className="flex-1 space-y-6">
            <h4 className="font-bold text-gray-900 dark:text-white text-lg border-b pb-2 dark:border-slate-700">Employment Details</h4>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Access level</label>
                <div className="relative">
                  <select name="role" value={formData.role} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 appearance-none dark:bg-slate-800 dark:text-white">
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="BUSINESS_ADMIN">System Administrator</option>
                  </select>
                  <lucide_react_1.ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Department</label>
                <div className="relative">
                  <select name="departmentId" value={formData.departmentId} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 appearance-none dark:bg-slate-800 dark:text-white">
                    <option value="">No department</option>
                    {departments.map((d) => (<option key={d.id} value={d.id}>
                        {d.name}
                      </option>))}
                  </select>
                  <lucide_react_1.ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Worker Classification</label>
                <div className="relative">
                  <select name="workerType" value={formData.workerType} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 appearance-none dark:bg-slate-800 dark:text-white">
                    <option value="W2">W-2 Employee</option>
                    <option value="CONTRACTOR_1099">1099 Contractor</option>
                  </select>
                  <lucide_react_1.ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/>
                </div>
              </div>

              {formData.workerType === 'CONTRACTOR_1099' && (<div className="space-y-1">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Business Name</label>
                  <input type="text" name="contractorBusinessName" value={formData.contractorBusinessName} onChange={handleChange} placeholder="Business Name" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-800 dark:text-white"/>
                </div>)}

              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Employment Type</label>
                <div className="relative">
                  <select name="type" value={formData.type} onChange={handleChange} disabled={String(formData.role || '').toUpperCase() === 'EMPLOYEE'} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 appearance-none dark:bg-slate-800 dark:text-white">
                    <option value="ONBOARDING">Onboarding</option>
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="CONTRACTOR">Contractor</option>
                    <option value="TEMPORARY">Temporary</option>
                    <option value="SEASONAL">Seasonal</option>
                    <option value="INTERN">Intern</option>
                  </select>
                  <lucide_react_1.ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Pay Type</label>
                <div className="relative">
                  <select name="payType" value={formData.payType} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 appearance-none dark:bg-slate-800 dark:text-white">
                    <option value="HOURLY">Hourly</option>
                    <option value="SALARY">Salary</option>
                  </select>
                  <lucide_react_1.ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  {formData.workerType === 'W2' ? 'SSN / ITIN' : 'SSN / ITIN (Optional)'}
                  {formData.workerType === 'W2' && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input type="text" name="ssn" value={formData.ssn} onChange={handleChange} placeholder="XXX-XX-XXXX" className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-800 dark:text-white"/>
              </div>

              <div className="flex items-center h-full pt-2">
                <input type="checkbox" id="overtimeEligible" checked={formData.overtimeEligible} onChange={(e) => setFormData(prev => ({ ...prev, overtimeEligible: e.target.checked }))} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"/>
                <label htmlFor="overtimeEligible" className="ml-2 block text-sm text-gray-900 dark:text-white">
                  Eligible for Overtime
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-slate-700">
          <button onClick={handleSubmit} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? 'Adding...' : 'Add Team member'}
          </button>
        </div>
      </div>
    </Modal_1.Modal>);
}
