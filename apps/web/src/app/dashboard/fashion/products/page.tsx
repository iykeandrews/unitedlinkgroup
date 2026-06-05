'use client';

import { useState, useMemo } from 'react';
import { Tag, Plus, Search, SlidersHorizontal, Grid, List, ArrowUpDown, ShoppingBag, Heart } from 'lucide-react';
import { ProductFilters, FilterState } from '../../../../components/fashion/ProductFilters';
import { ProductCard } from '../../../../components/fashion/ProductCard';
import { ProductFormModal } from '../../../../components/fashion/ProductFormModal';
import { ProductDetailModal } from '../../../../components/fashion/ProductDetailModal';
import { CartDrawer } from '../../../../components/fashion/CartDrawer';
import { MOCK_PRODUCTS } from '../../../../lib/mock-fashion-data';
import { Product } from '../../../../types/fashion';
import { motion, AnimatePresence } from 'framer-motion';
import { FashionProvider, useFashion } from '../../../../context/fashion-context';
import { useInventory } from '../../../../context/inventory-context';

function FashionProductsContent() {
  const { cartCount, wishlist } = useFashion();
  const { products, addProduct, updateProduct } = useInventory();
  const [showFilters, setShowFilters] = useState(false); // Mobile filter toggle
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'newest' | 'price-asc' | 'price-desc' | 'name'>('newest');
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Filter State
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    productTypes: [],
    priceRange: [0, 1000],
    sizes: [],
    colors: [],
    brands: []
  });

  // Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);

  // Derived State: Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products
      .filter(product => {
        // Search
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = 
          product.name.toLowerCase().includes(searchLower) ||
          product.brand.toLowerCase().includes(searchLower) ||
          product.category.toLowerCase().includes(searchLower);

        if (!matchesSearch) return false;

        // Filters
        if (filters.categories.length > 0 && !filters.categories.includes(product.category)) return false;
        // Note: We're matching "Product Type" against checks like 'Shirt' in the name or description 
        // because our mock data might not have a dedicated 'type' field matching the filter exactly. 
        // For now, let's assume we filter by matching tags or category if 'type' isn't explicit.
        // Actually, let's strictly check if the product type (e.g. 'Shirts') is relevant. 
        // Since MOCK_PRODUCTS has 'category' like 'Men', 'Women', etc.
        // We'll skip complex 'type' matching for this demo unless we add a 'type' field to Product.
        // Let's implement a basic text match for product types if they are selected.
        if (filters.productTypes.length > 0) {
           const typeMatch = filters.productTypes.some(type => 
             product.name.toLowerCase().includes(type.toLowerCase()) || 
             product.description.toLowerCase().includes(type.toLowerCase())
           );
           if (!typeMatch) return false;
        }

        if (product.basePrice < filters.priceRange[0] || product.basePrice > filters.priceRange[1]) return false;

        if (filters.brands.length > 0 && !filters.brands.includes(product.brand)) return false;

        // Size & Color (checking variants)
        if (filters.sizes.length > 0) {
          const hasSize = product.variants.some(v => filters.sizes.includes(v.size));
          if (!hasSize) return false;
        }

        if (filters.colors.length > 0) {
          const hasColor = product.variants.some(v => filters.colors.includes(v.color));
          if (!hasColor) return false;
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
  const handleQuickView = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsFormModalOpen(true);
  };

  const handleCreate = () => {
    setEditingProduct(undefined);
    setIsFormModalOpen(true);
  };

  const handleSaveProduct = (product: Product) => {
    // Mock save logic
    if (editingProduct) {
      updateProduct(product);
    } else {
      const newProduct = { ...product, id: `new-${Date.now()}` };
      addProduct(newProduct);
    }
    setIsFormModalOpen(false);
  };

  const cycleSort = () => {
    const options: typeof sortOption[] = ['newest', 'price-asc', 'price-desc', 'name'];
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

  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-900 min-h-screen">
      {/* Sticky Sidebar (Desktop) */}
      <aside className="hidden lg:block w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 h-screen sticky top-0 overflow-y-auto">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xl">
            <Tag className="w-6 h-6" />
            <span>Fashion</span>
          </div>
        </div>
        <ProductFilters 
          filters={filters}
          onFilterChange={setFilters}
        />
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
                <button 
                  onClick={() => setIsCartOpen(true)}
                  className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Shopping Cart"
                >
                  <ShoppingBag size={24} />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
                      {cartCount}
                    </span>
                  )}
                </button>
                <button 
                  className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Wishlist"
                >
                  <Heart size={24} />
                  {wishlist.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
                      {wishlist.length}
                    </span>
                  )}
                </button>
                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1" />
                <button 
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm"
                  onClick={handleCreate}
                >
                  <Plus size={20} />
                  <span className="hidden sm:inline">Add Product</span>
                </button>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Search products by name, brand, or tag..." 
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700 border-none rounded-lg focus:ring-2 focus:ring-indigo-500 dark:text-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <button 
                className="lg:hidden p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300"
                onClick={() => setShowFilters(true)}
              >
                <SlidersHorizontal size={20} />
              </button>

              <div className="hidden sm:flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
                <button 
                  className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'}`}
                  onClick={() => setViewMode('grid')}
                >
                  <Grid size={18} />
                </button>
                <button 
                  className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'}`}
                  onClick={() => setViewMode('list')}
                >
                  <List size={18} />
                </button>
              </div>

              <button 
                onClick={cycleSort}
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <ArrowUpDown size={16} />
                <span className="hidden sm:inline">Sort: {getSortLabel()}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Product Grid */}
        <div className="p-4 lg:p-6">
          <div className={`grid gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
              : 'grid-cols-1'
          }`}>
            {filteredProducts.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onQuickView={handleQuickView}
                onEdit={handleEdit}
                isAdmin={true}
                viewMode={viewMode}
              />
            ))}
          </div>
          
          {filteredProducts.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No products found</h3>
              <p className="text-slate-500 dark:text-slate-400">Try adjusting your filters or search query.</p>
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setFilters({
                    categories: [],
                    productTypes: [],
                    priceRange: [0, 1000],
                    sizes: [],
                    colors: [],
                    brands: []
                  });
                }}
                className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Filters Modal */}
      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilters(false)}
              className="fixed inset-0 bg-black z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-50 w-80 bg-white dark:bg-slate-800 shadow-2xl lg:hidden"
            >
              <ProductFilters 
                onClose={() => setShowFilters(false)} 
                className="h-full"
                filters={filters}
                onFilterChange={setFilters}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Modals */}
      <AnimatePresence>
        {isDetailModalOpen && selectedProduct && (
          <ProductDetailModal 
            product={selectedProduct} 
            onClose={() => setIsDetailModalOpen(false)} 
          />
        )}
        
        {isFormModalOpen && (
          <ProductFormModal 
            isOpen={isFormModalOpen}
            onClose={() => setIsFormModalOpen(false)}
            product={editingProduct}
            onSave={handleSaveProduct}
          />
        )}
      </AnimatePresence>

      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
      />
    </div>
  );
}

export default function FashionProductsPage() {
  return (
    <FashionProvider>
      <FashionProductsContent />
    </FashionProvider>
  );
}
