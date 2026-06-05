"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FashionDashboardLayout;
const inventory_context_1 = require("../../../context/inventory-context");
function FashionDashboardLayout({ children, }) {
    return (<inventory_context_1.InventoryProvider>
      {children}
    </inventory_context_1.InventoryProvider>);
}
