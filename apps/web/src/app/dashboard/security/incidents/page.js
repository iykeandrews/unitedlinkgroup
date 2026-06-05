"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = IncidentsPage;
const react_1 = __importDefault(require("react"));
const IncidentList_1 = __importDefault(require("@/components/incidents/IncidentList"));
function IncidentsPage() {
    return (<div className="py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Incident Reports</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
            Log and track security incidents, accidents, and other events.
            </p>
        </div>
      </div>

      <IncidentList_1.default />
    </div>);
}
