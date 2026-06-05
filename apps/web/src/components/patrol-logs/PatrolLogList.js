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
exports.default = PatrolLogList;
const react_1 = __importStar(require("react"));
const image_1 = __importDefault(require("next/image"));
const lucide_react_1 = require("lucide-react");
const api_1 = __importDefault(require("../../lib/api"));
function PatrolLogList({ servicePinId, locationId, refreshTrigger }) {
    const [logs, setLogs] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const fetchLogs = (0, react_1.useCallback)(async () => {
        try {
            setLoading(true);
            let url = '';
            if (servicePinId) {
                url = `/patrol-logs/pin/${servicePinId}`;
            }
            else if (locationId) {
                url = `/patrol-logs/location/${locationId}`;
            }
            else {
                url = '/patrol-logs';
            }
            const res = await api_1.default.get(url);
            setLogs(res.data);
        }
        catch (error) {
            console.error('Failed to fetch patrol logs', error);
        }
        finally {
            setLoading(false);
        }
    }, [servicePinId, locationId]);
    (0, react_1.useEffect)(() => {
        fetchLogs();
    }, [fetchLogs, refreshTrigger]);
    const getIcon = (type) => {
        switch (type) {
            case 'INCIDENT':
                return <lucide_react_1.AlertTriangle className="text-red-500" size={20}/>;
            case 'MAINTENANCE':
                return <lucide_react_1.Info className="text-orange-500" size={20}/>;
            default:
                return <lucide_react_1.CheckCircle className="text-green-500" size={20}/>;
        }
    };
    if (loading) {
        return <div className="text-center py-8 text-slate-500">Loading logs...</div>;
    }
    if (logs.length === 0) {
        return <div className="text-center py-8 text-slate-500">No patrol logs found.</div>;
    }
    return (<div className="space-y-4">
      {logs.map((log) => {
            var _a, _b, _c;
            return (<div key={log.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="mt-1 bg-slate-100 dark:bg-slate-700 p-2 rounded-full">
              {getIcon(log.type)}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    {log.type}
                    {((_a = log.servicePin) === null || _a === void 0 ? void 0 : _a.location) && (<span className="text-xs font-normal text-slate-500">
                            @ {log.servicePin.location.name}
                        </span>)}
                    {log.servicePin && (<span className="text-xs font-normal bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full dark:bg-blue-900/30 dark:text-blue-300">
                            {log.servicePin.positionType}
                        </span>)}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{log.message}</p>
                  <p className="text-xs text-slate-400 mt-1">By: {(_b = log.user) === null || _b === void 0 ? void 0 : _b.firstName} {(_c = log.user) === null || _c === void 0 ? void 0 : _c.lastName}</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div className="flex items-center gap-1 justify-end">
                    <lucide_react_1.Clock size={12}/>
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1 justify-end mt-1">
                    <lucide_react_1.User size={12}/>
                    {log.user.firstName} {log.user.lastName}
                  </div>
                </div>
              </div>
              
              {(log.geoLat && log.geoLng) && (<div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                  <lucide_react_1.MapPin size={12}/>
                  {log.geoLat.toFixed(6)}, {log.geoLng.toFixed(6)}
                </div>)}
              
              {log.imageUrl && (<div className="mt-3">
                  <image_1.default src={log.imageUrl} alt="Log attachment" width={500} height={300} className="rounded-md w-auto h-auto max-h-48 object-cover border border-slate-200 dark:border-slate-700"/>
                </div>)}
            </div>
          </div>
        </div>);
        })}
    </div>);
}
