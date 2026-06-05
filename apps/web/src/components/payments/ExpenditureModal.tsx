import React, { useState } from 'react';
import SlideOver from '../ui/SlideOver';
import { DollarSign, FileText, Calendar, Tag, Briefcase, Truck, Shield, Users, Building } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';
import { useBusiness } from '../../context/business-context';
import { getCountryConfig } from '../../lib/localization';

interface ExpenditureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const EXPENSE_CATEGORIES = [
  { id: 'PERSONNEL', label: 'Personnel & Payroll', icon: Users },
  { id: 'EQUIPMENT', label: 'Equipment & Gear', icon: Shield },
  { id: 'VEHICLE', label: 'Fleet & Vehicle', icon: Truck },
  { id: 'LICENSING', label: 'Licensing & Permits (DC/SOMB)', icon: FileText },
  { id: 'INSURANCE', label: 'Insurance', icon: Shield },
  { id: 'OFFICE', label: 'Office & Utilities', icon: Building },
  { id: 'TRAINING', label: 'Training & Certification', icon: Briefcase },
  { id: 'MARKETING', label: 'Marketing & Sales', icon: Tag },
  { id: 'OTHER', label: 'Other', icon: DollarSign },
];

const DC_WARDS = ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5', 'Ward 6', 'Ward 7', 'Ward 8', 'N/A'];

export default function ExpenditureModal({ isOpen, onClose, onSuccess }: ExpenditureModalProps) {
  const { selectedBusiness } = useBusiness();
  const countryConfig = getCountryConfig(selectedBusiness?.country);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    category: 'EQUIPMENT',
    payee: '',
    description: '',
    paymentMethod: 'BANK',
    reference: '',
    dcWard: 'N/A',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        date: new Date(formData.date).toISOString(),
        amount: parseFloat(formData.amount),
        type: 'VENDOR',
        category: formData.category,
        method: formData.paymentMethod,
        status: 'COMPLETED',
        payeeName: formData.payee,
        reference: formData.reference || `EXP-${Date.now()}`,
        dcWard: formData.dcWard,
        description: formData.description,
        notes: formData.notes,
      };

      await api.post('/payments', payload);
      toast.success('Expenditure recorded successfully');
      onSuccess();
      onClose();
      setFormData({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        category: 'EQUIPMENT',
        payee: '',
        description: '',
        paymentMethod: 'BANK',
        reference: '',
        dcWard: 'N/A',
        notes: '',
      });
    } catch (error: any) {
      console.error('Failed to record expenditure', error);
      toast.error(error.response?.data?.message || 'Failed to record expenditure');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SlideOver
      isOpen={isOpen}
      onClose={onClose}
      title="Record Professional Expenditure"
      width="max-w-5xl"
    >
      <form onSubmit={handleSubmit} className="space-y-8 pb-10">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
          <p className="text-sm text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Record operational expenses for DC security agency operations.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Categories */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
              Expense Category
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
              {EXPENSE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: cat.id })}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-sm transition-all text-left group ${
                    formData.category === cat.id
                      ? 'bg-white dark:bg-slate-800 border-indigo-500 ring-1 ring-indigo-500 shadow-md'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm'
                  }`}
                >
                  <div className={`p-2 rounded-lg transition-colors ${
                    formData.category === cat.id 
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' 
                      : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-400'
                  }`}>
                    <cat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className={`block font-semibold ${
                      formData.category === cat.id
                        ? 'text-indigo-900 dark:text-indigo-100'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}>{cat.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Form Fields */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Section 1: Transaction Details */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs">1</span>
                Transaction Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-2.5 text-slate-400 w-5 h-5" />
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="pl-10 block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Amount</label>
                  <div className="relative">
                    <div className="absolute left-3 top-2.5 text-slate-400 font-semibold">
                      {countryConfig.currencySymbol}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="pl-8 block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Payment Method</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['BANK', 'CARD', 'CASH', 'TRANSFER'].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMethod: method })}
                      className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                        formData.paymentMethod === method
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-500 dark:text-indigo-300'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'
                      }`}
                    >
                      {method === 'BANK' && 'Bank / ACH'}
                      {method === 'CARD' && 'Card'}
                      {method === 'CASH' && 'Cash'}
                      {method === 'TRANSFER' && 'Wire'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 2: Payee & Location */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs">2</span>
                Payee & Location
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Vendor / Payee</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DCRA, Uniform Store"
                    value={formData.payee}
                    onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
                    className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">DC Location (Ward)</label>
                  <select
                    value={formData.dcWard}
                    onChange={(e) => setFormData({ ...formData, dcWard: e.target.value })}
                    className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {DC_WARDS.map(ward => (
                      <option key={ward} value={ward}>{ward}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Reference / Receipt #</label>
                <input
                  type="text"
                  placeholder="Optional reference number"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Section 3: Description */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
               <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs">3</span>
                Details
              </h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detailed description of the expenditure..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Additional Notes</label>
                <textarea
                  rows={2}
                  placeholder="Any other details..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="block w-full rounded-lg border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-500/30 disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95"
              >
                {loading ? 'Recording...' : 'Record Expenditure'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </SlideOver>
  );
}
