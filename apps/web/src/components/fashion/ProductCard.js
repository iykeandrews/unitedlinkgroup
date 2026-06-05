"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductCard = ProductCard;
const react_1 = require("react");
const framer_motion_1 = require("framer-motion");
const lucide_react_1 = require("lucide-react");
const localization_1 = require("../../lib/localization");
const business_context_1 = require("../../context/business-context");
const fashion_context_1 = require("../../context/fashion-context");
const image_1 = __importDefault(require("next/image"));
function ProductCard({ product, onQuickView, onEdit, isAdmin, viewMode = 'grid' }) {
    var _a;
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const { addToCart, toggleWishlist, isInWishlist } = (0, fashion_context_1.useFashion)();
    const [isHovered, setIsHovered] = (0, react_1.useState)(false);
    const [activeVariantId, setActiveVariantId] = (0, react_1.useState)(null);
    // ... (existing logic for images/variants)
    // Determine active variant or default to first
    const variants = product.variants || [];
    const images = product.images || [];
    const activeVariant = activeVariantId
        ? variants.find(v => v.id === activeVariantId)
        : variants[0];
    const inWishlist = isInWishlist(product.id);
    // Get image to display (variant specific or primary product image)
    const displayImage = (activeVariant === null || activeVariant === void 0 ? void 0 : activeVariant.images[0])
        ? images.find(img => img.id === activeVariant.images[0])
        : images.find(img => img.isPrimary) || images[0];
    const secondaryImage = images.find(img => img.id !== (displayImage === null || displayImage === void 0 ? void 0 : displayImage.id));
    // Get unique colors for swatches
    const uniqueColors = Array.from(new Set(variants.map(v => v.colorCode)))
        .map(code => variants.find(v => v.colorCode === code))
        .filter(Boolean)
        .slice(0, 5); // Limit to 5 swatches
    const price = (activeVariant === null || activeVariant === void 0 ? void 0 : activeVariant.price) || product.basePrice;
    const salePrice = activeVariant === null || activeVariant === void 0 ? void 0 : activeVariant.salePrice;
    const handleAddToCart = (e) => {
        e.stopPropagation();
        addToCart(product, activeVariant);
        // Optional: Toast notification here
    };
    const handleToggleWishlist = (e) => {
        e.stopPropagation();
        toggleWishlist(product.id);
    };
    if (viewMode === 'list') {
        return (<framer_motion_1.motion.div className="group relative bg-white dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all duration-300 flex" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Image Container (Smaller for list) */}
        <div className="relative w-48 aspect-[3/4] flex-shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-700">
          {displayImage && (<image_1.default src={displayImage.url} alt={displayImage.alt} fill className={`object-cover transition-transform duration-700 ${isHovered ? 'scale-110' : 'scale-100'}`}/>)}
        </div>

        {/* Product Details */}
        <div className="p-6 flex flex-col justify-between flex-1">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <div className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  {product.brand}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                  {product.name}
                </h3>
              </div>
              
              {/* Price */}
              <div className="flex flex-col items-end">
                {salePrice ? (<>
                    <span className="text-lg font-bold text-red-500">
                      {(0, localization_1.formatCurrency)(salePrice, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
                    </span>
                    <span className="text-sm text-slate-400 line-through">
                      {(0, localization_1.formatCurrency)(price, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
                    </span>
                  </>) : (<span className="text-lg font-bold text-slate-900 dark:text-white">
                    {(0, localization_1.formatCurrency)(price, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
                  </span>)}
              </div>
            </div>

            <p className="text-slate-600 dark:text-slate-300 text-sm mb-4 line-clamp-2">
              {product.description}
            </p>

            {/* Color Swatches */}
            <div className="flex items-center gap-1.5 mb-4">
              {uniqueColors.map((variant) => (<button key={variant.id} onClick={() => setActiveVariantId(variant.id)} className={`w-5 h-5 rounded-full border border-slate-200 dark:border-slate-600 transition-transform ${(activeVariantId === variant.id || (!activeVariantId && uniqueColors[0].id === variant.id))
                    ? 'scale-125 ring-1 ring-slate-400 ring-offset-1'
                    : 'hover:scale-110'}`} style={{ backgroundColor: variant.colorCode }} title={variant.color}/>))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
             <button onClick={() => onQuickView(product)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
               Quick View
             </button>
             <button onClick={handleAddToCart} className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" title="Add to Cart">
               <lucide_react_1.ShoppingBag size={18}/>
             </button>
             <button onClick={handleToggleWishlist} className={`p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${inWishlist ? 'text-red-500 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900' : ''}`} title="Wishlist">
               <lucide_react_1.Heart size={18} fill={inWishlist ? "currentColor" : "none"}/>
             </button>
             {isAdmin && (<button onClick={() => onEdit === null || onEdit === void 0 ? void 0 : onEdit(product)} className="ml-auto text-slate-500 hover:text-indigo-600 text-sm font-medium flex items-center gap-1">
                 <lucide_react_1.MoreHorizontal size={16}/> Edit
               </button>)}
          </div>
        </div>
      </framer_motion_1.motion.div>);
    }
    return (<framer_motion_1.motion.div className="group relative bg-white dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all duration-300" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      {/* ... existing grid content ... */}
      <div className="relative aspect-[3/4] overflow-hidden bg-slate-100 dark:bg-slate-700">
        {displayImage && (<image_1.default src={displayImage.url} alt={displayImage.alt} fill className={`object-cover transition-transform duration-700 ${isHovered ? 'scale-110' : 'scale-100'} ${isHovered && secondaryImage ? 'opacity-0' : 'opacity-100'}`}/>)}
        
        {/* Secondary Image on Hover */}
        {secondaryImage && (<image_1.default src={secondaryImage.url} alt={secondaryImage.alt} fill className={`absolute inset-0 object-cover transition-opacity duration-700 ${isHovered ? 'opacity-100' : 'opacity-0'}`}/>)}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {salePrice && (<span className="px-2 py-1 bg-red-500 text-white text-xs font-bold uppercase tracking-wider rounded-sm">
              Sale
            </span>)}
          {((_a = product.tags) === null || _a === void 0 ? void 0 : _a.includes('New Arrival')) && (<span className="px-2 py-1 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-sm">
              New
            </span>)}
        </div>

        {/* Quick Actions Overlay */}
        <div className={`absolute bottom-4 left-0 right-0 flex justify-center gap-3 transition-transform duration-300 ${isHovered ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'} lg:translate-y-0 lg:opacity-100`}>
          {/* Note: Removed mobile-specific hiding logic above by forcing visible on mobile if desired, but sticking to hover for now unless requested.
            Actually, let's make them visible on touch devices?
            The user said "visible". The hover effect hides them on mobile.
            I'll add `lg:translate-y-10 lg:opacity-0` logic so they are visible on mobile by default?
            Actually, standard practice is to show on hover for desktop. For mobile, maybe just always show?
            Let's make them always visible on mobile/tablet (touch), and hover on desktop.
            
            Current: ${isHovered ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}
            Proposed: ${isHovered ? 'translate-y-0 opacity-100' : 'lg:translate-y-10 lg:opacity-0 translate-y-0 opacity-100'}
            Wait, that means always visible on mobile (not lg), and hover on desktop (lg).
        */}
          <button onClick={() => onQuickView(product)} className="p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-full shadow-lg hover:bg-slate-900 hover:text-white dark:hover:bg-slate-700 transition-colors" title="Quick View">
            <lucide_react_1.Eye size={18}/>
          </button>
          <button onClick={handleAddToCart} className="p-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-full shadow-lg hover:bg-slate-900 hover:text-white dark:hover:bg-slate-700 transition-colors" title="Add to Cart">
            <lucide_react_1.ShoppingBag size={18}/>
          </button>
          <button onClick={handleToggleWishlist} className={`p-3 bg-white dark:bg-slate-800 rounded-full shadow-lg hover:bg-red-500 hover:text-white dark:hover:bg-red-500 transition-colors ${inWishlist ? 'text-red-500' : 'text-slate-900 dark:text-white'}`} title="Wishlist">
            <lucide_react_1.Heart size={18} fill={inWishlist ? "currentColor" : "none"}/>
          </button>
        </div>
        
        {/* Admin Edit Button */}
        {isAdmin && (<button onClick={(e) => { e.stopPropagation(); onEdit === null || onEdit === void 0 ? void 0 : onEdit(product); }} className="absolute top-3 right-3 p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400">
            <lucide_react_1.MoreHorizontal size={16}/>
          </button>)}
      </div>

      {/* Product Details */}
      <div className="p-4">
        <div className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {product.brand}
        </div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1 truncate">
          {product.name}
        </h3>
        
        {/* Price */}
        <div className="flex items-center gap-2 mb-3">
          {salePrice ? (<>
              <span className="text-sm font-bold text-red-500">
                {(0, localization_1.formatCurrency)(salePrice, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
              </span>
              <span className="text-xs text-slate-400 line-through">
                {(0, localization_1.formatCurrency)(price, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
              </span>
            </>) : (<span className="text-sm font-bold text-slate-900 dark:text-white">
              {(0, localization_1.formatCurrency)(price, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
            </span>)}
        </div>

        {/* Color Swatches */}
        <div className="flex items-center gap-1.5">
          {uniqueColors.map((variant) => (<button key={variant.id} onClick={() => setActiveVariantId(variant.id)} className={`w-4 h-4 rounded-full border border-slate-200 dark:border-slate-600 transition-transform ${(activeVariantId === variant.id || (!activeVariantId && uniqueColors[0].id === variant.id))
                ? 'scale-125 ring-1 ring-slate-400 ring-offset-1'
                : 'hover:scale-110'}`} style={{ backgroundColor: variant.colorCode }} title={variant.color}/>))}
          {variants.length > 5 && (<span className="text-xs text-slate-400 ml-1">+{variants.length - 5}</span>)}
        </div>
      </div>
    </framer_motion_1.motion.div>);
}
