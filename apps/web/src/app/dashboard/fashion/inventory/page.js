"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FashionInventoryPage;
const lucide_react_1 = require("lucide-react");
const InventoryStats_1 = __importDefault(require("../../../../components/fashion/inventory/InventoryStats"));
const InventoryTable_1 = __importDefault(require("../../../../components/fashion/inventory/InventoryTable"));
function FashionInventoryPage() {
    return (<div className="p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
          <lucide_react_1.Shirt className="w-6 h-6"/>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inventory & Stock</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage products, stock levels, and adjustments.</p>
        </div>
      </div>
      
      <InventoryStats_1.default />
      <InventoryTable_1.default />
    </div>);
}
