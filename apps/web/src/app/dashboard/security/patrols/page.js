"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PatrolsPage;
const react_1 = __importDefault(require("react"));
const PatrolLogList_1 = __importDefault(require("@/components/patrol-logs/PatrolLogList"));
function PatrolsPage() {
    return (<div className="py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Patrol Logs</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Real-time feed of all patrol activities across sites.
        </p>
      </div>

      <PatrolLogList_1.default />
    </div>);
}
