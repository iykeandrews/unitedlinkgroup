"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductFormModal = ProductFormModal;
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const framer_motion_1 = require("framer-motion");
const AVAILABLE_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const AVAILABLE_COLORS = ['Black', 'White', 'Red', 'Blue', 'Green', 'Navy'];
function ProductFormModal({ isOpen, onClose, product, onSave }) {
    var _a, _b;
    const [activeTab, setActiveTab] = (0, react_1.useState)('general');
    // Form State
    const [formData, setFormData] = (0, react_1.useState)(product || {
        name: '',
        description: '',
        brand: '',
        basePrice: 0,
        category: 'Unisex',
        productType: 'Clothing',
        status: 'Draft',
        variants: [],
        images: [],
        tags: [],
        collections: [],
        occasions: [],
        materials: [],
        careInstructions: [],
        sustainabilityTags: []
    });
    // Variant Generation State
    const [showVariantGen, setShowVariantGen] = (0, react_1.useState)(false);
    const [selectedSizes, setSelectedSizes] = (0, react_1.useState)([]);
    const [selectedColors, setSelectedColors] = (0, react_1.useState)([]);
    const handleSave = () => {
        // Basic validation
        if (!formData.name || !formData.basePrice) {
            alert('Please fill in required fields (Name, Price)');
            return;
        }
        onSave(formData);
    };
    const generateVariants = () => {
        if (selectedSizes.length === 0 || selectedColors.length === 0)
            return;
        const newVariants = [];
        let idCounter = Date.now();
        const colorMap = {
            'Black': '#000000', 'White': '#FFFFFF', 'Red': '#EF4444',
            'Blue': '#3B82F6', 'Green': '#10B981', 'Navy': '#1E3A8A'
        };
        selectedSizes.forEach(size => {
            selectedColors.forEach(color => {
                newVariants.push({
                    id: `v-${idCounter++}`,
                    size,
                    color,
                    colorCode: colorMap[color] || '#000000',
                    sku: `${(formData.brand || 'GEN').substring(0, 3).toUpperCase()}-${(formData.name || 'PRD').substring(0, 3).toUpperCase()}-${size}-${color}`,
                    stockQuantity: 10,
                    stockStatus: 'In Stock',
                    price: formData.basePrice || 0,
                    images: []
                });
            });
        });
        setFormData(prev => ({
            ...prev,
            variants: [...(prev.variants || []), ...newVariants]
        }));
        setShowVariantGen(false);
        setSelectedSizes([]);
        setSelectedColors([]);
    };
    const removeVariant = (id) => {
        setFormData(prev => {
            var _a;
            return ({
                ...prev,
                variants: (_a = prev.variants) === null || _a === void 0 ? void 0 : _a.filter(v => v.id !== id)
            });
        });
    };
    const handleImageUpload = () => {
        var _a;
        // Mock upload
        const mockImages = [
            'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
            'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&q=80',
            'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800&q=80'
        ];
        const randomUrl = mockImages[Math.floor(Math.random() * mockImages.length)];
        // Create proper ProductImage object
        const newImage = {
            id: `img-${Date.now()}`,
            url: randomUrl,
            alt: formData.name || 'Product Image',
            isPrimary: (((_a = formData.images) === null || _a === void 0 ? void 0 : _a.length) || 0) === 0
        };
        setFormData(prev => ({
            ...prev,
            images: [...(prev.images || []), newImage]
        }));
    };
    const removeImage = (index) => {
        setFormData(prev => {
            var _a;
            return ({
                ...prev,
                images: (_a = prev.images) === null || _a === void 0 ? void 0 : _a.filter((_, i) => i !== index)
            });
        });
    };
    if (!isOpen)
        return null;
    return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      
      <framer_motion_1.motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-4xl bg-white dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {product ? 'Edit Product' : 'New Product'}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={handleSave} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
              Save Product
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              <lucide_react_1.X size={20}/>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 px-6">
          {['general', 'details', 'media', 'variants'].map((tab) => (<button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
              {tab}
            </button>))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && (<div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Product Name *</label>
                  <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Premium Cotton Shirt" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}/>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Brand</label>
                  <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500" placeholder="Brand Name" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })}/>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <select className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                    <option value="Kids">Kids</option>
                    <option value="Unisex">Unisex</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Base Price *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                    <input type="number" className="w-full pl-8 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500" placeholder="0.00" value={formData.basePrice} onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) })}/>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                    <option value="Active">Active</option>
                    <option value="Draft">Draft</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                  <textarea className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 h-32 resize-none" placeholder="Product description..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}/>
                </div>
              </div>
            </div>)}

          {activeTab === 'details' && (<div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Material Composition</label>
                  <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500" placeholder="e.g. 100% Cotton"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Care Instructions</label>
                  <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Machine wash cold"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fit Type</label>
                  <select className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500">
                    <option>Regular</option>
                    <option>Slim</option>
                    <option>Oversized</option>
                    <option>Loose</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Country of Origin</label>
                  <input type="text" className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Italy"/>
                </div>
              </div>
            </div>)}

          {activeTab === 'media' && (<div className="space-y-6">
              <div onClick={handleImageUpload} className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 text-center hover:border-indigo-500 transition-colors cursor-pointer">
                <lucide_react_1.Upload className="w-10 h-10 text-slate-400 mx-auto mb-4"/>
                <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">Click to upload or drag and drop</p>
                <p className="text-xs text-slate-400 mt-1">SVG, PNG, JPG or GIF (max. 800x400px)</p>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {(_a = formData.images) === null || _a === void 0 ? void 0 : _a.map((img, i) => (<div key={i} className="relative aspect-square bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden group">
                    <img src={img.url} alt={img.alt || `Product ${i + 1}`} className="w-full h-full object-cover"/>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button onClick={() => removeImage(i)} className="p-1.5 bg-white text-red-500 rounded-full hover:bg-red-50">
                        <lucide_react_1.Trash2 size={16}/>
                      </button>
                    </div>
                  </div>))}
              </div>
            </div>)}

          {activeTab === 'variants' && (<div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="font-medium text-slate-900 dark:text-white">Product Variants</h3>
                <button onClick={() => setShowVariantGen(!showVariantGen)} className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                  <lucide_react_1.RefreshCw size={16}/>
                  Generate Variants
                </button>
              </div>

              {showVariantGen && (<framer_motion_1.motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg space-y-4">
                  <div>
                    <span className="text-sm font-medium mb-2 block">Sizes</span>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_SIZES.map(size => (<button key={size} onClick={() => setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size])} className={`px-3 py-1 text-sm rounded border ${selectedSizes.includes(size)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600'}`}>
                          {size}
                        </button>))}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium mb-2 block">Colors</span>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_COLORS.map(color => (<button key={color} onClick={() => setSelectedColors(prev => prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color])} className={`px-3 py-1 text-sm rounded border ${selectedColors.includes(color)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600'}`}>
                          {color}
                        </button>))}
                    </div>
                  </div>

                  <button onClick={generateVariants} disabled={selectedSizes.length === 0 || selectedColors.length === 0} className="w-full py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                    Generate {selectedSizes.length * selectedColors.length} Variants
                  </button>
                </framer_motion_1.motion.div>)}

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-4 py-3 font-medium">Variant</th>
                      <th className="px-4 py-3 font-medium">SKU</th>
                      <th className="px-4 py-3 font-medium">Price</th>
                      <th className="px-4 py-3 font-medium">Stock</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {(_b = formData.variants) === null || _b === void 0 ? void 0 : _b.map((variant) => (<tr key={variant.id} className="bg-white dark:bg-slate-800">
                        <td className="px-4 py-3">
                          {variant.size} / {variant.color}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{variant.sku}</td>
                        <td className="px-4 py-3">${variant.price}</td>
                        <td className="px-4 py-3">{variant.stockQuantity}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => removeVariant(variant.id)} className="text-red-500 hover:text-red-700">
                            <lucide_react_1.Trash2 size={16}/>
                          </button>
                        </td>
                      </tr>))}
                    {(!formData.variants || formData.variants.length === 0) && (<tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                          No variants yet. Click &quot;Generate Variants&quot; to add some.
                        </td>
                      </tr>)}
                  </tbody>
                </table>
              </div>
            </div>)}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
          <button onClick={onClose} className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium">
            Cancel
          </button>
          <button onClick={() => onSave(formData)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium shadow-sm">
            Save Product
          </button>
        </div>
      </framer_motion_1.motion.div>
    </div>);
}
