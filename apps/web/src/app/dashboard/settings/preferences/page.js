"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SystemPreferencesPage;
const react_1 = require("react");
const business_context_1 = require("../../../../context/business-context");
const api_1 = __importDefault(require("../../../../lib/api"));
const currencies_1 = require("../../../../lib/currencies");
const sonner_1 = require("sonner");
const next_themes_1 = require("next-themes");
const lucide_react_1 = require("lucide-react");
const DEFAULT_SETTINGS = {
    softwareName: 'United Link Group',
    timezone: 'UTC',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: '12h',
    weekStart: 'sunday',
    emailAlerts: true,
    pushNotifications: true,
    marketingEmails: false,
    sessionTimeout: 60,
    require2FA: false,
    theme: 'system',
    language: 'en-US',
    currencyFormat: 'USD'
};
const TIMEZONES = [
    { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
    { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
    { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
    { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
    { value: 'America/Anchorage', label: 'Alaska Time (US & Canada)' },
    { value: 'America/Honolulu', label: 'Hawaii Time (US)' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Paris' },
    { value: 'Europe/Berlin', label: 'Berlin' },
    { value: 'Europe/Rome', label: 'Rome' },
    { value: 'Asia/Tokyo', label: 'Tokyo' },
    { value: 'Asia/Singapore', label: 'Singapore' },
    { value: 'Asia/Dubai', label: 'Dubai' },
    { value: 'Australia/Sydney', label: 'Sydney' },
    { value: 'Australia/Melbourne', label: 'Melbourne' },
];
function SystemPreferencesPage() {
    const { selectedBusiness, setSelectedBusiness, refreshBusinesses } = (0, business_context_1.useBusiness)();
    const [settings, setSettings] = (0, react_1.useState)(DEFAULT_SETTINGS);
    const [saving, setSaving] = (0, react_1.useState)(false);
    const [activeSection, setActiveSection] = (0, react_1.useState)('general');
    const { setTheme } = (0, next_themes_1.useTheme)();
    (0, react_1.useEffect)(() => {
        if (selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.settings) {
            try {
                const parsed = JSON.parse(selectedBusiness.settings);
                setSettings({ ...DEFAULT_SETTINGS, ...parsed });
            }
            catch (e) {
                console.error('Failed to parse settings', e);
            }
        }
        else {
            try {
                const storedName = typeof window !== 'undefined' ? localStorage.getItem('app_software_name') : null;
                const resolvedName = storedName === 'Pamtech Security' ? 'United Link Group' : storedName;
                if (storedName === 'Pamtech Security' && typeof window !== 'undefined') {
                    localStorage.setItem('app_software_name', 'United Link Group');
                }
                const initial = { ...DEFAULT_SETTINGS, ...(resolvedName ? { softwareName: resolvedName } : {}) };
                setSettings(initial);
            }
            catch { }
        }
    }, [selectedBusiness]);
    const updateSetting = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };
    // Theme is applied directly in click handlers to avoid conflicts with the navbar toggle
    const handleReset = () => {
        if (confirm('Are you sure you want to reset all preferences to default values?')) {
            setSettings(DEFAULT_SETTINGS);
        }
    };
    const handleSave = async () => {
        try {
            setSaving(true);
            const name = settings.softwareName || 'United Link Group';
            if (!selectedBusiness) {
                if (typeof window !== 'undefined') {
                    localStorage.setItem('app_software_name', name);
                }
                sonner_1.toast.success('Global preferences saved');
            }
            else {
                const payload = {
                    settings: JSON.stringify({ ...settings, softwareName: name }),
                    currencyCode: settings.currencyFormat
                };
                await api_1.default.patch(`/businesses/${selectedBusiness.id}`, payload);
                const updated = { ...selectedBusiness, settings: payload.settings, currencyCode: payload.currencyCode };
                setSelectedBusiness(updated);
                await refreshBusinesses();
                if (typeof window !== 'undefined') {
                    localStorage.setItem('app_software_name', name);
                }
                sonner_1.toast.success('Preferences saved successfully');
            }
        }
        catch (e) {
            console.error(e);
            sonner_1.toast.error('Failed to save preferences');
        }
        finally {
            setSaving(false);
        }
    };
    const sections = [
        { id: 'general', label: 'General', icon: lucide_react_1.Globe },
        { id: 'notifications', label: 'Notifications', icon: lucide_react_1.Bell },
        { id: 'security', label: 'Security', icon: lucide_react_1.Shield },
        { id: 'appearance', label: 'Appearance', icon: lucide_react_1.Layout },
    ];
    return (<div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <lucide_react_1.Layout className="w-7 h-7 text-blue-600"/>
            System Preferences
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 ml-9">
            Customize your workspace, notifications, and regional settings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleReset} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-medium">
            <lucide_react_1.RotateCcw className="w-4 h-4"/>
            Reset Defaults
          </button>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-1 sticky top-8">
            {sections.map(section => (<button key={section.id} onClick={() => setActiveSection(section.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${activeSection === section.id
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
                <section.icon className={`w-5 h-5 ${activeSection === section.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}/>
                {section.label}
              </button>))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* General Section */}
          {activeSection === 'general' && (<div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <lucide_react_1.Type className="w-5 h-5 text-blue-500"/>
                  Application Branding
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Application Name</label>
                    <input type="text" value={settings.softwareName || ''} onChange={(e) => updateSetting('softwareName', e.target.value)} className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500" placeholder="Enter application name"/>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <lucide_react_1.Globe className="w-5 h-5 text-blue-500"/>
                  Regional Settings
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Timezone</label>
                    <select value={settings.timezone} onChange={(e) => updateSetting('timezone', e.target.value)} className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500">
                      {TIMEZONES.map(tz => (<option key={tz.value} value={tz.value}>{tz.label}</option>))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Language</label>
                      <select value={settings.language} onChange={(e) => updateSetting('language', e.target.value)} className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500">
                        <option value="en-US">English (US)</option>
                        <option value="es-ES">Spanish (Español) - Beta</option>
                        <option value="fr-FR">French (Français) - Beta</option>
                      </select>
                    </div>
                     <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Currency Format</label>
                      <select value={settings.currencyFormat} onChange={(e) => updateSetting('currencyFormat', e.target.value)} className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500">
                        {currencies_1.currencies.map(c => (<option key={c.code} value={c.code}>{c.code} ({c.symbol}) - {c.name}</option>))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <lucide_react_1.Clock className="w-5 h-5 text-blue-500"/>
                  Date & Time
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date Format</label>
                    <select value={settings.dateFormat} onChange={(e) => updateSetting('dateFormat', e.target.value)} className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500">
                      <option value="MM/dd/yyyy">MM/DD/YYYY</option>
                      <option value="dd/MM/yyyy">DD/MM/YYYY</option>
                      <option value="yyyy-MM-dd">YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Time Format</label>
                    <select value={settings.timeFormat} onChange={(e) => updateSetting('timeFormat', e.target.value)} className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500">
                      <option value="12h">12-hour (AM/PM)</option>
                      <option value="24h">24-hour</option>
                    </select>
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Week Starts On</label>
                    <select value={settings.weekStart} onChange={(e) => updateSetting('weekStart', e.target.value)} className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500">
                      <option value="sunday">Sunday</option>
                      <option value="monday">Monday</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>)}

          {/* Notifications Section */}
          {activeSection === 'notifications' && (<div className="space-y-6 animate-in fade-in duration-300">
               <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <lucide_react_1.Bell className="w-5 h-5 text-blue-500"/>
                  Alerts & Communications
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                        <lucide_react_1.Mail className="w-5 h-5 text-slate-600 dark:text-slate-400"/>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">Email Notifications</p>
                        <p className="text-sm text-slate-500">Receive important system alerts via email.</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={settings.emailAlerts} onChange={(e) => updateSetting('emailAlerts', e.target.checked)} className="sr-only peer"/>
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                   <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                        <lucide_react_1.Smartphone className="w-5 h-5 text-slate-600 dark:text-slate-400"/>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">Push Notifications</p>
                        <p className="text-sm text-slate-500">Receive alerts on your mobile device.</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={settings.pushNotifications} onChange={(e) => updateSetting('pushNotifications', e.target.checked)} className="sr-only peer"/>
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                   <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                        <lucide_react_1.Bell className="w-5 h-5 text-slate-600 dark:text-slate-400"/>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">Marketing Updates</p>
                        <p className="text-sm text-slate-500">Receive product updates and offers.</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={settings.marketingEmails} onChange={(e) => updateSetting('marketingEmails', e.target.checked)} className="sr-only peer"/>
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
               </div>
            </div>)}

          {/* Security Section */}
          {activeSection === 'security' && (<div className="space-y-6 animate-in fade-in duration-300">
               <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <lucide_react_1.Shield className="w-5 h-5 text-blue-500"/>
                  Security Controls
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                        <lucide_react_1.Lock className="w-5 h-5 text-slate-600 dark:text-slate-400"/>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">Two-Factor Authentication (2FA)</p>
                        <p className="text-sm text-slate-500">Enforce 2FA for all business admins.</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={settings.require2FA} onChange={(e) => updateSetting('require2FA', e.target.checked)} className="sr-only peer"/>
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Session Timeout (Minutes)</label>
                     <input type="number" min="5" max="240" value={settings.sessionTimeout} onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))} className="block w-full md:w-32 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"/>
                      <p className="text-xs text-slate-500 mt-1">Auto-logout inactive users after this period.</p>
                  </div>
                </div>
              </div>
            </div>)}

          {/* Appearance Section */}
          {activeSection === 'appearance' && (<div className="space-y-6 animate-in fade-in duration-300">
               <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <lucide_react_1.Layout className="w-5 h-5 text-blue-500"/>
                  Theme & Interface
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button onClick={() => {
                setTheme('light');
                updateSetting('theme', 'light');
            }} className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${settings.theme === 'light'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-blue-200'}`}>
                    <lucide_react_1.Sun className="w-8 h-8 text-amber-500"/>
                    <span className="font-medium text-sm">Light Mode</span>
                  </button>

                   <button onClick={() => {
                setTheme('dark');
                updateSetting('theme', 'dark');
            }} className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${settings.theme === 'dark'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-blue-200'}`}>
                    <lucide_react_1.Moon className="w-8 h-8 text-slate-700 dark:text-slate-300"/>
                    <span className="font-medium text-sm">Dark Mode</span>
                  </button>

                   <button onClick={() => {
                setTheme('system');
                updateSetting('theme', 'system');
            }} className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${settings.theme === 'system'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-blue-200'}`}>
                    <lucide_react_1.Monitor className="w-8 h-8 text-blue-500"/>
                    <span className="font-medium text-sm">System Default</span>
                  </button>
                </div>
              </div>
            </div>)}

        </div>
      </div>
    </div>);
}
