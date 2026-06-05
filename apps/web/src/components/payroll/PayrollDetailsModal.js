"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PayrollDetailsModal;
const react_1 = __importStar(require("react"));
const Modal_1 = require("../Modal");
const api_1 = __importDefault(require("../../lib/api"));
const lucide_react_1 = require("lucide-react");
const localization_1 = require("../../lib/localization");
const business_context_1 = require("../../context/business-context");
function PayrollDetailsModal({ payrollId, onClose }) {
    var _a, _b;
    const { selectedBusiness } = (0, business_context_1.useBusiness)();
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [payroll, setPayroll] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        if (payrollId) {
            fetchPayrollDetails(payrollId);
        }
        else {
            setPayroll(null);
        }
    }, [payrollId]);
    const fetchPayrollDetails = async (id) => {
        try {
            setLoading(true);
            const res = await api_1.default.get(`/payroll/${id}`);
            setPayroll(res.data);
        }
        catch (error) {
            console.error('Failed to fetch payroll details', error);
        }
        finally {
            setLoading(false);
        }
    };
    if (!payrollId)
        return null;
    // Split stubs by worker type
    const w2Stubs = ((_a = payroll === null || payroll === void 0 ? void 0 : payroll.payStubs) === null || _a === void 0 ? void 0 : _a.filter((stub) => {
        var _a;
        const workerType = (_a = stub.employee) === null || _a === void 0 ? void 0 : _a.workerType;
        if (workerType === 'W2')
            return true;
        if (workerType === 'CONTRACTOR_1099')
            return false;
        // For BOTH: Check if it looks like a W-2 stub (has taxes/deductions)
        // 1099 payments typically have 0 taxes and 0 deductions
        if (workerType === 'BOTH') {
            return stub.taxes > 0 || stub.deductions > 0;
        }
        return true; // Default to W2 if undefined
    })) || [];
    const contractorStubs = ((_b = payroll === null || payroll === void 0 ? void 0 : payroll.payStubs) === null || _b === void 0 ? void 0 : _b.filter((stub) => {
        var _a;
        const workerType = (_a = stub.employee) === null || _a === void 0 ? void 0 : _a.workerType;
        if (workerType === 'CONTRACTOR_1099')
            return true;
        if (workerType === 'W2')
            return false;
        // For BOTH: If no taxes and no deductions, assume it's the 1099 portion
        if (workerType === 'BOTH') {
            return stub.taxes === 0 && stub.deductions === 0;
        }
        return false;
    })) || [];
    const totalCost = ((payroll === null || payroll === void 0 ? void 0 : payroll.totalGross) || 0) + ((payroll === null || payroll === void 0 ? void 0 : payroll.totalEmployerTaxes) || 0);
    const renderTable = (stubs, title, is1099 = false) => {
        if (stubs.length === 0)
            return null;
        return (<div className="space-y-3">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          {title}
          <span className="text-xs font-normal text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
            {stubs.length}
          </span>
        </h3>
        <div className="border rounded-lg overflow-hidden border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium">Employee</th>
                <th className="px-4 py-3 font-medium">Gross Pay</th>
                {!is1099 && <th className="px-4 py-3 font-medium">Taxes</th>}
                {!is1099 && <th className="px-4 py-3 font-medium">Deductions</th>}
                <th className="px-4 py-3 font-medium">Net Pay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {stubs.map((stub) => (<tr key={stub.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                    {stub.employee.firstName} {stub.employee.lastName}
                  </td>
                  <td className="px-4 py-3">{(0, localization_1.formatCurrency)(stub.grossPay, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</td>
                  {!is1099 && <td className="px-4 py-3">{(0, localization_1.formatCurrency)(stub.taxes, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</td>}
                  {!is1099 && <td className="px-4 py-3">{(0, localization_1.formatCurrency)(stub.deductions, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}</td>}
                  <td className="px-4 py-3 font-bold text-green-600 dark:text-green-400">
                      {(0, localization_1.formatCurrency)(stub.netPay, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
                  </td>
                </tr>))}
            </tbody>
          </table>
        </div>
      </div>);
    };
    return (<Modal_1.Modal isOpen={!!payrollId} onClose={onClose} title="Payroll Details" maxWidth="max-w-4xl">
      {loading ? (<div className="flex justify-center py-12">
          <lucide_react_1.Loader2 className="w-8 h-8 animate-spin text-indigo-600"/>
        </div>) : payroll ? (<div className="space-y-8">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
             <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800">
                <div className="text-sm text-indigo-600 dark:text-indigo-400 mb-1 font-medium">Total Cost</div>
                <div className="text-xl font-bold text-indigo-900 dark:text-indigo-100">
                  {(0, localization_1.formatCurrency)(totalCost, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
                </div>
             </div>
             <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Gross</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {(0, localization_1.formatCurrency)(payroll.totalGross, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
                </div>
             </div>
             <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Net</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {(0, localization_1.formatCurrency)(payroll.totalNet, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
                </div>
             </div>
             <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Employee Taxes</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {(0, localization_1.formatCurrency)(payroll.totalEmployeeTaxes, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
                </div>
             </div>
             <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Employer Taxes</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {(0, localization_1.formatCurrency)(payroll.totalEmployerTaxes, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.currencyCode)}
                </div>
             </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between gap-4 text-sm border-b border-slate-200 dark:border-slate-700 pb-4">
             <div>
                <span className="text-slate-500">Pay Period:</span>{' '}
                <span className="font-medium text-slate-900 dark:text-white ml-2">
                    {(0, localization_1.formatDate)(payroll.periodStart, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country)} - {(0, localization_1.formatDate)(payroll.periodEnd, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country)}
                </span>
             </div>
             <div>
                <span className="text-slate-500">Pay Date:</span>{' '}
                <span className="font-medium text-slate-900 dark:text-white ml-2">
                    {(0, localization_1.formatDate)(payroll.payDate, selectedBusiness === null || selectedBusiness === void 0 ? void 0 : selectedBusiness.country)}
                </span>
             </div>
          </div>

          {/* Employee Tables */}
          <div className="space-y-8">
            {w2Stubs.length > 0 && renderTable(w2Stubs, "W-2 Employees")}
            {contractorStubs.length > 0 && renderTable(contractorStubs, "1099 Contractors", true)}
            
            {w2Stubs.length === 0 && contractorStubs.length === 0 && (<div className="text-center py-8 text-slate-500 italic">
                    No pay stubs found for this payroll.
                </div>)}
          </div>
        </div>) : (<div className="text-center py-8 text-slate-500">
            Failed to load payroll details.
         </div>)}
    </Modal_1.Modal>);
}
