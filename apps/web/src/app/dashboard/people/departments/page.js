"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DepartmentsPage;
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const api_1 = __importDefault(require("../../../../lib/api"));
const DepartmentCard_1 = __importDefault(require("../../../../components/departments/DepartmentCard"));
const DepartmentModal_1 = __importDefault(require("../../../../components/departments/DepartmentModal"));
const DepartmentMembersModal_1 = __importDefault(require("../../../../components/departments/DepartmentMembersModal"));
function DepartmentsPage() {
    const [departments, setDepartments] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [isModalOpen, setIsModalOpen] = (0, react_1.useState)(false);
    const [isMembersModalOpen, setIsMembersModalOpen] = (0, react_1.useState)(false);
    const [selectedDepartment, setSelectedDepartment] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        fetchDepartments();
    }, []);
    const fetchDepartments = async () => {
        try {
            setLoading(true);
            const res = await api_1.default.get('/departments');
            setDepartments(res.data);
        }
        catch (error) {
            console.error('Failed to fetch departments', error);
        }
        finally {
            setLoading(false);
        }
    };
    const handleEdit = (dept) => {
        setSelectedDepartment(dept);
        setIsModalOpen(true);
    };
    const handleManageMembers = (dept) => {
        setSelectedDepartment(dept);
        setIsMembersModalOpen(true);
    };
    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this department?'))
            return;
        try {
            await api_1.default.delete(`/departments/${id}`);
            fetchDepartments();
        }
        catch (error) {
            console.error('Failed to delete department', error);
        }
    };
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedDepartment(null);
    };
    const handleCloseMembersModal = () => {
        setIsMembersModalOpen(false);
        setSelectedDepartment(null);
    };
    const filteredDepartments = departments.filter(dept => {
        var _a;
        return dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ((_a = dept.description) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(searchQuery.toLowerCase()));
    });
    return (<div className="flex flex-col h-full w-full bg-slate-50/50 dark:bg-slate-950/50">
      <div className="flex-1 w-full p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 rounded-2xl border border-gray-200/50 dark:border-slate-700/50 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">Departments</h1>
          <p className="text-sm text-gray-500 mt-1">
            Organize your workforce structure and hierarchy
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="group relative px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
          <div className="flex items-center gap-2 text-sm font-medium relative">
            <lucide_react_1.Plus className="w-4 h-4"/>
            <span>Create Department</span>
          </div>
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 rounded-2xl border border-gray-200/50 dark:border-slate-700/50 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <lucide_react_1.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input type="text" placeholder="Search departments..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"/>
        </div>
        <div className="w-px h-6 bg-gray-200 dark:bg-slate-700"/>
        <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg transition-colors">
          <lucide_react_1.Filter className="w-4 h-4"/>
          <span>Filters</span>
        </button>
      </div>

      {/* Grid */}
      {loading ? (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (<div key={i} className="h-48 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse"/>))}
        </div>) : filteredDepartments.length > 0 ? (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDepartments.map((dept) => (<DepartmentCard_1.default key={dept.id} department={dept} onEdit={handleEdit} onDelete={handleDelete} onManageMembers={handleManageMembers}/>))}
        </div>) : (<div className="text-center py-20 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
          <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <lucide_react_1.Filter className="w-8 h-8 text-gray-400"/>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">No departments found</h3>
          <p className="text-gray-500 mt-1">Try adjusting your search or create a new department.</p>
        </div>)}

      <DepartmentModal_1.default isOpen={isModalOpen} onClose={handleCloseModal} onSuccess={fetchDepartments} department={selectedDepartment}/>

      <DepartmentMembersModal_1.default isOpen={isMembersModalOpen} onClose={handleCloseMembersModal} onUpdate={fetchDepartments} department={selectedDepartment}/>
    </div>
  </div>);
}
