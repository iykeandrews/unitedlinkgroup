'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Plus,
  Building,
  MapPin,
  Phone,
  Mail,
  MoreHorizontal,
  Download
} from 'lucide-react';
import { useBusiness } from '@/context/business-context';
import { clientAddress, clientRecipients } from '@/components/billing/BillingReferences';
import { downloadCsv } from '@/lib/time/records';
import api from '../../../../lib/api';

interface Client {
  [key: string]: any;
  id: string;
  name: string;
  type: string;
  industry: string;
  status: string;
  contactPerson: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  _count?: {
    locations: number;
  };
}

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const { selectedBusiness } = useBusiness();
  const requestVersion = useRef(0);
  const [error, setError] = useState('');
  useEffect(() => { setClients([]); fetchClients(); return () => { requestVersion.current++; }; }, [selectedBusiness?.id]);
  const fetchClients = async () => {
    const version = ++requestVersion.current;
    setError(''); setLoading(true);
    if (!selectedBusiness?.id) { setLoading(false); return; }
    try {
      const res = await api.get('/clients', {headers: {'x-business-id': selectedBusiness.id}});
      if (version === requestVersion.current) setClients(res.data);
    } catch { if (version === requestVersion.current) {setClients([]); setError('Unable to load clients. Please retry.');} }
    finally { if (version === requestVersion.current) setLoading(false); }
  };

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExport = () => downloadCsv([
    ['Name','Type','Status','Contact','Phone','Billing address','Invoice To','Invoice CC','Locations'],
    ...filteredClients.map(client => {const recipients = clientRecipients(client); return [client.name,client.type,client.status,client.contactPerson || '',client.phone || '',clientAddress(client),recipients.to,recipients.cc.join('; '),client._count?.locations || 0];}),
  ], 'clients.csv');

  return (
    <div className="py-8">
      {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error} <button onClick={fetchClients} className="underline font-semibold">Retry</button></div>}
      {!selectedBusiness && <p className="mb-4 text-slate-500">Select a business to manage clients.</p>}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Client Accounts</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your security clients and their details.</p>
        </div>
        <div className="flex gap-2">
            <button
            disabled={loading || !!error || !filteredClients.length}
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
            >
            <Download size={20} />
            Export CSV
            </button>
            <button
            onClick={() => router.push('/dashboard/security/clients/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
            <Plus size={20} />
            Add Client
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Client List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client Name</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type / Industry</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sites</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">Loading clients...</td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">No clients found.</td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr 
                    key={client.id} 
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/dashboard/security/clients/${client.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                          <Building size={20} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">{client.name}</p>
                          <p className="text-xs text-slate-500">{clientRecipients(client).cc.length} invoice CC recipient(s)</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-900 dark:text-white">{client.type}</p>
                      <p className="text-xs text-slate-500">{client.industry || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{client.contactPerson}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Mail size={12} /> {clientRecipients(client).to || "Billing email not entered"}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Phone size={12} /> {client.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <MapPin size={16} className="text-slate-400" />
                        <span className="whitespace-pre-line">{clientAddress(client) || "Address not entered"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        client.status === 'ACTIVE' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {client._count?.locations || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <MoreHorizontal size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
