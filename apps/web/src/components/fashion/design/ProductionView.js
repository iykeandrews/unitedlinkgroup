"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ProductionView;
const react_1 = __importDefault(require("react"));
const lucide_react_1 = require("lucide-react");
function ProductionView({ production }) {
    if (!production) {
        return (<div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <lucide_react_1.Factory className="w-12 h-12 mb-4 opacity-50"/>
        <p>No production run scheduled yet.</p>
        <button className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          Start Production Run
        </button>
      </div>);
    }
    const getStageColor = (status) => {
        switch (status) {
            case 'Completed': return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400';
            case 'In Progress': return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400';
            default: return 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400';
        }
    };
    return (<div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
            <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <lucide_react_1.Factory className="w-5 h-5 text-indigo-500"/>
                    {production.factoryName}
                </h3>
                <p className="text-sm text-slate-500">Production ID: {production.id}</p>
            </div>
            <div className="flex gap-4">
                 <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase font-semibold">Quantity</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{production.quantity} pcs</p>
                 </div>
                 <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase font-semibold">Target Date</p>
                    <p className="text-xl font-bold text-slate-900 dark:text-white">{new Date(production.targetEndDate).toLocaleDateString()}</p>
                 </div>
            </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-2 flex justify-between text-sm font-medium">
            <span>Overall Progress</span>
            <span>65%</span>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full" style={{ width: '65%' }}></div>
        </div>
      </div>

      {/* Stages Timeline */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-6">Production Stages</h3>
        <div className="space-y-6">
            {production.stages.map((stage, index) => (<div key={index} className="relative pl-8 pb-6 last:pb-0 border-l-2 border-slate-200 dark:border-slate-700 last:border-0">
                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-slate-800 ${stage.status === 'Completed' ? 'bg-emerald-500' :
                stage.status === 'In Progress' ? 'bg-amber-500' : 'bg-slate-300'}`}/>
                    
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="font-medium text-slate-900 dark:text-white">{stage.name}</h4>
                            <p className="text-sm text-slate-500 mt-1">
                                {stage.status === 'Completed' ? 'Completed on June 15, 2024' :
                stage.status === 'In Progress' ? 'Estimated completion: June 20, 2024' : 'Pending start'}
                            </p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStageColor(stage.status)}`}>
                            {stage.status}
                        </span>
                    </div>

                    {stage.status === 'In Progress' && (<div className="mt-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${stage.progress}%` }}></div>
                        </div>)}
                </div>))}
        </div>
      </div>

      {/* Issues / Risk Flags */}
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-900/50 flex gap-3">
        <lucide_react_1.AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0"/>
        <div>
            <h4 className="font-medium text-red-900 dark:text-red-300">Potential Delay Detected</h4>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                Fabric delivery for &quot;Blue Denim Mfg&quot; is delayed by 2 days. This might impact the Sewing start date.
            </p>
        </div>
      </div>
    </div>);
}
