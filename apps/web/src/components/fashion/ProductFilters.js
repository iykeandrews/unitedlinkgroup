"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductFilters = ProductFilters;
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const framer_motion_1 = require("framer-motion");
function FilterSection({ title, children, defaultOpen = true }) {
    const [isOpen, setIsOpen] = (0, react_1.useState)(defaultOpen);
    return (<div className="border-b border-slate-200 dark:border-slate-700 py-4">
      <button className="flex items-center justify-between w-full text-left mb-2 group" onClick={() => setIsOpen(!isOpen)}>
        <span className="font-semibold text-slate-900 dark:text-white text-sm group-hover:text-indigo-600 transition-colors">
          {title}
        </span>
        {isOpen ? <lucide_react_1.ChevronUp size={16}/> : <lucide_react_1.ChevronDown size={16}/>}
      </button>
      <framer_motion_1.AnimatePresence>
        {isOpen && (<framer_motion_1.motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-2 pb-1">
              {children}
            </div>
          </framer_motion_1.motion.div>)}
      </framer_motion_1.AnimatePresence>
    </div>);
}
function ProductFilters({ className, onClose, filters, onFilterChange }) {
    const handleCheckboxChange = (category, value) => {
        const currentValues = filters[category];
        const newValues = currentValues.includes(value)
            ? currentValues.filter(v => v !== value)
            : [...currentValues, value];
        onFilterChange({
            ...filters,
            [category]: newValues
        });
    };
    const handlePriceChange = (e) => {
        onFilterChange({
            ...filters,
            priceRange: [0, parseInt(e.target.value)]
        });
    };
    return (<div className={`bg-white dark:bg-slate-800 h-full overflow-y-auto ${className}`}>
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 lg:hidden">
        <div className="flex items-center gap-2">
          <lucide_react_1.Filter size={20}/>
          <span className="font-bold">Filters</span>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
          <lucide_react_1.X size={20}/>
        </button>
      </div>

      <div className="p-4 lg:p-0">
        <FilterSection title="Category">
          <div className="space-y-2">
            {['Men', 'Women', 'Kids', 'Unisex'].map((cat) => (<label key={cat} className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={filters.categories.includes(cat)} onChange={() => handleCheckboxChange('categories', cat)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"/>
                <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  {cat}
                </span>
              </label>))}
          </div>
        </FilterSection>

        <FilterSection title="Product Type">
          <div className="space-y-2">
            {['Shirts', 'Dresses', 'Jeans', 'Shoes', 'Accessories'].map((type) => (<label key={type} className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={filters.productTypes.includes(type)} onChange={() => handleCheckboxChange('productTypes', type)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"/>
                <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  {type}
                </span>
              </label>))}
          </div>
        </FilterSection>

        <FilterSection title="Price Range">
          <div className="px-1">
            <input type="range" min="0" max="1000" step="10" value={filters.priceRange[1]} onChange={handlePriceChange} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"/>
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>$0</span>
              <span>${filters.priceRange[1]}</span>
            </div>
          </div>
        </FilterSection>

        <FilterSection title="Size">
          <div className="grid grid-cols-4 gap-2">
            {['XS', 'S', 'M', 'L', 'XL', 'XXL', '38', '40', '42'].map((size) => (<button key={size} onClick={() => handleCheckboxChange('sizes', size)} className={`px-2 py-1 text-xs border rounded transition-colors ${filters.sizes.includes(size)
                ? 'border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                : 'border-slate-200 dark:border-slate-700 hover:border-indigo-600 hover:text-indigo-600'}`}>
                {size}
              </button>))}
          </div>
        </FilterSection>

        <FilterSection title="Color">
          <div className="flex flex-wrap gap-2">
            {[
            { name: 'Black', code: '#000000' },
            { name: 'White', code: '#FFFFFF' },
            { name: 'Red', code: '#EF4444' },
            { name: 'Blue', code: '#3B82F6' },
            { name: 'Green', code: '#10B981' },
            { name: 'Yellow', code: '#F59E0B' },
            { name: 'Purple', code: '#8B5CF6' },
        ].map((color) => (<button key={color.name} onClick={() => handleCheckboxChange('colors', color.name)} className={`w-6 h-6 rounded-full border transition-transform ring-offset-1 focus:ring-2 ring-indigo-500 ${filters.colors.includes(color.name)
                ? 'ring-2 ring-indigo-500 scale-110'
                : 'border-slate-200 dark:border-slate-600 hover:scale-110'}`} style={{ backgroundColor: color.code }} title={color.name}/>))}
          </div>
        </FilterSection>

        <FilterSection title="Brand">
          <div className="space-y-2">
            {['Nike', 'Adidas', 'Zara', 'H&M', 'Gucci', 'Uniqlo', 'United Fashion', 'Bloom & Co', 'Street King', 'Heritage', 'Denim Co'].map((brand) => (<label key={brand} className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={filters.brands.includes(brand)} onChange={() => handleCheckboxChange('brands', brand)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"/>
                <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  {brand}
                </span>
              </label>))}
          </div>
        </FilterSection>
      </div>
    </div>);
}
