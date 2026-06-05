'use client';

import { useState, useEffect } from 'react';
import { useBusiness } from '../../../../context/business-context';
import api from '../../../../lib/api';
import { currencies } from '../../../../lib/currencies';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { 
  Save, 
  Globe, 
  Bell, 
  Shield, 
  Moon, 
  Monitor, 
  Sun, 
  Check,
  Clock,
  Calendar,
  Smartphone,
  Mail,
  Lock,
  Layout,
  Type,
  Languages,
  RotateCcw
} from 'lucide-react';

interface SystemSettings {
  softwareName?: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  weekStart: 'sunday' | 'monday';
  emailAlerts: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  sessionTimeout: number; // minutes
  require2FA: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
  currencyFormat: string;
}

const DEFAULT_SETTINGS: SystemSettings = {
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

export default function SystemPreferencesPage() {
  const { selectedBusiness, setSelectedBusiness, refreshBusinesses } = useBusiness();
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('general');
  const { setTheme } = useTheme();

  useEffect(() => {
    if (selectedBusiness?.settings) {
      try {
        const parsed = JSON.parse(selectedBusiness.settings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (e) {
        console.error('Failed to parse settings', e);
      }
    } else {
      try {
        const storedName = typeof window !== 'undefined' ? localStorage.getItem('app_software_name') : null;
        const resolvedName = storedName === 'Pamtech Security' ? 'United Link Group' : storedName;
        if (storedName === 'Pamtech Security' && typeof window !== 'undefined') {
          localStorage.setItem('app_software_name', 'United Link Group');
        }
        const initial = { ...DEFAULT_SETTINGS, ...(resolvedName ? { softwareName: resolvedName } : {}) };
        setSettings(initial);
      } catch {}
    }
  }, [selectedBusiness]);

  const updateSetting = (key: keyof SystemSettings, value: any) => {
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
        toast.success('Global preferences saved');
      } else {
        const payload = {
          settings: JSON.stringify({ ...settings, softwareName: name }),
          currencyCode: settings.currencyFormat
        };
        await api.patch(`/businesses/${selectedBusiness.id}`, payload);
        const updated = { ...selectedBusiness, settings: payload.settings, currencyCode: payload.currencyCode };
        setSelectedBusiness(updated);
        await refreshBusinesses();
        if (typeof window !== 'undefined') {
          localStorage.setItem('app_software_name', name);
        }
        toast.success('Preferences saved successfully');
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Layout },
  ];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layout className="w-7 h-7 text-blue-600" />
            System Preferences
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 ml-9">
            Customize your workspace, notifications, and regional settings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-1 sticky top-8">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  activeSection === section.id
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                <section.icon className={`w-5 h-5 ${
                  activeSection === section.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                }`} />
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* General Section */}
          {activeSection === 'general' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Type className="w-5 h-5 text-blue-500" />
                  Application Branding
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Application Name</label>
                    <input
                      type="text"
                      value={settings.softwareName || ''}
                      onChange={(e) => updateSetting('softwareName', e.target.value)}
                      className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Enter application name"
                    />
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-500" />
                  Regional Settings
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Timezone</label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => updateSetting('timezone', e.target.value)}
                      className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      {TIMEZONES.map(tz => (
                        <option key={tz.value} value={tz.value}>{tz.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Language</label>
                      <select
                        value={settings.language}
                        onChange={(e) => updateSetting('language', e.target.value)}
                        className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="en-US">English (US)</option>
                        <option value="es-ES">Spanish (Español) - Beta</option>
                        <option value="fr-FR">French (Français) - Beta</option>
                      </select>
                    </div>
                     <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Currency Format</label>
                      <select
                        value={settings.currencyFormat}
                        onChange={(e) => updateSetting('currencyFormat', e.target.value)}
                        className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        {currencies.map(c => (
                          <option key={c.code} value={c.code}>{c.code} ({c.symbol}) - {c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  Date & Time
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date Format</label>
                    <select
                      value={settings.dateFormat}
                      onChange={(e) => updateSetting('dateFormat', e.target.value)}
                      className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="MM/dd/yyyy">MM/DD/YYYY</option>
                      <option value="dd/MM/yyyy">DD/MM/YYYY</option>
                      <option value="yyyy-MM-dd">YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Time Format</label>
                    <select
                      value={settings.timeFormat}
                      onChange={(e) => updateSetting('timeFormat', e.target.value as any)}
                      className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="12h">12-hour (AM/PM)</option>
                      <option value="24h">24-hour</option>
                    </select>
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Week Starts On</label>
                    <select
                      value={settings.weekStart}
                      onChange={(e) => updateSetting('weekStart', e.target.value as any)}
                      className="block w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="sunday">Sunday</option>
                      <option value="monday">Monday</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Section */}
          {activeSection === 'notifications' && (
            <div className="space-y-6 animate-in fade-in duration-300">
               <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-blue-500" />
                  Alerts & Communications
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                        <Mail className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">Email Notifications</p>
                        <p className="text-sm text-slate-500">Receive important system alerts via email.</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.emailAlerts}
                        onChange={(e) => updateSetting('emailAlerts', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                   <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                        <Smartphone className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">Push Notifications</p>
                        <p className="text-sm text-slate-500">Receive alerts on your mobile device.</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.pushNotifications}
                        onChange={(e) => updateSetting('pushNotifications', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                   <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                        <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">Marketing Updates</p>
                        <p className="text-sm text-slate-500">Receive product updates and offers.</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.marketingEmails}
                        onChange={(e) => updateSetting('marketingEmails', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
               </div>
            </div>
          )}

          {/* Security Section */}
          {activeSection === 'security' && (
            <div className="space-y-6 animate-in fade-in duration-300">
               <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  Security Controls
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                        <Lock className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">Two-Factor Authentication (2FA)</p>
                        <p className="text-sm text-slate-500">Enforce 2FA for all business admins.</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={settings.require2FA}
                        onChange={(e) => updateSetting('require2FA', e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Session Timeout (Minutes)</label>
                     <input
                        type="number"
                        min="5"
                        max="240"
                        value={settings.sessionTimeout}
                        onChange={(e) => updateSetting('sessionTimeout', parseInt(e.target.value))}
                        className="block w-full md:w-32 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">Auto-logout inactive users after this period.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Section */}
          {activeSection === 'appearance' && (
            <div className="space-y-6 animate-in fade-in duration-300">
               <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Layout className="w-5 h-5 text-blue-500" />
                  Theme & Interface
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button 
                    onClick={() => {
                      setTheme('light');
                      updateSetting('theme', 'light');
                    }}
                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      settings.theme === 'light' 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-slate-200 dark:border-slate-800 hover:border-blue-200'
                    }`}
                  >
                    <Sun className="w-8 h-8 text-amber-500" />
                    <span className="font-medium text-sm">Light Mode</span>
                  </button>

                   <button 
                    onClick={() => {
                      setTheme('dark');
                      updateSetting('theme', 'dark');
                    }}
                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      settings.theme === 'dark' 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-slate-200 dark:border-slate-800 hover:border-blue-200'
                    }`}
                  >
                    <Moon className="w-8 h-8 text-slate-700 dark:text-slate-300" />
                    <span className="font-medium text-sm">Dark Mode</span>
                  </button>

                   <button 
                    onClick={() => {
                      setTheme('system');
                      updateSetting('theme', 'system');
                    }}
                    className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                      settings.theme === 'system' 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-slate-200 dark:border-slate-800 hover:border-blue-200'
                    }`}
                  >
                    <Monitor className="w-8 h-8 text-blue-500" />
                    <span className="font-medium text-sm">System Default</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
