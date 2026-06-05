"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = InventoryTable;
const react_1 = __importStar(require("react"));
const lucide_react_1 = require("lucide-react");
const inventory_context_1 = require("../../../context/inventory-context");
const StockAdjustmentModal_1 = __importDefault(require("./StockAdjustmentModal"));
const InventoryDetailPanel_1 = __importDefault(require("./InventoryDetailPanel"));
function InventoryTable() {
    const { products } = (0, inventory_context_1.useInventory)();
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [statusFilter, setStatusFilter] = (0, react_1.useState)('all');
    const [categoryFilter, setCategoryFilter] = (0, react_1.useState)('all');
    // Stock Adjustment Modal State
    const [adjustModalOpen, setAdjustModalOpen] = (0, react_1.useState)(false);
    const [selectedItem, setSelectedItem] = (0, react_1.useState)(null);
    // Detail Panel State
    const [detailPanelOpen, setDetailPanelOpen] = (0, react_1.useState)(false);
    const [detailItem, setDetailItem] = (0, react_1.useState)(null);
    // Pagination State
    const [currentPage, setCurrentPage] = (0, react_1.useState)(1);
    const itemsPerPage = 10;
    // Flatten products to variants for the table
    const inventoryItems = (0, react_1.useMemo)(() => {
        return products.flatMap(product => product.variants.map(variant => {
            var _a, _b;
            return ({
                ...variant,
                productId: product.id,
                productName: product.name,
                category: product.category,
                brand: product.brand,
                image: ((_a = product.images.find(img => variant.images.includes(img.id))) === null || _a === void 0 ? void 0 : _a.url) || ((_b = product.images[0]) === null || _b === void 0 ? void 0 : _b.url)
            });
        }));
    }, [products]);
    const filteredItems = (0, react_1.useMemo)(() => {
        return inventoryItems.filter(item => {
            const matchesSearch = item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.sku.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'all' ||
                (statusFilter === 'low' && item.stockQuantity > 0 && item.stockQuantity < 10) ||
                (statusFilter === 'out' && item.stockQuantity <= 0) ||
                (statusFilter === 'in' && item.stockQuantity >= 10);
            const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
            return matchesSearch && matchesStatus && matchesCategory;
        });
    }, [inventoryItems, searchQuery, statusFilter, categoryFilter]);
    // Reset pagination when filters change
    react_1.default.useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, categoryFilter]);
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const handleAdjustStock = (item, e) => {
        e.stopPropagation();
        setSelectedItem({
            productId: item.productId,
            variantId: item.id,
            currentStock: item.stockQuantity,
            productName: item.productName,
            variantName: `${item.size} • ${item.color}`
        });
        setAdjustModalOpen(true);
    };
    const handleRowClick = (item) => {
        setDetailItem({ productId: item.productId, variantId: item.id });
        setDetailPanelOpen(true);
    };
    return (<div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      {/* Filters Toolbar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <lucide_react_1.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
          <input type="text" placeholder="Search products, SKUs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">All Categories</option>
            <option value="Men">Men</option>
            <option value="Women">Women</option>
            <option value="Kids">Kids</option>
            <option value="Unisex">Unisex</option>
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">All Status</option>
            <option value="in">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-sm font-medium">
            <tr>
              <th className="p-4">Product</th>
              <th className="p-4">SKU</th>
              <th className="p-4">Variant</th>
              <th className="p-4">Stock</th>
              <th className="p-4">Status</th>
              <th className="p-4">Value</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {paginatedItems.map((item) => (<tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => handleRowClick(item)}>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden flex-shrink-0">
                      <img src={item.image} alt={item.productName} className="w-full h-full object-cover"/>
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">{item.productName}</div>
                      <div className="text-xs text-slate-500">{item.category} • {item.brand}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm font-mono text-slate-600 dark:text-slate-400">{item.sku}</td>
                <td className="p-4">
                    <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full border border-slate-200 dark:border-slate-600" style={{ backgroundColor: item.colorCode }} title={item.color}/>
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                            {item.size} • {item.color}
                        </span>
                    </div>
                </td>
                <td className="p-4">
                    <span className="font-bold text-slate-900 dark:text-white">{item.stockQuantity}</span>
                </td>
                <td className="p-4">
                  {item.stockQuantity <= 0 ? (<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      <lucide_react_1.XCircle size={14}/> Out of Stock
                    </span>) : item.stockQuantity < 10 ? (<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <lucide_react_1.AlertCircle size={14}/> Low Stock
                    </span>) : (<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <lucide_react_1.CheckCircle2 size={14}/> In Stock
                    </span>)}
                </td>
                <td className="p-4 text-sm text-slate-600 dark:text-slate-400">
                    ${(item.stockQuantity * (item.price || 0)).toLocaleString()}
                </td>
                <td className="p-4 text-right">
                  <button onClick={(e) => handleAdjustStock(item, e)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors" title="Adjust Stock">
                    <lucide_react_1.Edit2 size={18}/>
                  </button>
                </td>
              </tr>))}
            
            {filteredItems.length === 0 && (<tr>
                    <td colSpan={7} className="p-12 text-center text-slate-500 dark:text-slate-400">
                        No inventory items found matching your filters.
                    </td>
                </tr>)}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm text-slate-500">
        <div>Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} items</div>
        <div className="flex gap-2">
            <button className="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>
              Previous
            </button>
            <button className="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-50 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors" disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>
              Next
            </button>
        </div>
      </div>

      {selectedItem && (<StockAdjustmentModal_1.default isOpen={adjustModalOpen} onClose={() => setAdjustModalOpen(false)} productId={selectedItem.productId} variantId={selectedItem.variantId} currentStock={selectedItem.currentStock} productName={selectedItem.productName} variantName={selectedItem.variantName}/>)}

      {detailItem && (<InventoryDetailPanel_1.default isOpen={detailPanelOpen} onClose={() => setDetailPanelOpen(false)} productId={detailItem.productId} variantId={detailItem.variantId}/>)}
    </div>);
}
