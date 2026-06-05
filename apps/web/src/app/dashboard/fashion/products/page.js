"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FashionProductsPage;
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const ProductFilters_1 = require("../../../../components/fashion/ProductFilters");
const ProductCard_1 = require("../../../../components/fashion/ProductCard");
const ProductFormModal_1 = require("../../../../components/fashion/ProductFormModal");
const ProductDetailModal_1 = require("../../../../components/fashion/ProductDetailModal");
const CartDrawer_1 = require("../../../../components/fashion/CartDrawer");
const framer_motion_1 = require("framer-motion");
const fashion_context_1 = require("../../../../context/fashion-context");
const inventory_context_1 = require("../../../../context/inventory-context");
function FashionProductsContent() {
    const { cartCount, wishlist } = (0, fashion_context_1.useFashion)();
    const { products, addProduct, updateProduct } = (0, inventory_context_1.useInventory)();
    const [showFilters, setShowFilters] = (0, react_1.useState)(false); // Mobile filter toggle
    const [viewMode, setViewMode] = (0, react_1.useState)('grid');
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [sortOption, setSortOption] = (0, react_1.useState)('newest');
    const [isCartOpen, setIsCartOpen] = (0, react_1.useState)(false);
    // Filter State
    const [filters, setFilters] = (0, react_1.useState)({
        categories: [],
        productTypes: [],
        priceRange: [0, 1000],
        sizes: [],
        colors: [],
        brands: []
    });
    // Modal State
    const [selectedProduct, setSelectedProduct] = (0, react_1.useState)(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = (0, react_1.useState)(false);
    const [isFormModalOpen, setIsFormModalOpen] = (0, react_1.useState)(false);
    const [editingProduct, setEditingProduct] = (0, react_1.useState)(undefined);
    // Derived State: Filtered & Sorted Products
    const filteredProducts = (0, react_1.useMemo)(() => {
        return products
            .filter(product => {
            // Search
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = product.name.toLowerCase().includes(searchLower) ||
                product.brand.toLowerCase().includes(searchLower) ||
                product.category.toLowerCase().includes(searchLower);
            if (!matchesSearch)
                return false;
            // Filters
            if (filters.categories.length > 0 && !filters.categories.includes(product.category))
                return false;
            // Note: We're matching "Product Type" against checks like 'Shirt' in the name or description 
            // because our mock data might not have a dedicated 'type' field matching the filter exactly. 
            // For now, let's assume we filter by matching tags or category if 'type' isn't explicit.
            // Actually, let's strictly check if the product type (e.g. 'Shirts') is relevant. 
            // Since MOCK_PRODUCTS has 'category' like 'Men', 'Women', etc.
            // We'll skip complex 'type' matching for this demo unless we add a 'type' field to Product.
            // Let's implement a basic text match for product types if they are selected.
            if (filters.productTypes.length > 0) {
                const typeMatch = filters.productTypes.some(type => product.name.toLowerCase().includes(type.toLowerCase()) ||
                    product.description.toLowerCase().includes(type.toLowerCase()));
                if (!typeMatch)
                    return false;
            }
            if (product.basePrice < filters.priceRange[0] || product.basePrice > filters.priceRange[1])
                return false;
            if (filters.brands.length > 0 && !filters.brands.includes(product.brand))
                return false;
            // Size & Color (checking variants)
            if (filters.sizes.length > 0) {
                const hasSize = product.variants.some(v => filters.sizes.includes(v.size));
                if (!hasSize)
                    return false;
            }
            if (filters.colors.length > 0) {
                const hasColor = product.variants.some(v => filters.colors.includes(v.color));
                if (!hasColor)
                    return false;
            }
            return true;
        })
            .sort((a, b) => {
            switch (sortOption) {
                case 'price-asc': return a.basePrice - b.basePrice;
                case 'price-desc': return b.basePrice - a.basePrice;
                case 'name': return a.name.localeCompare(b.name);
                case 'newest':
                default:
                    // Assuming newer products might have higher IDs or just keeping original order for mock
                    return 0;
            }
        });
    }, [products, searchQuery, filters, sortOption]);
    // Handlers
    const handleQuickView = (product) => {
        setSelectedProduct(product);
        setIsDetailModalOpen(true);
    };
    const handleEdit = (product) => {
        setEditingProduct(product);
        setIsFormModalOpen(true);
    };
    const handleCreate = () => {
        setEditingProduct(undefined);
        setIsFormModalOpen(true);
    };
    const handleSaveProduct = (product) => {
        // Mock save logic
        if (editingProduct) {
            updateProduct(product);
        }
        else {
            const newProduct = { ...product, id: `new-${Date.now()}` };
            addProduct(newProduct);
        }
        setIsFormModalOpen(false);
    };
    const cycleSort = () => {
        const options = ['newest', 'price-asc', 'price-desc', 'name'];
        const currentIndex = options.indexOf(sortOption);
        setSortOption(options[(currentIndex + 1) % options.length]);
    };
    const getSortLabel = () => {
        switch (sortOption) {
            case 'price-asc': return 'Price: Low to High';
            case 'price-desc': return 'Price: High to Low';
            case 'name': return 'Name';
            case 'newest': return 'Newest';
        }
    };
    return (<div className="flex h-full bg-slate-50 dark:bg-slate-900 min-h-screen">
      {/* Sticky Sidebar (Desktop) */}
      <aside className="hidden lg:block w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 h-screen sticky top-0 overflow-y-auto">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xl">
            <lucide_react_1.Tag className="w-6 h-6"/>
            <span>Fashion</span>
          </div>
        </div>
        <ProductFilters_1.ProductFilters filters={filters} onFilterChange={setFilters}/>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Header */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 lg:p-6 sticky top-0 z-10">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Products</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Manage your fashion catalog ({filteredProducts.length} items)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setIsCartOpen(true)} className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title="Shopping Cart">
                  <lucide_react_1.ShoppingBag size={24}/>
                  {cartCount > 0 && (<span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
                      {cartCount}
                    </span>)}
                </button>
                <button className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title="Wishlist">
                  <lucide_react_1.Heart size={24}/>
                  {wishlist.length > 0 && (<span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
                      {wishlist.length}
                    </span>)}
                </button>
                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1"/>
                <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm" onClick={handleCreate}>
                  <lucide_react_1.Plus size={20}/>
                  <span className="hidden sm:inline">Add Product</span>
                </button>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <lucide_react_1.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                <input type="text" placeholder="Search products by name, brand, or tag..." className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700 border-none rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
              </div>
              
              <button className="lg:hidden p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300" onClick={() => setShowFilters(true)}>
                <lucide_react_1.SlidersHorizontal size={20}/>
              </button>

              <div className="hidden sm:flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
                <button className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'}`} onClick={() => setViewMode('grid')}>
                  <lucide_react_1.Grid size={18}/>
                </button>
                <button className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'}`} onClick={() => setViewMode('list')}>
                  <lucide_react_1.List size={18}/>
                </button>
              </div>

              <button onClick={cycleSort} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                <lucide_react_1.ArrowUpDown size={16}/>
                <span className="hidden sm:inline">Sort: {getSortLabel()}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Product Grid */}
        <div className="p-4 lg:p-6">
          <div className={`grid gap-6 ${viewMode === 'grid'
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            : 'grid-cols-1'}`}>
            {filteredProducts.map((product) => (<ProductCard_1.ProductCard key={product.id} product={product} onQuickView={handleQuickView} onEdit={handleEdit} isAdmin={true} viewMode={viewMode}/>))}
          </div>
          
          {filteredProducts.length === 0 && (<div className="text-center py-20">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <lucide_react_1.Search className="w-8 h-8 text-slate-400"/>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No products found</h3>
              <p className="text-slate-500 dark:text-slate-400">Try adjusting your filters or search query.</p>
              <button onClick={() => {
                setSearchQuery('');
                setFilters({
                    categories: [],
                    productTypes: [],
                    priceRange: [0, 1000],
                    sizes: [],
                    colors: [],
                    brands: []
                });
            }} className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium">
                Clear all filters
              </button>
            </div>)}
        </div>
      </main>

      {/* Mobile Filters Modal */}
      <framer_motion_1.AnimatePresence>
        {showFilters && (<>
            <framer_motion_1.motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={() => setShowFilters(false)} className="fixed inset-0 bg-black z-40 lg:hidden"/>
            <framer_motion_1.motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed inset-y-0 right-0 z-50 w-80 bg-white dark:bg-slate-800 shadow-2xl lg:hidden">
              <ProductFilters_1.ProductFilters onClose={() => setShowFilters(false)} className="h-full" filters={filters} onFilterChange={setFilters}/>
            </framer_motion_1.motion.div>
          </>)}
      </framer_motion_1.AnimatePresence>
      {/* Modals */}
      <framer_motion_1.AnimatePresence>
        {isDetailModalOpen && selectedProduct && (<ProductDetailModal_1.ProductDetailModal product={selectedProduct} onClose={() => setIsDetailModalOpen(false)}/>)}
        
        {isFormModalOpen && (<ProductFormModal_1.ProductFormModal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} product={editingProduct} onSave={handleSaveProduct}/>)}
      </framer_motion_1.AnimatePresence>

      <CartDrawer_1.CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)}/>
    </div>);
}
function FashionProductsPage() {
    return (<fashion_context_1.FashionProvider>
      <FashionProductsContent />
    </fashion_context_1.FashionProvider>);
}
