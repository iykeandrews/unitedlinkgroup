"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FashionPOSPage;
const pos_context_1 = require("../../../../context/pos-context");
const PosLayout_1 = require("../../../../components/fashion/pos/PosLayout");
const business_context_1 = require("../../../../context/business-context");
function FashionPOSPage() {
    return (<business_context_1.BusinessProvider>
      <pos_context_1.PosProvider>
        <PosLayout_1.PosLayout />
      </pos_context_1.PosProvider>
    </business_context_1.BusinessProvider>);
}
