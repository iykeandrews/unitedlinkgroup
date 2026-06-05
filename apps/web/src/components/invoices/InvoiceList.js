"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = InvoiceList;
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const api_1 = __importDefault(require("../../lib/api"));
const InvoiceModal_1 = __importDefault(require("./InvoiceModal"));
const sonner_1 = require("sonner");
const business_context_1 = require("../../context/business-context");
function InvoiceList({ clientId, client }) {
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const [invoices, setInvoices] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [isModalOpen, setIsModalOpen] = (0, react_1.useState)(false);
    const [selectedInvoice, setSelectedInvoice] = (0, react_1.useState)(undefined);
    // Filter State
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [statusFilter, setStatusFilter] = (0, react_1.useState)('ALL');
    const [siteFilter, setSiteFilter] = (0, react_1.useState)('ALL');
    const [issueDateStart, setIssueDateStart] = (0, react_1.useState)('');
    const [issueDateEnd, setIssueDateEnd] = (0, react_1.useState)('');
    const [dueDateStart, setDueDateStart] = (0, react_1.useState)('');
    const [dueDateEnd, setDueDateEnd] = (0, react_1.useState)('');
    const [isFilterOpen, setIsFilterOpen] = (0, react_1.useState)(false);
    const fetchInvoices = (0, react_1.useCallback)(async () => {
        try {
            const res = await api_1.default.get(`/invoices/client/${clientId}`);
            setInvoices(res.data);
        }
        catch (error) {
            console.error('Failed to fetch invoices', error);
        }
        finally {
            setLoading(false);
        }
    }, [clientId]);
    (0, react_1.useEffect)(() => {
        fetchInvoices();
    }, [fetchInvoices]);
    // Derive unique sites from invoices for the filter dropdown
    const uniqueSites = Array.from(new Set(invoices.map(inv => { var _a; return (_a = inv.location) === null || _a === void 0 ? void 0 : _a.name; }).filter(Boolean))).sort();
    const filteredInvoices = invoices.filter(inv => {
        var _a, _b, _c;
        const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (inv.notes && inv.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (((_a = inv.client) === null || _a === void 0 ? void 0 : _a.name) && inv.client.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (((_b = inv.location) === null || _b === void 0 ? void 0 : _b.name) && inv.location.name.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
        const matchesSite = siteFilter === 'ALL' || ((_c = inv.location) === null || _c === void 0 ? void 0 : _c.name) === siteFilter;
        // Date Filtering
        const invIssueDate = new Date(inv.issueDate);
        const matchesIssueStart = !issueDateStart || invIssueDate >= new Date(issueDateStart);
        const matchesIssueEnd = !issueDateEnd || invIssueDate <= new Date(issueDateEnd);
        const invDueDate = new Date(inv.dueDate);
        const matchesDueStart = !dueDateStart || invDueDate >= new Date(dueDateStart);
        const matchesDueEnd = !dueDateEnd || invDueDate <= new Date(dueDateEnd);
        return matchesSearch && matchesStatus && matchesSite &&
            matchesIssueStart && matchesIssueEnd &&
            matchesDueStart && matchesDueEnd;
    }).sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
    const handleCreateInvoice = () => {
        setSelectedInvoice(undefined);
        setIsModalOpen(true);
    };
    const handleEditInvoice = (invoice) => {
        setSelectedInvoice(invoice);
        setIsModalOpen(true);
    };
    const handleSendInvoice = async (invoice) => {
        var _a, _b;
        const toastId = sonner_1.toast.loading(`Sending invoice ${invoice.invoiceNumber}...`);
        try {
            await api_1.default.post(`/invoices/${invoice.id}/send`);
            sonner_1.toast.success('Invoice sent successfully', { id: toastId });
            await fetchInvoices();
        }
        catch (error) {
            const raw = ((_b = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || 'Failed to send invoice';
            const message = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw.join(', ') : (() => { try {
                return JSON.stringify(raw);
            }
            catch {
                return String(raw);
            } })();
            sonner_1.toast.error(message, { id: toastId });
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'PAID': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'SENT': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'OVERDUE': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            case 'DRAFT': return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
            case 'CANCELLED': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
            default: return 'bg-slate-100 text-slate-800';
        }
    };
    const getStatusIcon = (status) => {
        switch (status) {
            case 'PAID': return <lucide_react_1.CheckCircle size={14}/>;
            case 'OVERDUE': return <lucide_react_1.AlertCircle size={14}/>;
            case 'SENT': return <lucide_react_1.Clock size={14}/>;
            default: return <lucide_react_1.FileText size={14}/>;
        }
    };
    if (loading) {
        return <div className="text-center py-8 text-slate-500">Loading invoices...</div>;
    }
    return (<div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Invoices & Billing History</h3>
        <button onClick={handleCreateInvoice} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm">
          <lucide_react_1.Plus size={16}/>
          Create Invoice
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <lucide_react_1.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
            <input type="text" placeholder="Search invoice #..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>
          <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${isFilterOpen
            ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            <lucide_react_1.Filter size={20}/>
            Filters
          </button>
        </div>

        {isFilterOpen && (<div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="block w-48 px-3 py-2 text-sm border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md bg-slate-50 dark:bg-slate-900">
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SENT">Sent</option>
                  <option value="PAID">Paid</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Site / Location</label>
                <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} className="block w-48 px-3 py-2 text-sm border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md bg-slate-50 dark:bg-slate-900">
                  <option value="ALL">All Sites</option>
                  {uniqueSites.map(site => (<option key={site} value={site}>{site}</option>))}
                </select>
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Issue Date Range</label>
                <div className="flex items-center gap-2">
                  <input type="date" value={issueDateStart} onChange={(e) => setIssueDateStart(e.target.value)} className="w-32 px-2 py-2 text-sm border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md bg-slate-50 dark:bg-slate-900"/>
                  <span className="text-slate-400">-</span>
                  <input type="date" value={issueDateEnd} onChange={(e) => setIssueDateEnd(e.target.value)} className="w-32 px-2 py-2 text-sm border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md bg-slate-50 dark:bg-slate-900"/>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Due Date Range</label>
                <div className="flex items-center gap-2">
                  <input type="date" value={dueDateStart} onChange={(e) => setDueDateStart(e.target.value)} className="w-32 px-2 py-2 text-sm border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md bg-slate-50 dark:bg-slate-900"/>
                  <span className="text-slate-400">-</span>
                  <input type="date" value={dueDateEnd} onChange={(e) => setDueDateEnd(e.target.value)} className="w-32 px-2 py-2 text-sm border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md bg-slate-50 dark:bg-slate-900"/>
                </div>
              </div>

              {(statusFilter !== 'ALL' || siteFilter !== 'ALL' || issueDateStart || issueDateEnd || dueDateStart || dueDateEnd) && (<button onClick={() => {
                    setStatusFilter('ALL');
                    setSiteFilter('ALL');
                    setIssueDateStart('');
                    setIssueDateEnd('');
                    setDueDateStart('');
                    setDueDateEnd('');
                }} className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 mt-6">
                  <lucide_react_1.X size={16}/>
                  Clear Filters
                </button>)}
            </div>
          </div>)}
      </div>

      {invoices.length === 0 ? (<div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
          <lucide_react_1.FileText size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4"/>
          <p className="text-slate-500 dark:text-slate-400">No invoices found for this client.</p>
          <button onClick={handleCreateInvoice} className="mt-4 text-blue-600 dark:text-blue-400 hover:underline font-medium">
            Generate first invoice
          </button>
        </div>) : filteredInvoices.length === 0 ? (<div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center">
             <p className="text-slate-500 dark:text-slate-400">No invoices found matching your filters.</p>
          </div>) : (<div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium">Invoice #</th>
                <th className="px-6 py-4 font-medium">Site Name</th>
                <th className="px-6 py-4 font-medium">Date Issued</th>
                <th className="px-6 py-4 font-medium">Due Date</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredInvoices.map((invoice) => {
                var _a;
                return (<tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    {invoice.invoiceNumber}
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                    {((_a = invoice.location) === null || _a === void 0 ? void 0 : _a.name) || '-'}
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                    {new Date(invoice.issueDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                    ${invoice.total.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                      {getStatusIcon(invoice.status)}
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEditInvoice(invoice)} className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="View/Edit">
                        <lucide_react_1.Eye size={18}/>
                      </button>
                      <button onClick={() => handleSendInvoice(invoice)} className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Send Email">
                        <lucide_react_1.Send size={18}/>
                      </button>
                      <button onClick={() => {
                        setSelectedInvoice(invoice);
                        setIsModalOpen(true);
                        // Note: Ideally we open directly in preview mode or have a download handler
                        // But InvoiceModal handles download in preview mode.
                        // So opening modal is fine, or we can trigger download directly if we implement PDF generation logic here.
                        // For now, let's open the modal which has the download button.
                    }} className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Download PDF">
                        <lucide_react_1.Download size={18}/>
                      </button>
                    </div>
                  </td>
                </tr>);
            })}
            </tbody>
          </table>
        </div>)}

      <InvoiceModal_1.default isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} clientId={clientId} clientData={client} invoice={selectedInvoice} onSave={fetchInvoices}/>
    </div>);
}
