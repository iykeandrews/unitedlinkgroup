"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DesignProjectBoard;
const react_1 = __importDefault(require("react"));
const COLUMNS = [
    { id: 'Concept', title: 'Concept', color: 'border-slate-400' },
    { id: 'Sampling', title: 'Sampling', color: 'border-amber-400' },
    { id: 'Approved', title: 'Approved', color: 'border-blue-400' },
    { id: 'In Production', title: 'In Production', color: 'border-purple-400' },
    { id: 'Completed', title: 'Completed', color: 'border-emerald-400' },
];
function DesignProjectBoard({ projects, onSelectProject }) {
    return (<div className="flex gap-6 overflow-x-auto pb-6 h-[calc(100vh-250px)]">
      {COLUMNS.map((column) => {
            const columnProjects = projects.filter(p => p.status === column.id);
            return (<div key={column.id} className="flex-none w-80 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 flex flex-col h-full">
            <div className={`flex items-center justify-between mb-4 pb-2 border-b-2 ${column.color}`}>
              <h3 className="font-semibold text-slate-900 dark:text-white">{column.title}</h3>
              <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full">
                {columnProjects.length}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
              {columnProjects.map((project) => (<div key={project.id} onClick={() => onSelectProject(project)} className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md cursor-pointer transition-all">
                  {project.thumbnailUrl && (<div className="h-32 mb-3 rounded bg-slate-100 overflow-hidden">
                      <img src={project.thumbnailUrl} alt="" className="w-full h-full object-cover"/>
                    </div>)}
                  <h4 className="font-medium text-slate-900 dark:text-white mb-1">{project.name}</h4>
                  <div className="flex justify-between items-center text-xs text-slate-500">
                    <span>{project.season}</span>
                    <span className={`px-1.5 py-0.5 rounded ${project.priority === 'High' ? 'bg-red-100 text-red-600' :
                        project.priority === 'Medium' ? 'bg-orange-100 text-orange-600' :
                            'bg-blue-100 text-blue-600'}`}>
                        {project.priority}
                    </span>
                  </div>
                </div>))}
            </div>
          </div>);
        })}
    </div>);
}
