'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Calendar, Filter, Printer, RefreshCw, Eye, Download, Check, Edit2, AlertCircle, ArrowLeft } from 'lucide-react';
import { usePos } from '../../../context/pos-context';
import { Transaction } from '../../../types/fashion';

interface PosHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PosHistoryModal({ isOpen, onClose }: PosHistoryModalProps) {
  const { transactions, returnItem, refundTransaction } = usePos();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [editingItem, setEditingItem] = useState<{ txId: string, variantId: string, currentReason: string } | null>(null);
  const [returnReason, setReturnReason] = useState('');

  // Refund Modal State
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundNote, setRefundNote] = useState('');
  
  // Filter States
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'Refunded'>('All');
  const [showStatusFilter, setShowStatusFilter] = useState(false);

  const filteredTransactions = transactions.filter(tx => {
    // Search
    const matchesSearch = 
      tx.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.cashierName.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Date Range
    let matchesDate = true;
    if (dateRange.start) {
      matchesDate = matchesDate && new Date(tx.date) >= new Date(dateRange.start);
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999); // Include the entire end day
      matchesDate = matchesDate && new Date(tx.date) <= endDate;
    }

    // Status
    const matchesStatus = statusFilter === 'All' || tx.status === statusFilter;

    return matchesSearch && matchesDate && matchesStatus;
  });

  const handleDownloadCSV = () => {
    if (filteredTransactions.length === 0) return;

    // CSV Header
    const headers = ['ID', 'Date', 'Cashier', 'Customer', 'Items', 'Total', 'Status', 'Payment Method'];
    
    // CSV Rows
    const rows = filteredTransactions.map(tx => [
      tx.id,
      new Date(tx.date).toLocaleString(),
      tx.cashierName,
      tx.customerName || 'Guest',
      tx.items.map(i => `${i.quantity}x ${i.productName}`).join('; '),
      tx.total.toFixed(2),
      tx.status,
      tx.paymentMethod
    ]);

    // Combine
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveReturn = () => {
    if (editingItem) {
        returnItem(editingItem.txId, editingItem.variantId, returnReason);
        setEditingItem(null);
        setReturnReason('');
        // Update local selectedTx to reflect changes immediately
        setSelectedTx(prev => {
            if (!prev) return null;
            return {
                ...prev,
                items: prev.items.map(item => 
                    item.variantId === editingItem.variantId 
                        ? { ...item, returned: true, returnReason: returnReason }
                        : item
                )
            };
        });
    }
  };

  const handleRefundSubmit = () => {
    if (selectedTx) {
        const reason = refundNote.trim() || 'Full Transaction Refund';
        refundTransaction(selectedTx.id, reason);
        setSelectedTx(prev => prev ? ({
            ...prev,
            status: 'Refunded',
            items: prev.items.map(item => ({ ...item, returned: true, returnReason: reason }))
        }) : null);
        setShowRefundModal(false);
        setRefundNote('');
    }
  };

  const handlePrintReceipt = (tx: Transaction) => {
    const receiptWindow = window.open('', '_blank', 'width=400,height=600');
    if (receiptWindow) {
      receiptWindow.document.write(`
        <html>
          <head>
            <title>Receipt ${tx.id}</title>
            <style>
              body { font-family: 'Courier New', monospace; padding: 20px; font-size: 14px; }
              .header { text-align: center; margin-bottom: 20px; }
              .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
              .divider { border-top: 1px dashed #000; margin: 10px 0; }
              .total { font-weight: bold; font-size: 16px; margin-top: 10px; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h3>FASHION POS</h3>
              <p>123 Style Avenue, New York, NY</p>
              <p>Tel: (555) 123-4567</p>
              <p>Date: ${new Date(tx.date).toLocaleString()}</p>
              <p>Order: ${tx.id}</p>
              <p>Cashier: ${tx.cashierName}</p>
              ${tx.customerName ? `<p>Customer: ${tx.customerName}</p>` : ''}
            </div>
            <div class="divider"></div>
            ${tx.items.map(item => `
              <div class="item">
                <span>${item.quantity}x ${item.productName} (${item.size})</span>
                <span>$${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            `).join('')}
            <div class="divider"></div>
            <div class="item">
              <span>Subtotal</span>
              <span>$${tx.subtotal.toFixed(2)}</span>
            </div>
            <div class="item">
              <span>Tax (8%)</span>
              <span>$${tx.tax.toFixed(2)}</span>
            </div>
            <div class="item total">
              <span>Total</span>
              <span>$${tx.total.toFixed(2)}</span>
            </div>
             <div class="item">
              <span>Payment Method</span>
              <span>${tx.paymentMethod}</span>
            </div>
            <div class="divider"></div>
            <div class="footer">
              <p>Thank you for shopping with us!</p>
              <p>Please keep this receipt for returns/exchanges.</p>
            </div>
          </body>
        </html>
      `);
      receiptWindow.document.close();
      receiptWindow.print();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden flex flex-col h-[80vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-bold dark:text-white">Transaction History</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <X size={20} className="text-slate-500" />
            </button>
          </div>

          {/* Toolbar */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search transaction ID, customer, or cashier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="relative">
              <button 
                onClick={() => setShowDateFilter(!showDateFilter)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                  dateRange.start || dateRange.end 
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Calendar size={18} />
                Date Range
              </button>
              
              {showDateFilter && (
                <div className="absolute top-full mt-2 left-0 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 z-20">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">Start Date</label>
                      <input 
                        type="date" 
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">End Date</label>
                      <input 
                        type="date" 
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm"
                      />
                    </div>
                    <div className="flex justify-between pt-2">
                        <button 
                            onClick={() => {
                                setDateRange({ start: '', end: '' });
                                setShowDateFilter(false);
                            }}
                            className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        >
                            Clear
                        </button>
                        <button 
                            onClick={() => setShowDateFilter(false)}
                            className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700"
                        >
                            Apply
                        </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
                <button 
                    onClick={() => setShowStatusFilter(!showStatusFilter)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
                        statusFilter !== 'All'
                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                >
                    <Filter size={18} />
                    {statusFilter === 'All' ? 'Filter' : statusFilter}
                </button>

                {showStatusFilter && (
                    <div className="absolute top-full mt-2 right-0 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-20">
                        {(['All', 'Completed', 'Refunded'] as const).map(status => (
                            <button
                                key={status}
                                onClick={() => {
                                    setStatusFilter(status);
                                    setShowStatusFilter(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex justify-between items-center ${
                                    statusFilter === status 
                                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' 
                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                {status}
                                {statusFilter === status && <Check size={14} />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <button 
                onClick={handleDownloadCSV}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Download CSV"
            >
              <Download size={18} />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden flex">
            {/* List */}
            <div className={`${selectedTx ? 'w-1/2 border-r border-slate-200 dark:border-slate-800' : 'w-full'} overflow-y-auto transition-all`}>
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0">
                  <tr>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Total</th>
                    <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredTransactions.map(tx => (
                    <tr 
                      key={tx.id} 
                      onClick={() => setSelectedTx(tx)}
                      className={`cursor-pointer transition-colors ${selectedTx?.id === tx.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                      <td className="p-4 font-medium text-slate-900 dark:text-white">{tx.id}</td>
                      <td className="p-4 text-slate-500 text-sm">
                        {new Date(tx.date).toLocaleDateString()} <br/>
                        <span className="text-xs">{new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </td>
                      <td className="p-4 text-slate-900 dark:text-white">
                        {tx.customerName || <span className="text-slate-400 italic">Guest</span>}
                      </td>
                      <td className="p-4 text-right font-bold text-slate-900 dark:text-white">
                        ${tx.total.toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          tx.status === 'Completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                          tx.status === 'Refunded' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Detail View */}
            {selectedTx && (
              <div className="w-1/2 overflow-y-auto bg-slate-50 dark:bg-slate-900/50 p-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setSelectedTx(null)}
                        className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500"
                        title="Back to List"
                      >
                        <ArrowLeft size={20} />
                      </button>
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedTx.id}</h3>
                        <p className="text-slate-500 text-sm mt-1">
                          {new Date(selectedTx.date).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handlePrintReceipt(selectedTx)}
                        className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-slate-300"
                        title="Print Receipt"
                      >
                        <Printer size={20} />
                      </button>
                      <button 
                         onClick={() => setShowRefundModal(true)}
                         className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-600 dark:text-slate-300"
                         title="Refund Transaction"
                      >
                        <RefreshCw size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Customer Info */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 uppercase tracking-wider">Customer</h4>
                      {selectedTx.customerName ? (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                            {selectedTx.customerName[0]}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white">{selectedTx.customerName}</div>
                            <div className="text-sm text-slate-500">ID: {selectedTx.customerId}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-500 italic">Guest Customer</div>
                      )}
                    </div>

                    {/* Items */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider">Items</h4>
                      <div className="space-y-3">
                        {selectedTx.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-start py-3 border-b border-slate-100 dark:border-slate-700/50 last:border-0 group">
                            <div className="flex-1">
                              <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                {item.productName}
                                {item.returned && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                        RETURNED
                                    </span>
                                )}
                              </div>
                              <div className="text-sm text-slate-500">
                                {item.size} • {item.color} • x{item.quantity}
                              </div>
                              {item.returned && item.returnReason && (
                                  <div className="mt-1 text-xs text-red-600 dark:text-red-400 italic flex items-center gap-1">
                                      <AlertCircle size={12} />
                                      Reason: {item.returnReason}
                                  </div>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="font-medium text-slate-900 dark:text-white">
                                    ${(item.price * item.quantity).toFixed(2)}
                                </div>
                                <button 
                                    onClick={() => {
                                        setEditingItem({ 
                                            txId: selectedTx.id, 
                                            variantId: item.variantId, 
                                            currentReason: item.returnReason || '' 
                                        });
                                        setReturnReason(item.returnReason || '');
                                    }}
                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    title="Edit Return Status"
                                >
                                    <Edit2 size={16} />
                                </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Return Edit Modal */}
                    <AnimatePresence>
                        {editingItem && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center p-4 bg-black/20 backdrop-blur-[1px]">
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700"
                                >
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                                        Return Item
                                    </h3>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Reason for Return
                                        </label>
                                        <textarea
                                            value={returnReason}
                                            onChange={(e) => setReturnReason(e.target.value)}
                                            className="w-full p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
                                            placeholder="e.g., Wrong size, Defective, Changed mind..."
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button 
                                            onClick={() => setEditingItem(null)}
                                            className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={handleSaveReturn}
                                            disabled={!returnReason.trim()}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        >
                                            Save Return
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>

                    {/* Totals */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex justify-between text-slate-500">
                        <span>Subtotal</span>
                        <span>${selectedTx.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Tax</span>
                        <span>${selectedTx.tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xl font-bold text-slate-900 dark:text-white pt-2">
                        <span>Total</span>
                        <span>${selectedTx.total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-slate-500 pt-2">
                        <span>Payment Method</span>
                        <span>{selectedTx.paymentMethod}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Refund Transaction Modal */}
          <AnimatePresence>
            {showRefundModal && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 rounded-2xl"
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-4 mb-6">
                            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
                                <AlertCircle size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Refund Transaction</h3>
                                <p className="text-slate-500 text-sm">
                                    Are you sure you want to refund this entire transaction? This action cannot be undone.
                                </p>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Reason for Refund
                            </label>
                            <textarea
                                value={refundNote}
                                onChange={(e) => setRefundNote(e.target.value)}
                                placeholder="e.g., Customer returned all items, Defective batch..."
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24 text-sm"
                            />
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowRefundModal(false)}
                                className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRefundSubmit}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm shadow-red-600/20"
                            >
                                Confirm Refund
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}