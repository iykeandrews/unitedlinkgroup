"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PosLayout = PosLayout;
const react_1 = require("react");
const PosProductGrid_1 = require("./PosProductGrid");
const PosCart_1 = require("./PosCart");
const PosVariantSelector_1 = require("./PosVariantSelector");
const PosCheckoutModal_1 = require("./PosCheckoutModal");
const PosCustomerModal_1 = __importDefault(require("./PosCustomerModal"));
const PosHistoryModal_1 = __importDefault(require("./PosHistoryModal"));
const pos_context_1 = require("../../../context/pos-context");
function PosLayout() {
    const [selectedProduct, setSelectedProduct] = (0, react_1.useState)(null);
    const [isCustomerModalOpen, setIsCustomerModalOpen] = (0, react_1.useState)(false);
    const [isHistoryOpen, setIsHistoryOpen] = (0, react_1.useState)(false);
    const { products } = (0, pos_context_1.usePos)();
    return (<div className="flex h-[calc(100vh-theme(spacing.16))] overflow-hidden bg-slate-100 dark:bg-slate-900">
      {/* Left Side: Product Grid */}
      <div className="flex-1 min-w-0 border-r border-slate-200 dark:border-slate-700">
        <PosProductGrid_1.PosProductGrid products={products} onProductSelect={setSelectedProduct} onHistoryClick={() => setIsHistoryOpen(true)}/>
      </div>

      {/* Right Side: Cart */}
      <div className="w-[400px] flex-shrink-0 shadow-xl z-10">
        <PosCart_1.PosCart onAddCustomerClick={() => setIsCustomerModalOpen(true)}/>
      </div>

      {/* Modals */}
      <PosVariantSelector_1.PosVariantSelector product={selectedProduct} onClose={() => setSelectedProduct(null)}/>
      <PosCheckoutModal_1.PosCheckoutModal />
      <PosCustomerModal_1.default isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)}/>
      <PosHistoryModal_1.default isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)}/>
    </div>);
}
