"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DepartmentCard;
const lucide_react_1 = require("lucide-react");
const react_1 = require("@headlessui/react");
const react_2 = require("react");
function DepartmentCard({ department, onEdit, onDelete, onManageMembers }) {
    return (<div className="group relative bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5 hover:shadow-lg transition-all duration-300 hover:border-indigo-500/50 dark:hover:border-indigo-500/50">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {department.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1 mt-1">
            {department.description || 'No description'}
          </p>
        </div>
        
        <react_1.Menu as="div" className="relative">
          <react_1.Menu.Button className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400">
            <lucide_react_1.MoreVertical className="w-5 h-5"/>
          </react_1.Menu.Button>
          <react_1.Transition as={react_2.Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
            <react_1.Menu.Items className="absolute right-0 mt-1 w-36 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-100 dark:border-slate-700 focus:outline-none z-10">
              <div className="p-1">
                <react_1.Menu.Item>
                  {({ active }) => (<button onClick={() => onManageMembers(department)} className={`${active ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'} flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm`}>
                      <lucide_react_1.Users className="w-4 h-4"/>
                      Members
                    </button>)}
                </react_1.Menu.Item>
                <react_1.Menu.Item>
                  {({ active }) => (<button onClick={() => onEdit(department)} className={`${active ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'} flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm`}>
                      <lucide_react_1.Edit className="w-4 h-4"/>
                      Edit
                    </button>)}
                </react_1.Menu.Item>
                <react_1.Menu.Item>
                  {({ active }) => (<button onClick={() => onDelete(department.id)} className={`${active ? 'bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'} flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm`}>
                      <lucide_react_1.Trash2 className="w-4 h-4"/>
                      Delete
                    </button>)}
                </react_1.Menu.Item>
              </div>
            </react_1.Menu.Items>
          </react_1.Transition>
        </react_1.Menu>
      </div>

      <div className="space-y-4">
        {/* Manager Info */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm">
            {department.manager ? (`${department.manager.firstName[0]}${department.manager.lastName[0]}`) : ('?')}
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
              Department Head
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {department.manager ? (`${department.manager.firstName} ${department.manager.lastName}`) : (<span className="text-gray-400 italic">Unassigned</span>)}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-50 dark:bg-slate-900/50 p-2 rounded-lg text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white flex items-center justify-center gap-1">
              <lucide_react_1.Users className="w-4 h-4 text-indigo-500"/>
              {department.employeeCount || 0}
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg text-center">
            <div className="text-xs text-green-600 dark:text-green-400 mb-1">Active</div>
            <div className="text-lg font-bold text-green-700 dark:text-green-300 flex items-center justify-center gap-1">
              <lucide_react_1.CheckCircle className="w-4 h-4"/>
              {department.activeEmployeeCount || 0}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-slate-900/50 p-2 rounded-lg text-center">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Inactive</div>
            <div className="text-lg font-bold text-gray-600 dark:text-gray-300 flex items-center justify-center gap-1">
              <lucide_react_1.XCircle className="w-4 h-4"/>
              {department.inactiveEmployeeCount || 0}
            </div>
          </div>
        </div>
      </div>
    </div>);
}
