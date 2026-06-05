"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveConflictModal = void 0;
const react_1 = __importDefault(require("react"));
const lucide_react_1 = require("lucide-react");
const LeaveConflictModal = ({ isOpen, onClose, onConfirm, employeeName, locationName, date, }) => {
    if (!isOpen)
        return null;
    return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <lucide_react_1.X size={20}/>
        </button>

        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Confirmation required</h2>

        <div className="mb-6">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
            {employeeName} is not recommended to work at {locationName} since
          </p>
          <ul className="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400 mb-4">
            <li>on leave, {date}</li>
          </ul>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            Are you sure you want to roster {employeeName} in this shift?
          </p>
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            See how to set Team members as recommended.
          </button>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 rounded-md transition-colors">
            Don&apos;t update
          </button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors">
            Update shift
          </button>
        </div>
      </div>
    </div>);
};
exports.LeaveConflictModal = LeaveConflictModal;
