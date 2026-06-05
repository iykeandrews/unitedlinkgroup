"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SettingsPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const business_context_1 = require("../../../context/business-context");
const api_1 = __importDefault(require("../../../lib/api"));
const lucide_react_1 = require("lucide-react");
const sonner_1 = require("sonner");
const modules_1 = require("../../../lib/modules");
function SettingsPage() {
    const router = (0, navigation_1.useRouter)();
    const { selectedBusiness, setSelectedBusiness, refreshBusinesses } = (0, business_context_1.useBusiness)();
    const [modules, setModules] = (0, react_1.useState)([]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [isSaved, setIsSaved] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        var _a;
        if (selectedBusiness) {
            if (selectedBusiness.modules) {
                setModules(selectedBusiness.modules.split(','));
            }
            else {
                // Smart defaults based on industry
                const defaultModules = modules_1.MODULES.filter(m => m.category === 'Core').map(m => m.id);
                if (selectedBusiness.industry) {
                    const industry = selectedBusiness.industry.toLowerCase();
                    const businessType = ((_a = selectedBusiness.businessType) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
                    if (industry.includes('security')) {
                        defaultModules.push(...modules_1.MODULES.filter(m => m.category === 'Security').map(m => m.id));
                    }
                    if (industry.includes('health') || industry.includes('medical') || industry.includes('care')) {
                        defaultModules.push(...modules_1.MODULES.filter(m => m.category === 'Healthcare').map(m => m.id));
                    }
                    if (industry.includes('hotel') || industry.includes('motel') || businessType.includes('hospitality')) {
                        defaultModules.push(...modules_1.MODULES.filter(m => m.category === 'Hotel').map(m => m.id));
                    }
                    if (industry.includes('agri') || industry.includes('farm') || industry.includes('harvest')) {
                        defaultModules.push(...modules_1.MODULES.filter(m => m.category === 'Agriculture').map(m => m.id));
                    }
                    if (industry.includes('property') || industry.includes('real estate') || industry.includes('housing')) {
                        defaultModules.push(...modules_1.MODULES.filter(m => m.category === 'Rental').map(m => m.id));
                    }
                    if (industry.includes('fashion') || businessType.includes('fashion') || industry.includes('clothing') || industry.includes('textile') || industry.includes('apparel') || industry.includes('style') || industry.includes('modeling')) {
                        defaultModules.push(...modules_1.MODULES.filter(m => m.category === 'Fashion').map(m => m.id));
                    }
                }
                setModules(defaultModules);
            }
        }
    }, [selectedBusiness]);
    const toggleModule = (id) => {
        setModules(prev => prev.includes(id)
            ? prev.filter(m => m !== id)
            : [...prev, id]);
        setIsSaved(false);
    };
    const handleSave = async () => {
        if (!selectedBusiness)
            return;
        setIsLoading(true);
        try {
            const modulesStr = modules.join(',');
            await api_1.default.patch(`/businesses/${selectedBusiness.id}`, {
                modules: modulesStr
            });
            // Update context
            const updatedBusiness = { ...selectedBusiness, modules: modulesStr };
            setSelectedBusiness(updatedBusiness);
            await refreshBusinesses();
            setIsSaved(true);
            sonner_1.toast.success('Settings saved successfully');
            setTimeout(() => {
                setIsSaved(false);
                router.push('/dashboard');
            }, 1000);
        }
        catch (error) {
            console.error('Failed to save settings', error);
            sonner_1.toast.error('Failed to save settings');
        }
        finally {
            setIsLoading(false);
        }
    };
    if (!selectedBusiness) {
        return (<div className="flex items-center justify-center h-96">
              <p className="text-slate-500">Please select a business to configure settings.</p>
          </div>);
    }
    // Group modules by category
    const groupedModules = modules_1.MODULES.reduce((acc, module) => {
        if (!acc[module.category]) {
            acc[module.category] = [];
        }
        acc[module.category].push(module);
        return acc;
    }, {});
    const categories = ['Core', 'Security', 'Healthcare', 'Hotel', 'Agriculture', 'Rental', 'Fashion'];
    return (<div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Business Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Customize your experience by enabling or disabling modules.</p>
        </div>
        <button onClick={handleSave} disabled={isLoading} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium shadow-sm">
          {isLoading ? ('Saving...') : isSaved ? (<>
              <lucide_react_1.Check className="w-4 h-4"/>
              Saved
            </>) : (<>
              <lucide_react_1.Save className="w-4 h-4"/>
              Save Changes
            </>)}
        </button>
      </div>

      <div className="space-y-8">
        {categories.map((category) => {
            const categoryModules = groupedModules[category];
            if (!categoryModules)
                return null;
            return (<div key={category} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{category === 'Core' ? 'Core Modules' : `${category} Modules`}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {category === 'Core'
                    ? 'Essential tools available for all businesses.'
                    : `Specialized tools for the ${category} industry.`}
                </p>
              </div>
              
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {categoryModules.map((module) => {
                    const isEnabled = modules.includes(module.id);
                    return (<div key={module.id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group" onClick={() => toggleModule(module.id)}>
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg transition-colors ${isEnabled ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'}`}>
                          <module.icon className="w-6 h-6"/>
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900 dark:text-white">{module.name}</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{module.description}</p>
                        </div>
                      </div>
                      
                      <div className={`w-14 h-8 rounded-full p-1 transition-colors duration-200 ease-in-out flex items-center ${isEnabled ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}>
                        <div className={`bg-white w-6 h-6 rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${isEnabled ? 'translate-x-6' : 'translate-x-0'}`}/>
                      </div>
                    </div>);
                })}
              </div>
            </div>);
        })}
      </div>
    </div>);
}
