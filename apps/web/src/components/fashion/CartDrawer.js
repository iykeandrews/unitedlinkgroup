"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CartDrawer = CartDrawer;
const lucide_react_1 = require("lucide-react");
const framer_motion_1 = require("framer-motion");
const fashion_context_1 = require("../../context/fashion-context");
const localization_1 = require("../../lib/localization");
const business_context_1 = require("../../context/business-context");
const image_1 = __importDefault(require("next/image"));
function CartDrawer({ isOpen, onClose }) {
    const { cart, removeFromCart, updateCartQuantity, cartTotal, clearCart } = (0, fashion_context_1.useFashion)();
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    return (<framer_motion_1.AnimatePresence>
      {isOpen && (<>
          <framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black z-50"/>
          <framer_motion_1.motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-slate-800 shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <lucide_react_1.ShoppingBag className="w-5 h-5 text-indigo-600"/>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Shopping Cart</h2>
                <span className="text-sm text-slate-500">({cart.length} items)</span>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                <lucide_react_1.X size={20}/>
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (<div className="flex flex-col items-center justify-center h-64 text-slate-500">
                  <lucide_react_1.ShoppingBag size={48} className="mb-4 opacity-20"/>
                  <p>Your cart is empty</p>
                  <button onClick={onClose} className="mt-4 text-indigo-600 font-medium hover:underline">
                    Continue Shopping
                  </button>
                </div>) : (cart.map((item) => {
                var _a, _b, _c;
                const price = ((_a = item.variant) === null || _a === void 0 ? void 0 : _a.salePrice) || ((_b = item.variant) === null || _b === void 0 ? void 0 : _b.price) || item.product.basePrice;
                const image = ((_c = item.variant) === null || _c === void 0 ? void 0 : _c.images[0])
                    ? item.product.images.find(img => { var _a; return img.id === ((_a = item.variant) === null || _a === void 0 ? void 0 : _a.images[0]); })
                    : item.product.images[0];
                return (<div key={item.id} className="flex gap-4 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                      <div className="relative w-20 h-20 bg-slate-200 rounded-md overflow-hidden flex-shrink-0">
                        {image && (<image_1.default src={image.url} alt={image.alt} fill className="object-cover"/>)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="text-sm font-medium text-slate-900 dark:text-white truncate pr-2">
                            {item.product.name}
                          </h3>
                          <button onClick={() => removeFromCart(item.id)} className="text-slate-400 hover:text-red-500">
                            <lucide_react_1.Trash2 size={16}/>
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">
                          {item.variant ? `${item.variant.size} / ${item.variant.color}` : 'Standard'}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {(0, localization_1.formatCurrency)(price, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
                          </span>
                          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600 p-1">
                            <button onClick={() => updateCartQuantity(item.id, item.quantity - 1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                              <lucide_react_1.Minus size={14}/>
                            </button>
                            <span className="text-xs w-6 text-center font-medium">{item.quantity}</span>
                            <button onClick={() => updateCartQuantity(item.id, item.quantity + 1)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
                              <lucide_react_1.Plus size={14}/>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>);
            }))}
            </div>

            {/* Footer */}
            {cart.length > 0 && (<div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="text-xl font-bold text-slate-900 dark:text-white">
                    {(0, localization_1.formatCurrency)(cartTotal, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
                  </span>
                </div>
                <div className="flex gap-3">
                  <button onClick={clearCart} className="px-4 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    Clear
                  </button>
                  <button onClick={() => alert('Checkout functionality coming soon!')} className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-500/20">
                    Checkout
                  </button>
                </div>
              </div>)}
          </framer_motion_1.motion.div>
        </>)}
    </framer_motion_1.AnimatePresence>);
}
