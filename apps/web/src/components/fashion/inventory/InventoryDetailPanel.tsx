import React from 'react';
import { X, Calendar, User, Package, History, CreditCard, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInventory } from '../../../context/inventory-context';
import { ProductVariant } from '../../../types/fashion';

interface InventoryDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  variantId: string;
}

export default function InventoryDetailPanel({ isOpen, onClose, productId, variantId }: InventoryDetailPanelProps) {
  const { products, stockLogs } = useInventory();

  const product = products.find(p => p.id === productId);
  const variant = product?.variants.find(v => v.id === variantId);

  if (!product || !variant) return null;

  const itemLogs = stockLogs.filter(log => log.variantId === variantId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Mock Purchase History
  const purchaseHistory = [
    { id: 'po-1', date: '2023-10-15', supplier: 'Fashion Supplier Inc', quantity: 50, cost: variant.costPrice || 25 },
    { id: 'po-2', date: '2023-08-01', supplier: 'Fashion Supplier Inc', quantity: 100, cost: variant.costPrice || 25 },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-700 overflow-y-auto"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{product.name}</h2>
                  <div className="flex items-center gap-3 text-slate-500">
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-sm font-mono">{variant.sku}</span>
                    <span>•</span>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full border border-slate-300" style={{ backgroundColor: variant.colorCode }}></span>
                      <span>{variant.color} / {variant.size}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X size={24} className="text-slate-500" />
                </button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <div className="text-sm text-slate-500 mb-1">Current Stock</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">{variant.stockQuantity}</div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <div className="text-sm text-slate-500 mb-1">Cost Price</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">${variant.costPrice || product.basePrice * 0.4}</div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <div className="text-sm text-slate-500 mb-1">Retail Price</div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">${variant.price || product.basePrice}</div>
                </div>
              </div>

              {/* Tabs / Sections */}
              <div className="space-y-8">
                {/* Stock History */}
                <section>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <History size={20} className="text-indigo-500" />
                    Stock Movement History
                  </h3>
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500">
                        <tr>
                          <th className="p-3">Date</th>
                          <th className="p-3">Type</th>
                          <th className="p-3">Change</th>
                          <th className="p-3">New Qty</th>
                          <th className="p-3">User</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {itemLogs.length > 0 ? itemLogs.map(log => (
                          <tr key={log.id}>
                            <td className="p-3 text-slate-500">{new Date(log.timestamp).toLocaleDateString()}</td>
                            <td className="p-3 font-medium text-slate-700 dark:text-slate-300">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                log.changeAmount > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {log.reason}
                              </span>
                            </td>
                            <td className={`p-3 font-bold ${log.changeAmount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {log.changeAmount > 0 ? '+' : ''}{log.changeAmount}
                            </td>
                            <td className="p-3 text-slate-900 dark:text-white">{log.newQuantity}</td>
                            <td className="p-3 text-slate-500">{log.userName}</td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-500">No stock history recorded yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Purchase Orders */}
                <section>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Truck size={20} className="text-blue-500" />
                    Recent Purchase Orders
                  </h3>
                  <div className="space-y-3">
                    {purchaseHistory.map(po => (
                      <div key={po.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">{po.supplier}</div>
                          <div className="text-xs text-slate-500">PO: {po.id} • {po.date}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-900 dark:text-white">+{po.quantity} Units</div>
                          <div className="text-xs text-slate-500">@ ${po.cost}/unit</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Locations (Mock) */}
                 <section>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Package size={20} className="text-amber-500" />
                    Stock Locations
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">Main Warehouse</div>
                        <div className="text-xs text-slate-500">Aisle 4, Shelf B</div>
                      </div>
                      <div className="font-bold text-slate-900 dark:text-white">{variant.stockQuantity}</div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center opacity-50">
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">Downtown Store</div>
                        <div className="text-xs text-slate-500">Back Room</div>
                      </div>
                      <div className="font-bold text-slate-900 dark:text-white">0</div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
