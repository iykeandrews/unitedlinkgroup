"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BusinessProfilePage;
const react_1 = require("react");
const business_context_1 = require("../../../../context/business-context");
const api_1 = __importDefault(require("../../../../lib/api"));
const sonner_1 = require("sonner");
const lucide_react_1 = require("lucide-react");
const currencies_1 = require("../../../../lib/currencies");
const countries_1 = require("../../../../lib/countries");
const localization_1 = require("../../../../lib/localization");
const ImageUpload_1 = __importDefault(require("../../../../components/ui/ImageUpload"));
function BusinessProfilePage() {
    const { selectedBusiness, setSelectedBusiness, refreshBusinesses } = (0, business_context_1.useBusiness)();
    const [form, setForm] = (0, react_1.useState)({
        name: '',
        ein: '',
        industry: '',
        businessType: '',
        employeeCount: '',
        currencyCode: 'USD',
        mobile: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        country: '',
        logoUrl: '',
        softwareName: ''
    });
    const [saving, setSaving] = (0, react_1.useState)(false);
    // Derived config for display
    const localizationConfig = (0, localization_1.getCountryConfig)(form.country);
    (0, react_1.useEffect)(() => {
        if (selectedBusiness) {
            let softwareName = '';
            try {
                if (selectedBusiness.settings) {
                    const s = JSON.parse(selectedBusiness.settings);
                    softwareName = s.softwareName || '';
                }
            }
            catch { }
            setForm({
                name: selectedBusiness.name || '',
                ein: selectedBusiness.ein || '',
                industry: selectedBusiness.industry || '',
                businessType: selectedBusiness.businessType || '',
                employeeCount: selectedBusiness.employeeCount || '',
                currencyCode: selectedBusiness.currencyCode || 'USD',
                mobile: selectedBusiness.mobile || '',
                address: selectedBusiness.address || '',
                city: selectedBusiness.city || '',
                state: selectedBusiness.state || '',
                zip: selectedBusiness.zip || '',
                country: selectedBusiness.country || '',
                logoUrl: selectedBusiness.logoUrl || '',
                softwareName
            });
        }
    }, [selectedBusiness]);
    const updateField = (key, value) => {
        setForm((prev) => {
            const newData = { ...prev, [key]: value };
            // Auto-update currency when country changes
            if (key === 'country') {
                const config = (0, localization_1.getCountryConfig)(value);
                newData.currencyCode = config.currencyCode;
            }
            return newData;
        });
        if (key === 'logoUrl' && selectedBusiness) {
            setSelectedBusiness({ ...selectedBusiness, logoUrl: value });
        }
    };
    const handleSave = async () => {
        var _a, _b;
        if (!selectedBusiness)
            return;
        try {
            setSaving(true);
            const sanitizedForm = Object.fromEntries(Object.entries(form).filter(([_, value]) => value !== ''));
            // Ensure required fields have defaults if needed (though UI prevents this mostly)
            if (!sanitizedForm.currencyCode)
                sanitizedForm.currencyCode = 'USD';
            const currentSettings = selectedBusiness.settings ? (() => { try {
                return JSON.parse(selectedBusiness.settings);
            }
            catch {
                return {};
            } })() : {};
            const nextSettings = { ...currentSettings, softwareName: sanitizedForm.softwareName || currentSettings.softwareName || '' };
            const payload = { ...sanitizedForm, settings: JSON.stringify(nextSettings) };
            await api_1.default.patch(`/businesses/${selectedBusiness.id}`, payload);
            const updated = { ...selectedBusiness, ...sanitizedForm, settings: JSON.stringify(nextSettings) };
            setSelectedBusiness(updated);
            await refreshBusinesses();
            if (nextSettings.softwareName) {
                try {
                    localStorage.setItem('app_software_name', nextSettings.softwareName);
                }
                catch { }
            }
            sonner_1.toast.success('Business profile updated successfully');
        }
        catch (e) {
            console.error(e);
            const message = ((_b = (_a = e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to update business profile';
            sonner_1.toast.error(message);
        }
        finally {
            setSaving(false);
        }
    };
    if (!selectedBusiness) {
        return (<div className="flex flex-col items-center justify-center h-96 text-slate-500">
        <lucide_react_1.Building2 className="w-12 h-12 mb-4 opacity-50"/>
        <p>Please select a business to manage its profile.</p>
      </div>);
    }
    return (<div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <lucide_react_1.Building2 className="w-7 h-7 text-blue-600"/>
            Business Profile
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 ml-9">
            Manage your company&apos;s identity, contact details, and regional settings.
          </p>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm font-medium">
          {saving ? (<>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
              Saving...
            </>) : (<>
              <lucide_react_1.Save className="w-4 h-4"/>
              Save Changes
            </>)}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Identity & Branding */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* Identity Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
                    <lucide_react_1.Briefcase className="w-5 h-5 text-slate-500"/>
                    <h2 className="font-semibold text-slate-900 dark:text-white">Company Identity</h2>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Software Name</label>
                        <input value={form.softwareName || ''} onChange={(e) => updateField('softwareName', e.target.value)} className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="e.g. Your SaaS Brand"/>
                        <p className="text-xs text-slate-500 mt-1">This appears as the application name in the header and login pages.</p>
                    </div>
                    <ImageUpload_1.default label="Company logo" value={form.logoUrl || ''} onChange={(url) => updateField('logoUrl', url)} accept="image/png" allowedMimeTypes={['image/png']} helpText="Upload a transparent PNG logo (max 10MB)."/>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Business Name</label>
                            <input value={form.name || ''} onChange={(e) => updateField('name', e.target.value)} className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"/>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Industry</label>
                            <input value={form.industry || ''} onChange={(e) => updateField('industry', e.target.value)} className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="e.g. Technology"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Business Type</label>
                            <input value={form.businessType || ''} onChange={(e) => updateField('businessType', e.target.value)} className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="e.g. LLC"/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Employee Count</label>
                            <select value={form.employeeCount || ''} onChange={(e) => updateField('employeeCount', e.target.value)} className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500">
                                <option value="">Select size...</option>
                                <option value="1-10">1-10 Employees</option>
                                <option value="11-50">11-50 Employees</option>
                                <option value="51-200">51-200 Employees</option>
                                <option value="201-500">201-500 Employees</option>
                                <option value="500+">500+ Employees</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Localization & Tax Settings */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
                    <lucide_react_1.Globe2 className="w-5 h-5 text-slate-500"/>
                    <h2 className="font-semibold text-slate-900 dark:text-white">Localization & Tax</h2>
                </div>
                <div className="p-6 space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-lg p-4 flex gap-3">
                        <lucide_react_1.AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5"/>
                        <div className="text-sm text-blue-800 dark:text-blue-200">
                            Changing your country will automatically update your currency, tax labels, and date formats across the entire application.
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2">
                             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Country of Operation</label>
                            <select value={form.country || ''} onChange={(e) => updateField('country', e.target.value)} className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500">
                                <option value="">Select Country...</option>
                                {countries_1.countries.map((c) => (<option key={c.code} value={c.name}>{c.name}</option>))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Currency</label>
                            <div className="mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-mono">
                                {localizationConfig.currencyCode} ({localizationConfig.currencySymbol})
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-500 dark:text-slate-400">Tax Authority Label</label>
                             <div className="mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">
                                {localizationConfig.taxLabel}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{localizationConfig.taxIdLabel}</label>
                            <input value={form.ein || ''} onChange={(e) => updateField('ein', e.target.value)} className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder={`Enter your ${localizationConfig.taxIdLabel}`}/>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
                    <lucide_react_1.MapPin className="w-5 h-5 text-slate-500"/>
                    <h2 className="font-semibold text-slate-900 dark:text-white">Contact & Location</h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Street Address</label>
                        <input value={form.address || ''} onChange={(e) => updateField('address', e.target.value)} className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">City</label>
                        <input value={form.city || ''} onChange={(e) => updateField('city', e.target.value)} className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">State / Province</label>
                        <input value={form.state || ''} onChange={(e) => updateField('state', e.target.value)} className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Postal / Zip Code</label>
                        <input value={form.zip || ''} onChange={(e) => updateField('zip', e.target.value)} className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</label>
                         <input value={form.mobile || ''} onChange={(e) => updateField('mobile', e.target.value)} className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"/>
                    </div>
                </div>
            </div>
        </div>

        {/* Right Column - Regional & Settings */}
        <div className="space-y-8">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden sticky top-8">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
                    <lucide_react_1.Globe className="w-5 h-5 text-slate-500"/>
                    <h2 className="font-semibold text-slate-900 dark:text-white">Regional & Legal</h2>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Employer ID (EIN)</label>
                        <input value={form.ein || ''} onChange={(e) => updateField('ein', e.target.value)} className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono" placeholder="XX-XXXXXXX"/>
                        <p className="text-xs text-slate-500 mt-1">Required for tax documents</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                             <lucide_react_1.CreditCard className="w-4 h-4 text-slate-400"/>
                            Default Currency
                        </label>
                        <select value={form.currencyCode || 'USD'} onChange={(e) => updateField('currencyCode', e.target.value)} className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500">
                            {currencies_1.currencies.map((currency) => (<option key={currency.code} value={currency.code}>
                                    {currency.code} - {currency.name}
                                </option>))}
                        </select>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>);
}
