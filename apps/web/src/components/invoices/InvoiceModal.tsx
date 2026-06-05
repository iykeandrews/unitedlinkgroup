'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { X, Plus, Trash2, Download, Send, Printer, Edit2, Eye, Save } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/localization';
import api from '../../lib/api';
import { toast } from 'sonner';
import { useBusiness } from '../../context/business-context';

interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
}

interface Invoice {
  id?: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: string;
  notes?: string;
  items: InvoiceItem[];
  clientId: string;
  client?: any;
  locationId?: string;
}

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientData?: any; // Pass client data to avoid refetching
  invoice?: Invoice; // If provided, edit mode
  onSave: () => void;
}

export default function InvoiceModal({ isOpen, onClose, clientId, clientData, invoice, onSave }: InvoiceModalProps) {
  const { selectedBusiness } = useBusiness();
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState<any>(clientData || null);
  const [locations, setLocations] = useState<any[]>([]);

  const [formData, setFormData] = useState<Invoice>({
    invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'DRAFT',
    notes: '',
    items: [{ description: 'Security Services', quantity: 1, rate: 0 }],
    clientId: clientId,
    locationId: ''
  });

  useEffect(() => {
    if (clientData) {
      setClient(clientData);
    }
  }, [clientData]);

  const fetchClient = useCallback(async () => {
    try {
      const res = await api.get(`/clients/${clientId}`);
      setClient(res.data);
    } catch (error) {
      console.error('Failed to fetch client', error);
      toast.error('Failed to load client details');
    }
  }, [clientId]);

  const fetchLocations = useCallback(async () => {
    try {
      // If we have a client, filter locations by client
      const url = clientId ? `/locations?clientId=${clientId}` : '/locations';
      const res = await api.get(url);
      setLocations(res.data);
    } catch (error) {
      console.error('Failed to fetch locations', error);
    }
  }, [clientId]);

  useEffect(() => {
    if (isOpen) {
      if (invoice) {
        setFormData({
          ...invoice,
          clientId: clientId // Ensure clientId is set
        });
        setMode('preview'); // Default to preview for existing invoices
      } else {
        // Reset for new invoice
        setFormData({
          invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
          issueDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'DRAFT',
          notes: '',
          items: [{ description: 'Security Services', quantity: 1, rate: 0 }],
          clientId: clientId
        });
        setMode('edit');
      }
      
      if (!client && clientId) {
        fetchClient();
      }
      fetchLocations();
    }
  }, [isOpen, invoice, clientId, client, fetchClient, fetchLocations]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, rate: 0 }]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const newItems = [...formData.items];
      newItems.splice(index, 1);
      setFormData(prev => ({ ...prev, items: newItems }));
    }
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  };

  const calculateTax = () => {
    // Assuming 0 tax for now or add a tax field
    return 0;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {
        ...formData,
        locationId: formData.locationId === '' ? undefined : formData.locationId
      };
      
      console.log('Sending invoice payload:', payload);

      if (invoice?.id) {
        await api.patch(`/invoices/${invoice.id}`, payload);
        toast.success('Invoice updated successfully');
      } else {
        await api.post('/invoices', payload);
        toast.success('Invoice created successfully');
      }
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Failed to save invoice', error.response?.data || error);
      const message = error.response?.data?.message;
      if (Array.isArray(message)) {
          toast.error(`Validation error: ${message.join(', ')}`);
      } else {
          toast.error(message || 'Failed to save invoice');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!invoice?.id) {
        toast.error('Please save the invoice before sending');
        return;
    }
    try {
        await api.post(`/invoices/${invoice.id}/send`);
        toast.success('Invoice sent successfully!');
        setFormData(prev => ({ ...prev, status: 'SENT' }));
        onSave();
    } catch (error: any) {
        console.error('Failed to send invoice', error?.response?.data || error);
        const raw = error?.response?.data?.message || 'Failed to send invoice';
        const message =
          typeof raw === 'string' ? raw : Array.isArray(raw) ? raw.join(', ') : (() => { try { return JSON.stringify(raw); } catch { return String(raw); } })();
        toast.error(message);
    }
  };

  const handleDownloadPDF = () => {
    // For now, trigger print which allows saving as PDF
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-5xl my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 rounded-t-lg sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {mode === 'edit' ? (invoice ? 'Edit Invoice' : 'New Invoice') : `Invoice #${formData.invoiceNumber}`}
            </h3>
            <div className="flex bg-gray-200 dark:bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => setMode('edit')}
                className={`px-3 py-1 text-sm rounded-md transition-all ${mode === 'edit' ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
              >
                Edit
              </button>
              <button
                onClick={() => setMode('preview')}
                className={`px-3 py-1 text-sm rounded-md transition-all ${mode === 'preview' ? 'bg-white dark:bg-slate-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
              >
                Preview
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {mode === 'preview' && (
              <>
                <button onClick={handleSendEmail} className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors" title="Send Email">
                  <Send size={20} />
                </button>
                <button onClick={handleDownloadPDF} className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors" title="Download PDF">
                  <Download size={20} />
                </button>
                <button onClick={() => window.print()} className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors" title="Print">
                  <Printer size={20} />
                </button>
              </>
            )}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50 dark:bg-slate-900">
          {mode === 'edit' ? (
            <div className="space-y-6 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
              {/* Invoice Details Form */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Invoice Number</label>
                  <input
                    type="text"
                    name="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issue Date</label>
                  <input
                    type="date"
                    name="issueDate"
                    value={formData.issueDate}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    name="dueDate"
                    value={formData.dueDate}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2 border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2 border"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="SENT">Sent</option>
                    <option value="PAID">Paid</option>
                    <option value="OVERDUE">Overdue</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location / Site</label>
                  <select
                    name="locationId"
                    value={formData.locationId || ''}
                    onChange={handleInputChange}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2 border"
                  >
                    <option value="">-- None --</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name} {loc.address ? `- ${loc.address}` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Line Items</h4>
                <div className="space-y-4">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-gray-50 dark:bg-slate-900/50 p-4 rounded-lg border border-gray-100 dark:border-slate-700">
                      <div className="flex-1 w-full">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2 border text-sm"
                          placeholder="Item description"
                        />
                      </div>
                      <div className="w-full md:w-24">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2 border text-sm"
                        />
                      </div>
                      <div className="w-full md:w-32">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Rate</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-500">
                            {formatCurrency(0, selectedBusiness?.currencyCode).replace(/[0-9.,\s]/g, '')}
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value))}
                            className="w-full pl-8 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2 border text-sm"
                          />
                        </div>
                      </div>
                      <div className="w-full md:w-32">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Amount</label>
                        <div className="py-2 text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(item.quantity * item.rate, selectedBusiness?.currencyCode)}
                        </div>
                      </div>
                      <button
                        onClick={() => removeItem(index)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors mt-6 md:mt-0"
                        title="Remove Item"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addItem}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                  >
                    <Plus size={16} />
                    Add Item
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes / Terms</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white p-2 border"
                  placeholder="Payment terms, bank details, or thank you note..."
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-700">
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Subtotal</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(calculateSubtotal(), selectedBusiness?.currencyCode)}</p>
                  {/* Tax could be added here */}
                  <div className="my-2 border-t border-gray-100 dark:border-slate-700 w-full"></div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(calculateTotal(), selectedBusiness?.currencyCode)}</p>
                </div>
              </div>
            </div>
          ) : (
            /* Preview Mode - Professional Invoice Design */
            <div id="invoice-preview" className="bg-white text-slate-900 p-8 md:p-12 rounded-xl shadow-lg border border-gray-200 max-w-4xl mx-auto print:shadow-none print:border-none print:w-full print:max-w-none">
              {/* Header */}
              <div className="flex justify-between items-start mb-12">
                <div>
                   {/* Logo */}
                  {selectedBusiness?.logoUrl ? (
                      <Image 
                        src={selectedBusiness.logoUrl} 
                        alt="Company Logo" 
                        width={0}
                        height={0}
                        sizes="100vw"
                        style={{ width: 'auto', height: '64px' }}
                        className="object-contain mb-4" 
                      />
                  ) : (
                    <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl mb-4">
                      {selectedBusiness?.name ? selectedBusiness.name.substring(0, 2).toUpperCase() : 'UL'}
                    </div>
                  )}
                  <h1 className="text-3xl font-bold text-slate-900">INVOICE</h1>
                  <p className="text-slate-500 mt-1">#{formData.invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-bold text-slate-900">{selectedBusiness?.name || 'United Link Group'}</h2>
                  <p className="text-slate-600 text-sm mt-1">{selectedBusiness?.businessType || 'Security Services'}</p>
                  
                  {selectedBusiness?.address && <p className="text-slate-600 text-sm">{selectedBusiness.address}</p>}
                  {(selectedBusiness?.city || selectedBusiness?.state || selectedBusiness?.zip) && (
                      <p className="text-slate-600 text-sm">
                          {[selectedBusiness.city, selectedBusiness.state, selectedBusiness.zip].filter(Boolean).join(', ')}
                      </p>
                  )}
                  {selectedBusiness?.country && <p className="text-slate-600 text-sm">{selectedBusiness.country}</p>}
                  
                  <p className="text-slate-600 text-sm mt-1">support@{selectedBusiness?.name?.toLowerCase().replace(/\s+/g, '') || 'unitedlinkgroup'}.com</p>
                  <p className="text-slate-600 text-sm">{selectedBusiness?.mobile || '+1 (555) 123-4567'}</p>
                </div>
              </div>

              {/* Bill To & Details */}
              <div className="flex justify-between mb-12">
                <div>
                  <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Bill To</h3>
                  <div className="text-slate-800">
                    <p className="font-bold text-lg">{client?.name || 'Client Name'}</p>
                    {client?.address && <p className="text-sm">{client.address}</p>}
                    {client?.city && <p className="text-sm">{client.city}, {client.state} {client.zip}</p>}
                    {client?.country && <p className="text-sm">{client.country}</p>}
                    {client?.billingContactEmail && <p className="text-sm mt-2 text-slate-600">{client.billingContactEmail}</p>}
                    
                    {formData.locationId && locations.find(l => l.id === formData.locationId) && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Service Location</p>
                          <p className="text-sm font-medium">{locations.find(l => l.id === formData.locationId)?.name}</p>
                          <p className="text-sm">{locations.find(l => l.id === formData.locationId)?.address}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Issue Date</h3>
                    <p className="text-slate-800 font-medium">{new Date(formData.issueDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Due Date</h3>
                    <p className="text-slate-800 font-medium">{new Date(formData.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div className="mt-4">
                     <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        formData.status === 'PAID' ? 'bg-green-100 text-green-800' :
                        formData.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                        'bg-slate-100 text-slate-800'
                     }`}>
                        {formData.status}
                     </span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full mb-8">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider">Description</th>
                    <th className="text-right py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider">Qty</th>
                    <th className="text-right py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider">Rate</th>
                    <th className="text-right py-3 text-sm font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {formData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="py-4 text-slate-800">{item.description}</td>
                      <td className="py-4 text-right text-slate-600">{item.quantity}</td>
                      <td className="py-4 text-right text-slate-600">{formatCurrency(item.rate, selectedBusiness?.currencyCode)}</td>
                      <td className="py-4 text-right text-slate-900 font-medium">{formatCurrency(item.quantity * item.rate, selectedBusiness?.currencyCode)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end border-t border-slate-200 pt-8">
                <div className="w-64 space-y-3">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>{formatCurrency(calculateSubtotal(), selectedBusiness?.currencyCode)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tax (0%)</span>
                    <span>{formatCurrency(0, selectedBusiness?.currencyCode)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-slate-900 border-t border-slate-200 pt-3">
                    <span>Total</span>
                    <span>{formatCurrency(calculateTotal(), selectedBusiness?.currencyCode)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {formData.notes && (
                <div className="mt-12 pt-8 border-t border-slate-100">
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Notes & Terms</h4>
                  <p className="text-sm text-slate-600 whitespace-pre-line">{formData.notes}</p>
                </div>
              )}
              
              {/* Footer */}
              <div className="mt-12 text-center text-xs text-slate-400">
                <p>Thank you for your business!</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-b-lg flex justify-between items-center sticky bottom-0 z-10">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {mode === 'edit' ? 'All changes are local until saved.' : 'Preview mode'}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            {mode === 'edit' ? (
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Save size={18} />
                {loading ? 'Saving...' : 'Save Invoice'}
              </button>
            ) : (
               <button
                onClick={() => setMode('edit')}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Edit2 size={18} />
                Back to Edit
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-preview, #invoice-preview * {
            visibility: visible;
          }
          #invoice-preview {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            box-shadow: none;
            border: none;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
