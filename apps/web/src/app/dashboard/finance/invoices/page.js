"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = InvoicesPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const api_1 = __importDefault(require("../../../../lib/api"));
const Modal_1 = require("@/components/Modal");
const lucide_react_1 = require("lucide-react");
const AddressAutocomplete_1 = __importDefault(require("../../../../components/ui/AddressAutocomplete"));
const InvoiceModal_1 = __importDefault(require("../../../../components/invoices/InvoiceModal"));
const business_context_1 = require("../../../../context/business-context");
const localization_1 = require("../../../../lib/localization");
function InvoicesPage() {
    const router = (0, navigation_1.useRouter)();
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const [activeTab, setActiveTab] = (0, react_1.useState)('invoices');
    const [invoices, setInvoices] = (0, react_1.useState)([]);
    const [clients, setClients] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [statusFilter, setStatusFilter] = (0, react_1.useState)('ALL');
    const [isFilterOpen, setIsFilterOpen] = (0, react_1.useState)(false);
    // Modals
    const [isClientModalOpen, setIsClientModalOpen] = (0, react_1.useState)(false);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = (0, react_1.useState)(false);
    const [selectedClientForInvoice, setSelectedClientForInvoice] = (0, react_1.useState)(null);
    // Client Form
    const [clientForm, setClientForm] = (0, react_1.useState)({ name: '', email: '', phone: '', address: '' });
    const [submitting, setSubmitting] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        fetchData();
    }, [activeTab]);
    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'invoices') {
                const [invRes, cliRes] = await Promise.all([
                    api_1.default.get('/invoices'),
                    api_1.default.get('/invoices/clients') // Need clients for creating invoice too
                ]);
                setInvoices(invRes.data);
                setClients(cliRes.data);
            }
            else {
                const res = await api_1.default.get('/invoices/clients');
                setClients(res.data);
            }
        }
        catch (err) {
            console.error('Failed to fetch data', err);
        }
        finally {
            setLoading(false);
        }
    };
    const handleCreateClient = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api_1.default.post('/invoices/clients', clientForm);
            setIsClientModalOpen(false);
            setClientForm({ name: '', email: '', phone: '', address: '' });
            fetchData();
        }
        catch (err) {
            console.error('Failed to create client', err);
        }
        finally {
            setSubmitting(false);
        }
    };
    // New invoice creation now uses the same modal as client account page
    const filteredInvoices = invoices.filter(inv => {
        var _a, _b, _c;
        const matchesSearch = ((_a = inv.invoiceNumber) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(searchQuery.toLowerCase())) ||
            ((_c = (_b = inv.client) === null || _b === void 0 ? void 0 : _b.name) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
        return matchesSearch && matchesStatus;
    });
    return (<div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices & Billing</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage client invoices and payments</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <lucide_react_1.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5"/>
            <input type="text" placeholder="Search invoices..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"/>
          </div>
          {activeTab === 'invoices' && (<button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${isFilterOpen
                ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
                : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-600'}`}>
              <lucide_react_1.Filter size={20}/>
              Filters
            </button>)}
          {activeTab === 'invoices' ? (<button onClick={() => {
                setSelectedClientForInvoice(null);
                setIsInvoiceModalOpen(true);
            }} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              <lucide_react_1.Plus className="h-4 w-4 mr-2"/>
              New Invoice
            </button>) : (<button onClick={() => setIsClientModalOpen(true)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
              <lucide_react_1.Plus className="h-4 w-4 mr-2"/>
              New Client
            </button>)}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-8">
          <button onClick={() => setActiveTab('invoices')} className={`${activeTab === 'invoices'
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}>
            <lucide_react_1.FileText className="h-4 w-4 mr-2"/>
            Invoices
          </button>
          <button onClick={() => setActiveTab('clients')} className={`${activeTab === 'clients'
            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}>
            <lucide_react_1.Users className="h-4 w-4 mr-2"/>
            Clients
          </button>
        </nav>
      </div>

      {loading ? (<div className="flex justify-center p-8">
           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>) : (<>
          {activeTab === 'invoices' && (<div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
               {isFilterOpen && (<div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-6">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-slate-800">
                          <option value="ALL">All Statuses</option>
                          <option value="DRAFT">Draft</option>
                          <option value="SENT">Sent</option>
                          <option value="PAID">Paid</option>
                          <option value="OVERDUE">Overdue</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </div>
                      
                      {(statusFilter !== 'ALL') && (<button onClick={() => setStatusFilter('ALL')} className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 mt-6">
                          <lucide_react_1.X size={16}/>
                          Clear Filters
                        </button>)}
                    </div>
                 </div>)}
              <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Invoice #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                  {invoices.length === 0 ? (<tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">No invoices found</td>
                     </tr>) : filteredInvoices.length === 0 ? (<tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">No invoices found matching your filters.</td>
                     </tr>) : (filteredInvoices.map((inv) => {
                    var _a;
                    return (<tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{inv.invoiceNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{(_a = inv.client) === null || _a === void 0 ? void 0 : _a.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{(0, localization_1.formatDate)(inv.issueDate, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{(0, localization_1.formatDate)(inv.dueDate, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">{(0, localization_1.formatCurrency)(inv.total, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${inv.status === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {inv.status || 'DRAFT'}
                          </span>
                        </td>
                      </tr>);
                }))}
                </tbody>
              </table>
            </div>)}

          {activeTab === 'clients' && (<div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
               <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                <thead className="bg-gray-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Address</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                  {clients.length === 0 ? (<tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">No clients found</td>
                     </tr>) : (clients.map((client) => (<tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{client.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{client.email || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{client.phone || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{client.address || '-'}</td>
                      </tr>)))}
                </tbody>
              </table>
            </div>)}
        </>)}

      {/* New Client Modal */}
      <Modal_1.Modal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} title="Add New Client">
        <form onSubmit={handleCreateClient} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Client Name</label>
                <input type="text" required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2 border" value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })}/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input type="email" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2 border" value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })}/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                <input type="text" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2 border" value={clientForm.phone} onChange={e => setClientForm({ ...clientForm, phone: e.target.value })}/>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address</label>
                <AddressAutocomplete_1.default value={clientForm.address} onChange={(val) => setClientForm({ ...clientForm, address: val })} onSelect={(data) => setClientForm({ ...clientForm, address: data.address })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2 border"/>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setIsClientModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-slate-700 dark:text-gray-300 dark:border-slate-600 dark:hover:bg-slate-600">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">Create Client</button>
            </div>
        </form>
      </Modal_1.Modal>

      {/* Select Client then open identical InvoiceModal */}
      <Modal_1.Modal isOpen={isInvoiceModalOpen && !selectedClientForInvoice} onClose={() => { setIsInvoiceModalOpen(false); setSelectedClientForInvoice(null); }} title="Select Client for Invoice">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Client</label>
            <select required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2 border" value={selectedClientForInvoice || ''} onChange={(e) => setSelectedClientForInvoice(e.target.value)}>
              <option value="">Select Client</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button type="button" onClick={() => { setIsInvoiceModalOpen(false); setSelectedClientForInvoice(null); }} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:bg-slate-700 dark:text-gray-300 dark:border-slate-600 dark:hover:bg-slate-600">
              Cancel
            </button>
            <button type="button" disabled={!selectedClientForInvoice} onClick={() => {
            if (selectedClientForInvoice) {
                // Proceed to InvoiceModal
            }
        }} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              Continue
            </button>
          </div>
        </div>
      </Modal_1.Modal>

      <InvoiceModal_1.default isOpen={!!selectedClientForInvoice && isInvoiceModalOpen} onClose={() => { setIsInvoiceModalOpen(false); setSelectedClientForInvoice(null); }} clientId={selectedClientForInvoice || ''} clientData={clients.find((c) => c.id === selectedClientForInvoice)} onSave={() => {
            fetchData();
            if (selectedClientForInvoice) {
                router.push(`/dashboard/security/clients/${selectedClientForInvoice}`);
            }
        }}/>
    </div>);
}
