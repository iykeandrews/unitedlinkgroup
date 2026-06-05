"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductDetailModal = ProductDetailModal;
const lucide_react_1 = require("lucide-react");
const framer_motion_1 = require("framer-motion");
const localization_1 = require("../../lib/localization");
const business_context_1 = require("../../context/business-context");
const fashion_context_1 = require("../../context/fashion-context");
const image_1 = __importDefault(require("next/image"));
const react_1 = require("react");
function ProductDetailModal({ product, onClose }) {
    var _a;
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const { addToCart, toggleWishlist, isInWishlist } = (0, fashion_context_1.useFashion)();
    const [selectedImageId, setSelectedImageId] = (0, react_1.useState)(((_a = product.images.find(img => img.isPrimary)) === null || _a === void 0 ? void 0 : _a.id) || product.images[0].id);
    const [selectedSize, setSelectedSize] = (0, react_1.useState)(null);
    const [selectedColor, setSelectedColor] = (0, react_1.useState)(null);
    const activeImage = product.images.find(img => img.id === selectedImageId);
    const uniqueColors = Array.from(new Set(product.variants.map(v => v.color))).map(color => product.variants.find(v => v.color === color));
    const uniqueSizes = Array.from(new Set(product.variants.map(v => v.size)));
    const inWishlist = isInWishlist(product.id);
    const handleAddToCart = () => {
        if (!selectedSize || !selectedColor) {
            alert('Please select a size and color first.');
            return;
        }
        const variant = product.variants.find(v => v.size === selectedSize && v.color === selectedColor);
        if (variant) {
            addToCart(product, variant);
            // Optional: Toast or close modal
            onClose();
        }
        else {
            alert('This combination is currently unavailable.');
        }
    };
    return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      
      <framer_motion_1.motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="relative w-full max-w-5xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-white/80 dark:bg-black/20 backdrop-blur-sm rounded-full hover:bg-white dark:hover:bg-black/40 transition-colors">
          <lucide_react_1.X size={20}/>
        </button>

        {/* Image Gallery */}
        <div className="w-full md:w-1/2 bg-slate-100 dark:bg-slate-900 flex flex-col">
          <div className="relative flex-1 min-h-[300px] md:min-h-0">
            {activeImage && (<image_1.default src={activeImage.url} alt={activeImage.alt} fill className="object-cover"/>)}
          </div>
          <div className="flex gap-2 p-4 overflow-x-auto">
            {product.images.map((img) => (<button key={img.id} onClick={() => setSelectedImageId(img.id)} className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${selectedImageId === img.id ? 'border-indigo-600' : 'border-transparent'}`}>
                <image_1.default src={img.url} alt={img.alt} fill className="object-cover"/>
              </button>))}
          </div>
        </div>

        {/* Product Info */}
        <div className="w-full md:w-1/2 p-6 md:p-8 lg:p-10 overflow-y-auto">
          <div className="mb-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            {product.brand}
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-4">
            {product.name}
          </h2>
          
          <div className="flex items-center gap-4 mb-6">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {(0, localization_1.formatCurrency)(product.basePrice, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
            </span>
            {product.rating && (<div className="flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                <span className="text-yellow-400">★</span>
                <span>{product.rating}</span>
                <span>({product.reviewCount} reviews)</span>
              </div>)}
          </div>

          <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
            {product.description}
          </p>

          {/* Selectors */}
          <div className="space-y-6 mb-8">
            {/* Color */}
            <div>
              <span className="block text-sm font-medium text-slate-900 dark:text-white mb-3">Color</span>
              <div className="flex flex-wrap gap-3">
                {uniqueColors.map((variant) => (<button key={variant.color} onClick={() => setSelectedColor(variant.color)} className={`w-8 h-8 rounded-full border border-slate-200 dark:border-slate-600 focus:outline-none ring-2 ring-offset-2 ${selectedColor === variant.color ? 'ring-indigo-600' : 'ring-transparent'}`} style={{ backgroundColor: variant.colorCode }} title={variant.color}/>))}
              </div>
            </div>

            {/* Size */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="block text-sm font-medium text-slate-900 dark:text-white">Size</span>
                <button className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                  <lucide_react_1.Ruler size={14}/> Size Guide
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {uniqueSizes.map((size) => (<button key={size} onClick={() => setSelectedSize(size)} className={`py-2 text-sm font-medium rounded-lg border transition-all ${selectedSize === size
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                    {size}
                  </button>))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 mb-8">
            <button onClick={handleAddToCart} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20">
              <lucide_react_1.ShoppingBag size={20}/>
              Add to Cart
            </button>
            <button onClick={() => toggleWishlist(product.id)} className={`p-3 border rounded-xl transition-colors ${inWishlist
            ? 'border-red-200 bg-red-50 text-red-500 dark:border-red-900 dark:bg-red-900/20'
            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
              <lucide_react_1.Heart size={20} fill={inWishlist ? "currentColor" : "none"}/>
            </button>
            <button onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!');
        }} className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-400">
              <lucide_react_1.Share2 size={20}/>
            </button>
          </div>

          {/* Details List */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-6 space-y-4">
            <div className="flex gap-4 text-sm">
              <span className="text-slate-500 dark:text-slate-400 w-24">Materials</span>
              <span className="text-slate-900 dark:text-white font-medium">
                {product.materials.map(m => `${m.percentage}% ${m.name}`).join(', ')}
              </span>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-slate-500 dark:text-slate-400 w-24">Origin</span>
              <span className="text-slate-900 dark:text-white font-medium">{product.countryOfOrigin}</span>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-slate-500 dark:text-slate-400 w-24">Care</span>
              <span className="text-slate-900 dark:text-white font-medium">{product.careInstructions.join(', ')}</span>
            </div>
          </div>
        </div>
      </framer_motion_1.motion.div>
    </div>);
}
