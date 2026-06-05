'use client';

import { X, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFashion } from '../../context/fashion-context';
import { formatCurrency } from '../../lib/localization';
import { useBusiness } from '../../context/business-context';
import Image from 'next/image';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { cart, removeFromCart, updateCartQuantity, cartTotal, clearCart } = useFashion();
  const { selectedBusiness } = useBusiness();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-50"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Shopping Cart</h2>
                <span className="text-sm text-slate-500">({cart.length} items)</span>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                  <ShoppingBag size={48} className="mb-4 opacity-20" />
                  <p>Your cart is empty</p>
                  <button 
                    onClick={onClose}
                    className="mt-4 text-indigo-600 font-medium hover:underline"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                cart.map((item) => {
                  const price = item.variant?.salePrice || item.variant?.price || item.product.basePrice;
                  const image = item.variant?.images[0] 
                    ? item.product.images.find(img => img.id === item.variant?.images[0])
                    : item.product.images[0];

                  return (
                    <div key={item.id} className="flex gap-4 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                      <div className="relative w-20 h-20 bg-slate-200 rounded-md overflow-hidden flex-shrink-0">
                        {image && (
                          <Image
                            src={image.url}
                            alt={image.alt}
                            fill
                            className="object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="text-sm font-medium text-slate-900 dark:text-white truncate pr-2">
                            {item.product.name}
                          </h3>
                          <button 
                            onClick={() => removeFromCart(item.id)}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">
                          {item.variant ? `${item.variant.size} / ${item.variant.color}` : 'Standard'}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatCurrency(price, selectedBusiness?.currencyCode)}
                          </span>
                          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 p-1">
                            <button 
                              onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="text-xs w-6 text-center font-medium">{item.quantity}</span>
                            <button 
                              onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white">
                    {formatCurrency(cartTotal, selectedBusiness?.currencyCode)}
                  </span>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={clearCart}
                    className="px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Clear
                  </button>
                  <button 
                    onClick={() => alert('Checkout functionality coming soon!')}
                    className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-500/20"
                  >
                    Checkout
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
