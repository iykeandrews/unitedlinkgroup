"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DesignStats;
const react_1 = __importDefault(require("react"));
const lucide_react_1 = require("lucide-react");
const design_context_1 = require("../../../context/design-context");
function DesignStats() {
    const { projects } = (0, design_context_1.useDesign)();
    const stats = [
        {
            label: 'Active Designs',
            value: projects.filter(p => p.status !== 'Completed').length,
            icon: lucide_react_1.Palette,
            color: 'text-purple-600',
            bg: 'bg-purple-100 dark:bg-purple-900/30',
        },
        {
            label: 'In Sampling',
            value: projects.filter(p => p.status === 'Sampling').length,
            icon: lucide_react_1.Scissors,
            color: 'text-amber-600',
            bg: 'bg-amber-100 dark:bg-amber-900/30',
        },
        {
            label: 'In Production',
            value: projects.filter(p => p.status === 'In Production').length,
            icon: lucide_react_1.CheckCircle,
            color: 'text-emerald-600',
            bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        },
        {
            label: 'Pending Approval',
            value: projects.filter(p => p.stages.some(s => s.name === 'Approvals' && s.status === 'Pending')).length,
            icon: lucide_react_1.Clock,
            color: 'text-blue-600',
            bg: 'bg-blue-100 dark:bg-blue-900/30',
        }
    ];
    return (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => (<div key={index} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
              <stat.icon className="w-6 h-6"/>
            </div>
            <span className="text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</span>
          </div>
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</h3>
        </div>))}
    </div>);
}
