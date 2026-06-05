"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PosProductGrid = PosProductGrid;
const react_1 = require("react");
const PosProductCard_1 = require("./PosProductCard");
const lucide_react_1 = require("lucide-react");
const pos_context_1 = require("../../../context/pos-context");
function PosProductGrid({ products, onProductSelect, onHistoryClick }) {
    const [isScanning, setIsScanning] = (0, react_1.useState)(false);
    const [scanInput, setScanInput] = (0, react_1.useState)('');
    const { searchQuery, setSearchQuery, selectedCategory, setSelectedCategory, addToCart } = (0, pos_context_1.usePos)();
    const handleScan = (e) => {
        e.preventDefault();
        if (!scanInput.trim())
            return;
        // Search for product by SKU or Variant SKU
        const sku = scanInput.trim().toLowerCase();
        // 1. Check direct variant SKU match first (most specific)
        for (const product of products) {
            const variant = product.variants.find(v => v.sku.toLowerCase() === sku);
            if (variant) {
                addToCart(product, variant);
                setScanInput('');
                setIsScanning(false);
                return;
            }
        }
        // 2. Check product base SKU match (if so, maybe select first variant or open selector? 
        // For now, let's auto-select first available variant if base SKU matches)
        const product = products.find(p => p.sku.toLowerCase() === sku);
        if (product) {
            const availableVariant = product.variants.find(v => v.stockQuantity > 0) || product.variants[0];
            if (availableVariant) {
                addToCart(product, availableVariant);
                setScanInput('');
                setIsScanning(false);
                return;
            }
        }
        alert(`Product with SKU "${scanInput}" not found.`);
        setScanInput('');
    };
    const categories = Array.from(new Set(products.map(p => p.category)));
    const productTypes = Array.from(new Set(products.map(p => p.productType)));
    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
            product.sku.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory
            ? product.category === selectedCategory || product.productType === selectedCategory
            : true;
        return matchesSearch && matchesCategory;
    });
    return (<div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 relative">
      {/* Scanner Overlay */}
      {isScanning && (<div className="absolute inset-0 z-20 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-20">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl w-full max-w-md mx-4">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 dark:text-white">
                    <lucide_react_1.ScanBarcode /> Scan Item
                </h3>
                <form onSubmit={handleScan}>
                    <input autoFocus type="text" value={scanInput} onChange={e => setScanInput(e.target.value)} placeholder="Scan barcode or type SKU..." className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border-2 border-indigo-500 rounded-xl focus:outline-none text-lg mb-4" onBlur={() => setTimeout(() => setIsScanning(false), 200)} // Delay to allow submit
        />
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setIsScanning(false)} className="flex-1 py-3 bg-slate-200 dark:bg-slate-700 rounded-xl font-bold">
                            Cancel
                        </button>
                        <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">
                            Add to Cart
                        </button>
                    </div>
                </form>
            </div>
        </div>)}

      {/* Top Bar */}
      <div className="p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <lucide_react_1.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
            <input type="text" placeholder="Search products, brands, SKU..." className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-700 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
          </div>
          <button onClick={() => setIsScanning(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
            <lucide_react_1.ScanBarcode size={20}/>
            Scan
          </button>
          <button onClick={onHistoryClick} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
            <lucide_react_1.History size={20}/>
            History
          </button>
        </div>
        
        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button onClick={() => setSelectedCategory(null)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === null
            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'}`}>
            All Items
          </button>
          {categories.map(cat => (<button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'}`}>
              {cat}
            </button>))}
           <div className="w-px h-8 bg-slate-300 dark:bg-slate-600 mx-1 self-center"/>
          {productTypes.map(type => (<button key={type} onClick={() => setSelectedCategory(type)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === type
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'}`}>
              {type}
            </button>))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map(product => (<PosProductCard_1.PosProductCard key={product.id} product={product} onSelect={onProductSelect}/>))}
        </div>
        {filteredProducts.length === 0 && (<div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400">
            <lucide_react_1.Search size={48} className="mb-4 opacity-20"/>
            <p>No products found</p>
          </div>)}
      </div>
    </div>);
}
