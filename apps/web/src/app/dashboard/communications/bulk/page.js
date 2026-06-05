"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EmailPage;
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const api_1 = __importDefault(require("@/lib/api"));
const EmailComposerModal_1 = __importDefault(require("@/components/email/EmailComposerModal"));
const EmailCampaignList_1 = __importDefault(require("@/components/email/EmailCampaignList"));
function EmailPage() {
    const [campaigns, setCampaigns] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [isComposerOpen, setIsComposerOpen] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        fetchCampaigns();
    }, []);
    const fetchCampaigns = async () => {
        try {
            setLoading(true);
            const res = await api_1.default.get('/email-campaigns');
            setCampaigns(res.data);
        }
        catch (error) {
            console.error('Failed to fetch campaigns', error);
        }
        finally {
            setLoading(false);
        }
    };
    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this campaign?'))
            return;
        try {
            await api_1.default.delete(`/email-campaigns/${id}`);
            setCampaigns(prev => prev.filter(c => c.id !== id));
        }
        catch (error) {
            console.error('Failed to delete campaign', error);
        }
    };
    const handleSend = async (id) => {
        if (!confirm('Are you sure you want to send this campaign now?'))
            return;
        try {
            await api_1.default.post(`/email-campaigns/${id}/send`);
            fetchCampaigns();
        }
        catch (error) {
            console.error('Failed to send campaign', error);
        }
    };
    return (<div className="flex flex-col h-full w-full bg-slate-50/50 dark:bg-slate-950/50">
      <div className="flex-1 w-full p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 rounded-2xl border border-gray-200/50 dark:border-slate-700/50 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">Bulk Email</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage and send email campaigns to your workforce
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchCampaigns} className="p-2.5 text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-white bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-slate-600 transition-all shadow-sm" title="Refresh">
            <lucide_react_1.RefreshCw className="w-5 h-5"/>
          </button>
          <button onClick={() => setIsComposerOpen(true)} className="group relative px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            <div className="flex items-center gap-2 text-sm font-medium relative">
              <lucide_react_1.Plus className="w-4 h-4"/>
              <span>New Campaign</span>
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      {loading && campaigns.length === 0 ? (<div className="text-center py-12 text-gray-500">Loading campaigns...</div>) : (<EmailCampaignList_1.default campaigns={campaigns} onDelete={handleDelete} onSend={handleSend}/>)}

      <EmailComposerModal_1.default isOpen={isComposerOpen} onClose={() => setIsComposerOpen(false)} onSuccess={fetchCampaigns}/>
    </div>
  </div>);
}
