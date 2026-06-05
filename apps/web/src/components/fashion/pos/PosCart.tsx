import { Trash2, Plus, Minus, User, CreditCard, Banknote, Smartphone, X } from 'lucide-react';
import { usePos } from '../../../context/pos-context';
import { formatCurrency } from '../../../lib/localization';
import { useBusiness } from '../../../context/business-context';
import Image from 'next/image';

interface PosCartProps {
  onAddCustomerClick: () => void;
}

export function PosCart({ onAddCustomerClick }: PosCartProps) {
  const { 
    cart, 
    removeFromCart, 
    updateQuantity, 
    clearCart,
    subtotal, 
    tax, 
    total,
    totalItems,
    setIsCheckoutModalOpen,
    selectedCustomer,
    selectCustomer
  } = usePos();
  const { selectedBusiness } = useBusiness();

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700">
      {/* Customer Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between min-h-[72px]">
        {selectedCustomer ? (
           <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                      {selectedCustomer.firstName[0]}
                  </div>
                  <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-white leading-tight">
                        {selectedCustomer.firstName} {selectedCustomer.lastName}
                      </span>
                      <span className="text-xs text-slate-500">
                        {selectedCustomer.phone}
                      </span>
                  </div>
              </div>
              <button 
                onClick={() => selectCustomer(null)} 
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 hover:text-red-500 transition-colors"
                title="Remove Customer"
              >
                  <X size={18} />
              </button>
           </div>
        ) : (
            <button 
              onClick={onAddCustomerClick}
              className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-50 dark:hover:bg-indigo-900/20 px-3 py-2 rounded-lg transition-colors w-full"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                 <User size={18} />
              </div>
              <span>Add Customer</span>
            </button>
        )}
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4">
              <span className="text-2xl font-bold">0</span>
            </div>
            <p>Cart is empty</p>
          </div>
        ) : (
          cart.map((item) => {
             const image = item.product.images.find(img => img.id === item.variant.images[0]) || item.product.images[0];
             return (
              <div key={item.variant.id} className="flex gap-3 bg-slate-50 dark:bg-slate-700/30 p-3 rounded-xl">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-white flex-shrink-0 border border-slate-200 dark:border-slate-600">
                  {image && (
                    <Image src={image.url} alt={item.product.name} fill className="object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-900 dark:text-white truncate">
                    {item.product.name}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {item.variant.size} • {item.variant.color}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency((item.variant.salePrice || item.variant.price) * item.quantity, selectedBusiness?.currencyCode)}
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => updateQuantity(item.variant.id, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-500"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.variant.id, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-500"
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

      {/* Totals Section */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal, selectedBusiness?.currencyCode)}</span>
          </div>
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Tax (8%)</span>
            <span>{formatCurrency(tax, selectedBusiness?.currencyCode)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
            <span>Total</span>
            <span>{formatCurrency(total, selectedBusiness?.currencyCode)}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-3">
          <button className="flex flex-col items-center justify-center p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs gap-1">
            <Banknote size={20} />
            Cash
          </button>
          <button className="flex flex-col items-center justify-center p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs gap-1">
            <CreditCard size={20} />
            Card
          </button>
          <button className="flex flex-col items-center justify-center p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs gap-1">
            <Smartphone size={20} />
            App
          </button>
           <button 
             onClick={clearCart}
             className="flex flex-col items-center justify-center p-2 bg-white dark:bg-slate-800 rounded-lg border border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs gap-1"
           >
            <Trash2 size={20} />
            Clear
          </button>
        </div>

        <button 
          onClick={() => setIsCheckoutModalOpen(true)}
          disabled={cart.length === 0}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-between px-6 transition-all"
        >
          <span>Checkout</span>
          <span>{formatCurrency(total, selectedBusiness?.currencyCode)}</span>
        </button>
      </div>
    </div>
  );
}
