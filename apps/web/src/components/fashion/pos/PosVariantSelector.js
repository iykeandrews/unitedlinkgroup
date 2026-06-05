"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PosVariantSelector = PosVariantSelector;
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const localization_1 = require("../../../lib/localization");
const business_context_1 = require("../../../context/business-context");
const pos_context_1 = require("../../../context/pos-context");
const framer_motion_1 = require("framer-motion");
const image_1 = __importDefault(require("next/image"));
function PosVariantSelector({ product, onClose }) {
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const { addToCart } = (0, pos_context_1.usePos)();
    if (!product)
        return null;
    return (<PosVariantSelectorInner key={product.id} product={product} onClose={onClose} addToCart={addToCart} selectedBusiness={selectedBusiness}/>);
}
function PosVariantSelectorInner({ product, onClose, addToCart, selectedBusiness, }) {
    var _a;
    const [selectedColor, setSelectedColor] = (0, react_1.useState)(() => {
        const colors = Array.from(new Set(product.variants.map((v) => v.color)));
        return colors.length ? colors[0] : null;
    });
    const [selectedSize, setSelectedSize] = (0, react_1.useState)(null);
    const uniqueColors = Array.from(new Set(product.variants.map((v) => v.color)))
        .map((color) => product.variants.find((v) => v.color === color))
        .filter(Boolean);
    const uniqueSizes = Array.from(new Set(product.variants.map(v => v.size)));
    const selectedVariant = product.variants.find(v => v.color === selectedColor && v.size === selectedSize);
    const isCombinationAvailable = (color, size) => {
        const variant = product.variants.find(v => v.color === color && v.size === size);
        return variant && variant.stockQuantity > 0;
    };
    const handleAddToCart = () => {
        if (selectedVariant) {
            addToCart(product, selectedVariant);
            onClose();
        }
    };
    // Get image for selected color
    const activeImage = selectedColor
        ? (((_a = product.variants.find(v => v.color === selectedColor)) === null || _a === void 0 ? void 0 : _a.images[0])
            ? product.images.find(img => { var _a; return img.id === ((_a = product.variants.find(v => v.color === selectedColor)) === null || _a === void 0 ? void 0 : _a.images[0]); })
            : product.images[0])
        : product.images[0];
    return (<framer_motion_1.AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <framer_motion_1.motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
            {/* Image Section */}
            <div className="w-full md:w-1/3 bg-slate-100 dark:bg-slate-900 relative min-h-[200px] md:min-h-0">
               {activeImage && (<image_1.default src={activeImage.url} alt={product.name} fill className="object-cover"/>)}
               <button onClick={onClose} className="absolute top-4 left-4 md:hidden p-2 bg-white/80 rounded-full">
                 <lucide_react_1.X size={20}/>
               </button>
            </div>

            {/* Content Section */}
            <div className="flex-1 p-6 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">{product.brand}</div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{product.name}</h2>
                </div>
                <button onClick={onClose} className="hidden md:block p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                    <lucide_react_1.X size={24}/>
                </button>
              </div>

              {/* Color Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-3">
                  Color: <span className="text-slate-500 font-normal">{selectedColor}</span>
                </label>
                <div className="flex flex-wrap gap-3">
                    {uniqueColors.map((variant) => (<button key={variant.color} onClick={() => setSelectedColor(variant.color)} className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${selectedColor === variant.color
                ? 'border-indigo-600 ring-2 ring-indigo-600 ring-offset-2'
                : 'border-slate-200 dark:border-slate-600'}`} style={{ backgroundColor: variant.colorCode }} title={variant.color}>
                         {selectedColor === variant.color && <lucide_react_1.Check size={16} className="text-white drop-shadow-md"/>}
                      </button>))}
                </div>
              </div>

              {/* Size Selection */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-3">
                  Size: <span className="text-slate-500 font-normal">{selectedSize}</span>
                </label>
                <div className="grid grid-cols-4 gap-3">
                    {uniqueSizes.map((size) => {
            const available = selectedColor ? isCombinationAvailable(selectedColor, size) : true;
            return (<button key={size} onClick={() => available && setSelectedSize(size)} disabled={!available} className={`py-3 rounded-lg text-sm font-bold border transition-all ${selectedSize === size
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : available
                        ? 'border-slate-200 dark:border-slate-700 hover:border-indigo-600 hover:text-indigo-600 text-slate-700 dark:text-slate-300'
                        : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-300 dark:text-slate-600 cursor-not-allowed decoration-slice'}`}>
                            {size}
                          </button>);
        })}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="mt-auto pt-6 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">Price</div>
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">
                            {selectedVariant
            ? (0, localization_1.formatCurrency)(selectedVariant.salePrice || selectedVariant.price, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)
            : (0, localization_1.formatCurrency)(product.basePrice, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
                        </div>
                    </div>
                    {selectedVariant && (<div className="text-right">
                            <div className="text-sm text-slate-500 dark:text-slate-400">Stock</div>
                            <div className={`font-medium ${selectedVariant.stockQuantity < 5 ? 'text-orange-500' : 'text-emerald-500'}`}>
                                {selectedVariant.stockQuantity} available
                            </div>
                        </div>)}
                </div>

                <button onClick={handleAddToCart} disabled={!selectedVariant} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all">
                    {selectedVariant ? 'Add to Cart' : 'Select Options'}
                </button>
              </div>
            </div>
        </framer_motion_1.motion.div>
      </div>
    </framer_motion_1.AnimatePresence>);
}
