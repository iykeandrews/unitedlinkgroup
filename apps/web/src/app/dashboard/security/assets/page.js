"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AssetsPage;
const react_1 = __importDefault(require("react"));
const AssetList_1 = __importDefault(require("@/components/assets/AssetList"));
function AssetsPage() {
    return (<div className="py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Equipment & Assets</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage security gear, vehicles, and other assets.
            </p>
        </div>
      </div>

      <AssetList_1.default />
    </div>);
}
