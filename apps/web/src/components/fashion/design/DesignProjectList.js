"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DesignProjectList;
const react_1 = __importDefault(require("react"));
const lucide_react_1 = require("lucide-react");
function DesignProjectList({ projects, viewMode, onSelectProject }) {
    const getStatusColor = (status) => {
        switch (status) {
            case 'Concept': return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
            case 'Sampling': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            case 'Approved': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'In Production': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
            case 'Completed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
            default: return 'bg-slate-100 text-slate-700';
        }
    };
    if (viewMode === 'grid') {
        return (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {projects.map((project) => (<div key={project.id} onClick={() => onSelectProject(project)} className="group bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-all cursor-pointer">
            <div className="relative h-48 bg-slate-100 dark:bg-slate-700">
              {project.thumbnailUrl ? (<img src={project.thumbnailUrl} alt={project.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"/>) : (<div className="flex items-center justify-center h-full text-slate-400">
                  No Image
                </div>)}
              <div className="absolute top-3 right-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{project.season} • {project.category}</p>
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                  <lucide_react_1.User className="w-4 h-4 mr-2"/>
                  {project.designer}
                </div>
                <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
                  <lucide_react_1.Calendar className="w-4 h-4 mr-2"/>
                  Launch: {new Date(project.targetLaunchDate).toLocaleDateString()}
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                 <div className="flex gap-1">
                    {project.stages.slice(0, 3).map((stage, i) => (<div key={i} className={`w-2 h-2 rounded-full ${stage.status === 'Completed' ? 'bg-emerald-500' :
                        stage.status === 'In Progress' ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-600'}`} title={stage.name}/>))}
                 </div>
                 <span className={`text-xs font-medium px-2 py-0.5 rounded ${project.priority === 'High' ? 'bg-red-100 text-red-600' :
                    project.priority === 'Medium' ? 'bg-orange-100 text-orange-600' :
                        'bg-blue-100 text-blue-600'}`}>
                     {project.priority}
                 </span>
              </div>
            </div>
          </div>))}
      </div>);
    }
    return (<div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400">
          <tr>
            <th className="px-6 py-4 font-medium">Design Name</th>
            <th className="px-6 py-4 font-medium">Status</th>
            <th className="px-6 py-4 font-medium">Season</th>
            <th className="px-6 py-4 font-medium">Designer</th>
            <th className="px-6 py-4 font-medium">Launch Date</th>
            <th className="px-6 py-4 font-medium">Priority</th>
            <th className="px-6 py-4 font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
          {projects.map((project) => (<tr key={project.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors" onClick={() => onSelectProject(project)}>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    {project.thumbnailUrl && <img src={project.thumbnailUrl} alt="" className="w-full h-full object-cover"/>}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">{project.name}</div>
                    <div className="text-slate-500">{project.productType}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                  {project.status}
                </span>
              </td>
              <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{project.season}</td>
              <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{project.designer}</td>
              <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{new Date(project.targetLaunchDate).toLocaleDateString()}</td>
              <td className="px-6 py-4">
                 <span className={`text-xs font-medium px-2 py-0.5 rounded ${project.priority === 'High' ? 'bg-red-100 text-red-600' :
                project.priority === 'Medium' ? 'bg-orange-100 text-orange-600' :
                    'bg-blue-100 text-blue-600'}`}>
                     {project.priority}
                 </span>
              </td>
              <td className="px-6 py-4 text-right">
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
                  <lucide_react_1.MoreHorizontal className="w-4 h-4 text-slate-400"/>
                </button>
              </td>
            </tr>))}
        </tbody>
      </table>
    </div>);
}
