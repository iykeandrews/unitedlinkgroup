'use client';

import { useEffect, useState } from 'react';
import { useBusiness } from '../../../../context/business-context';
import api from '../../../../lib/api';
import { businessProfileFields } from '../../../../context/business-selection';
import { toast } from 'sonner';
import { 
  Building2, 
  MapPin, 
  Globe, 
  CreditCard, 
  Save, 
  Briefcase,
  Globe2,
  AlertCircle
} from 'lucide-react';
import { currencies } from '../../../../lib/currencies';
import { countries } from '../../../../lib/countries';
import { getCountryConfig } from '../../../../lib/localization';

export default function BusinessProfilePage() {
  const { selectedBusiness, setSelectedBusiness, refreshBusinesses, isLoading: businessLoading } = useBusiness();
  const [form, setForm] = useState<any>({
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
  const [saving, setSaving] = useState(false);
  const [logoEdited, setLogoEdited] = useState(false);
  const [failedLogoUrl, setFailedLogoUrl] = useState('');
  const logoUrl = String(form.logoUrl || '').trim();
  const isImageUrl = (value: string) => {
    try {
      const url = new URL(value);
      return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password;
    } catch {
      return false;
    }
  };
  const logoChanged = logoUrl !== (selectedBusiness?.logoUrl || '');
  const logoError = logoUrl && logoChanged && !isImageUrl(logoUrl)
    ? 'Enter a complete image URL starting with https:// or http://.'
    : '';
  const previewUrl = isImageUrl(logoUrl) || (!logoChanged && logoUrl.startsWith('/')) ? logoUrl : '';

  // Derived config for display
  const localizationConfig = getCountryConfig(form.country);

  useEffect(() => {
    if (selectedBusiness) {
      setLogoEdited(false);
      setFailedLogoUrl('');
      let softwareName = '';
      try {
        if (selectedBusiness.settings) {
          const s = JSON.parse(selectedBusiness.settings);
          softwareName = s.softwareName || '';
        }
      } catch {}
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

  const updateField = (key: string, value: any) => {
    if (key === 'logoUrl') setLogoEdited(true);
    setForm((prev: any) => {
        const newData = { ...prev, [key]: value };
        
        // Auto-update currency when country changes
        if (key === 'country') {
            const config = getCountryConfig(value);
            newData.currencyCode = config.currencyCode;
        }
        
        return newData;
    });
  };

  const handleSave = async () => {
    if (!selectedBusiness || businessLoading) return;
    if (logoError) {
      toast.error(logoError);
      return;
    }
    try {
      setSaving(true);
      
      const sanitizedForm = businessProfileFields(form, logoEdited);

      if (!sanitizedForm.currencyCode) sanitizedForm.currencyCode = 'USD';

      const currentSettings = selectedBusiness.settings ? (() => { try { return JSON.parse(selectedBusiness.settings as any); } catch { return {}; } })() : {};
      const nextSettings = { ...currentSettings, softwareName: sanitizedForm.softwareName || currentSettings.softwareName || '' };
      const payload = { ...sanitizedForm, settings: JSON.stringify(nextSettings) };

      const { data: updated } = await api.patch(`/businesses/${selectedBusiness.id}`, payload, { headers: { 'x-business-id': selectedBusiness.id } });
      setLogoEdited(false);
      setSelectedBusiness(updated);
      await refreshBusinesses();
      if (nextSettings.softwareName) {
        try {
          localStorage.setItem('app_software_name', nextSettings.softwareName);
        } catch {}
      }
      toast.success('Business profile updated successfully');
    } catch (e: any) {
      console.error(e);
      const message = e.response?.data?.message || 'Failed to update business profile';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (!selectedBusiness) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-slate-500">
        <Building2 className="w-12 h-12 mb-4 opacity-50" />
        <p>Please select a business to manage its profile.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-7 h-7 text-blue-600" />
            Business Profile
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 ml-9">
            Manage your company&apos;s identity, contact details, and regional settings.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || businessLoading || !!logoError}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm font-medium"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Identity & Branding */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* Identity Card */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-slate-500" />
                    <h2 className="font-semibold text-slate-900 dark:text-white">Company Identity</h2>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Software Name</label>
                        <input
                            value={form.softwareName || ''}
                            onChange={(e) => updateField('softwareName', e.target.value)}
                            className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            placeholder="e.g. Your SaaS Brand"
                        />
                        <p className="text-xs text-slate-500 mt-1">This appears as the application name in the header and login pages.</p>
                    </div>
                    <div className="space-y-3">
                      <label htmlFor="company-logo-url" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Company logo image URL</label>
                      <input
                        id="company-logo-url"
                        type="url"
                        disabled={businessLoading || saving}
                        value={form.logoUrl || ''}
                        onChange={(e) => updateField('logoUrl', e.target.value)}
                        placeholder="https://example.com/company-logo.png"
                        autoComplete="off"
                        spellCheck={false}
                        aria-invalid={!!logoError}
                        aria-describedby="company-logo-help company-logo-status"
                        className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <p id="company-logo-help" className="text-xs text-slate-500">Paste the public image address, then select Save Changes. Use a direct image link rather than a webpage link. Clear the field to remove the logo.</p>
                      <div id="company-logo-status" aria-live="polite">
                        {logoError && <p className="text-sm text-red-600 dark:text-red-400">{logoError}</p>}
                        {previewUrl && failedLogoUrl === previewUrl && <p className="text-sm text-amber-700 dark:text-amber-400">The image could not be loaded. Check that the address is public and points directly to an image.</p>}
                      </div>
                      {previewUrl && failedLogoUrl !== previewUrl && (
                        <div className="inline-flex min-h-24 min-w-24 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img key={previewUrl} src={previewUrl} alt="Company logo preview" referrerPolicy="no-referrer" onError={() => setFailedLogoUrl(previewUrl)} className="max-h-28 max-w-full object-contain" />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Business Name</label>
                            <input
                                value={form.name || ''}
                                onChange={(e) => updateField('name', e.target.value)}
                                className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Industry</label>
                            <input
                                value={form.industry || ''}
                                onChange={(e) => updateField('industry', e.target.value)}
                                className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                placeholder="e.g. Technology"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Business Type</label>
                            <input
                                value={form.businessType || ''}
                                onChange={(e) => updateField('businessType', e.target.value)}
                                className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                placeholder="e.g. LLC"
                            />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Employee Count</label>
                            <select
                                value={form.employeeCount || ''}
                                onChange={(e) => updateField('employeeCount', e.target.value)}
                                className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
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
                    <Globe2 className="w-5 h-5 text-slate-500" />
                    <h2 className="font-semibold text-slate-900 dark:text-white">Localization & Tax</h2>
                </div>
                <div className="p-6 space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-lg p-4 flex gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800 dark:text-blue-200">
                            Changing your country will automatically update your currency, tax labels, and date formats across the entire application.
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2">
                             <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Country of Operation</label>
                            <select
                                value={form.country || ''}
                                onChange={(e) => updateField('country', e.target.value)}
                                className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="">Select Country...</option>
                                {countries.map((c) => (
                                    <option key={c.code} value={c.name}>{c.name}</option>
                                ))}
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
                            <input
                                value={form.ein || ''}
                                onChange={(e) => updateField('ein', e.target.value)}
                                className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                placeholder={`Enter your ${localizationConfig.taxIdLabel}`}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-slate-500" />
                    <h2 className="font-semibold text-slate-900 dark:text-white">Contact & Location</h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Street Address</label>
                        <input
                            value={form.address || ''}
                            onChange={(e) => updateField('address', e.target.value)}
                            className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">City</label>
                        <input
                            value={form.city || ''}
                            onChange={(e) => updateField('city', e.target.value)}
                            className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">State / Province</label>
                        <input
                            value={form.state || ''}
                            onChange={(e) => updateField('state', e.target.value)}
                            className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Postal / Zip Code</label>
                        <input
                            value={form.zip || ''}
                            onChange={(e) => updateField('zip', e.target.value)}
                            className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Phone Number</label>
                         <input
                            value={form.mobile || ''}
                            onChange={(e) => updateField('mobile', e.target.value)}
                            className="mt-1 block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Right Column - Regional & Settings */}
        <div className="space-y-8">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden sticky top-8">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-slate-500" />
                    <h2 className="font-semibold text-slate-900 dark:text-white">Regional & Legal</h2>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Employer ID (EIN)</label>
                        <input
                            value={form.ein || ''}
                            onChange={(e) => updateField('ein', e.target.value)}
                            className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 font-mono"
                            placeholder="XX-XXXXXXX"
                        />
                        <p className="text-xs text-slate-500 mt-1">Required for tax documents</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                             <CreditCard className="w-4 h-4 text-slate-400" />
                            Default Currency
                        </label>
                        <select
                            value={form.currencyCode || 'USD'}
                            onChange={(e) => updateField('currencyCode', e.target.value)}
                            className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        >
                            {currencies.map((currency) => (
                                <option key={currency.code} value={currency.code}>
                                    {currency.code} - {currency.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
