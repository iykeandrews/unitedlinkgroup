import { enteredBreakRange, formatRecordTime, recordInputDate } from '../../lib/time/record-zone';
import { savedPay } from "../people/directory";
import { workedHours } from "../../lib/time/records";
import { useState, useEffect, useMemo } from "react";
import { format, differenceInMinutes } from "date-fns";
import { formatCurrency } from "../../lib/localization";
import {
  MapPin,
  Clock,
  MessageSquare,
  Plus,
  Zap,
  Trash2,
  X,
  Globe,
  User,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";
import api from "../../lib/api";
import { toast } from "sonner";

interface TimesheetDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  timesheet: any;
  locations: any[];
  onUpdate: () => void;
  currencyCode?: string;
}

interface BreakItem {
  startTime: string;
  endTime: string;
  type: string;
}

export function TimesheetDetailsModal({
  isOpen,
  onClose,
  timesheet,
  locations,
  onUpdate,
  currencyCode = "USD",
}: TimesheetDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const safeCurrencyCode = currencyCode || "USD";

  const [formData, setFormData] = useState({
    startTime: "",
    endTime: "",
    locationId: "",
    managerComments: "",
    status: "",
    breaks: [] as BreakItem[],
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (timesheet) {
      setFormData({
        startTime: timesheet.startTime
          ? formatRecordTime(timesheet.startTime, "yyyy-MM-dd'T'HH:mm", timesheet.timeZone)
          : "",
        endTime: timesheet.endTime
          ? formatRecordTime(timesheet.endTime, "yyyy-MM-dd'T'HH:mm", timesheet.timeZone)
          : "",
        locationId: timesheet.locationId || "",
        managerComments: timesheet.employeeNote || "",
        status: timesheet.status,
        breaks:
          timesheet.breaks?.map((b: any) => ({
            startTime: b.startTime
              ? formatRecordTime(b.startTime, "HH:mm", timesheet.timeZone)
              : "",
            endTime: b.endTime
              ? formatRecordTime(b.endTime, "HH:mm", timesheet.timeZone)
              : "",
            type: b.type || "UNPAID",
          })) || [],
      });
      setShowDeleteConfirm(false);
    }
  }, [timesheet]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isOpen, loading, onClose]);

  const employeePay = timesheet?.employee
    ? savedPay({
        ...timesheet.employee,
        workerType: timesheet.workerType || timesheet.employee.workerType,
      })
    : null;
  // Dynamic Calculations
  const calculatedStats = useMemo(() => {
    if (!formData.startTime) return { duration: 0, pay: 0 };

    const start = recordInputDate(formData.startTime, timesheet?.timeZone);
    let end = new Date(); // Default to now if active

    if (formData.endTime) {
      end = recordInputDate(formData.endTime, timesheet?.timeZone);
    } else if (timesheet?.endTime) {
      end = new Date(timesheet.endTime);
    }

    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()))
      return { duration: 0, pay: 0 };
    const duration = workedHours(
      start.toJSON() || '',
      end.toJSON() || '',
      formData.breaks.filter((b) => b.type !== "PAID" && b.startTime).flatMap(b => {
        try {
          const range = enteredBreakRange(start, end, b.startTime, b.endTime, timesheet?.timeZone);
          return [{...b, startTime: range.start.toISOString(), endTime: range.end?.toISOString() || null}];
        } catch { return []; }
      }),
    );
    const payRate = timesheet?.employee
      ? savedPay({
          ...timesheet.employee,
          workerType: timesheet.workerType || timesheet.employee.workerType,
        })
      : null;
    const hourlyRate = payRate?.unit === "hour" ? payRate.amount : 0;
    const pay = duration * hourlyRate;

    return { duration, pay };
  }, [formData, timesheet]);

  const handleAddBreak = () => {
    setFormData((prev) => ({
      ...prev,
      breaks: [...prev.breaks, { startTime: "", endTime: "", type: "UNPAID" }],
    }));
  };

  const handleRemoveBreak = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      breaks: prev.breaks.filter((_, i) => i !== index),
    }));
  };

  const handleBreakChange = (
    index: number,
    field: keyof BreakItem,
    value: string,
  ) => {
    setFormData((prev) => {
      const newBreaks = [...prev.breaks];
      newBreaks[index] = { ...newBreaks[index], [field]: value };
      return { ...prev, breaks: newBreaks };
    });
  };

  const handleSave = async (statusOverride?: string) => {
    if (loading || timesheet?.paidExternally) return;
    try {
      setLoading(true);

      const start = formData.startTime === formatRecordTime(timesheet.startTime, "yyyy-MM-dd'T'HH:mm", timesheet?.timeZone)
        ? new Date(timesheet.startTime)
        : recordInputDate(formData.startTime, timesheet?.timeZone);
      let end = null;
      if (formData.endTime) {
        end = timesheet.endTime && formData.endTime === formatRecordTime(timesheet.endTime, "yyyy-MM-dd'T'HH:mm", timesheet?.timeZone)
          ? new Date(timesheet.endTime)
          : recordInputDate(formData.endTime, timesheet?.timeZone);
      }

      if (
        !Number.isFinite(start.getTime()) ||
        (end && (!Number.isFinite(end.getTime()) || end <= start))
      )
        throw new Error("Enter valid times with end after start");
      const processedBreaks = formData.breaks.map((b) => {
        if (!b.startTime) throw new Error("Every break needs a start time");
        const original = timesheet.breaks?.find((entry: any) =>
          new Date(entry.startTime) >= start && (!end || new Date(entry.startTime) < end)
          && (!entry.endTime || !end || new Date(entry.endTime) <= end)
          && formatRecordTime(entry.startTime, 'HH:mm', timesheet?.timeZone) === b.startTime
          && (entry.endTime ? formatRecordTime(entry.endTime, 'HH:mm', timesheet?.timeZone) : '') === b.endTime);
        const range = original ? {start:new Date(original.startTime),end:original.endTime ? new Date(original.endTime) : null}
          : enteredBreakRange(start, end || new Date(), b.startTime, b.endTime, timesheet?.timeZone);
        return {
          startTime: range.start.toISOString(),
          endTime: range.end?.toISOString() || null,
          type: b.type,
        };
      });
      await api.patch(`/time-tracking/timesheets/${timesheet.id}`, {
        startTime: start.toISOString(),
        endTime: end ? end.toISOString() : null,
        locationId: formData.locationId,
        employeeNote: formData.managerComments,
        status: statusOverride || formData.status,
        breaks: processedBreaks,
      });

      toast.success("Timesheet updated successfully");
      onUpdate();
      onClose();
    } catch (error) {
      console.error(error);
      const msg =
        (error as any)?.response?.data?.message ||
        (error as Error).message ||
        "Failed to update timesheet";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (timesheet?.paidExternally) return;
    try {
      setLoading(true);
      await api.delete(`/time-tracking/timesheets/${timesheet.id}`);
      toast.success("Timesheet discarded successfully");
      onUpdate();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error((error as any)?.response?.data?.message || "Failed to discard timesheet");
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleRestore = async () => {
    try {
      setLoading(true);
      await api.post(`/time-tracking/timesheets/${timesheet.id}/restore`);
      toast.success("Timesheet restored successfully");
      onUpdate();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Failed to restore timesheet");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !timesheet) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800 border-green-200";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100 dark:border-slate-700 transform scale-100 transition-all">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                  Discard Timesheet?
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Are you sure you want to discard this timesheet? This action
                  can be reversed from the Discarded tab. Any open clock-in and break will be ended and excluded from payable time.
                </p>
              </div>
              <div className="flex items-center gap-3 w-full mt-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-600/20 transition-all"
                >
                  {loading ? "Discarding..." : "Yes, Discard"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wider Slide-over Panel (max-w-3xl for 2 columns) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Timesheet details"
        className="fixed inset-y-0 right-0 z-50 w-full max-w-3xl bg-white dark:bg-slate-900 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col font-sans"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-700 dark:text-purple-300 text-sm font-bold">
              {timesheet.employee?.firstName?.[0]}
              {timesheet.employee?.lastName?.[0]}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {timesheet.employee?.firstName} {timesheet.employee?.lastName}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wide border ${getStatusColor(timesheet.status)}`}
                >
                  {timesheet.status.replace("_", " ")}
                </span>
              </div>
            </div>
          </div>
          <button
            aria-label="Close timesheet details"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content - 2 Columns */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              {/* Shift Details */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Clock className="w-3 h-3" /> Shift Details
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        Start Time
                      </label>
                      <input
                        type="datetime-local"
                        className="w-full px-2.5 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                        value={formData.startTime}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            startTime: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                        End Time
                      </label>
                      <input
                        type="datetime-local"
                        className="w-full px-2.5 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                        value={formData.endTime}
                        onChange={(e) =>
                          setFormData({ ...formData, endTime: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      Area / Location
                    </label>
                    <select
                      className="w-full px-2.5 py-1.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                      value={formData.locationId}
                      onChange={(e) =>
                        setFormData({ ...formData, locationId: e.target.value })
                      }
                    >
                      <option value="">Select Area</option>
                      {locations.map((loc: any) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Employee Note (Read Only) */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <User className="w-3 h-3" /> Employee Note
                </h3>
                <div className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 italic min-h-[60px]">
                  {timesheet.employeeNote || (
                    <span className="text-slate-400 not-italic">
                      No note provided by employee.
                    </span>
                  )}
                </div>
              </div>

              {/* Metadata & IPs */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ShieldAlert className="w-3 h-3" /> Metadata
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Globe className="w-3 h-3" /> Clock In IP
                    </div>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {timesheet.clockInIp || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Globe className="w-3 h-3" /> Clock Out IP
                    </div>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {timesheet.clockOutIp || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 text-xs pt-1">
                    <Zap className="w-3 h-3 text-slate-500 mt-0.5" />
                    <div>
                      <div className="text-slate-500 mb-0.5">
                        Start Coordinates
                      </div>
                      <div className="font-mono text-slate-700 dark:text-slate-300">
                        {timesheet.clockInLat != null &&
                        timesheet.clockInLng != null
                          ? `${timesheet.clockInLat.toFixed(6)}, ${timesheet.clockInLng.toFixed(6)}`
                          : "Not captured"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              {/* Breaks Section */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-3 h-3" /> Breaks
                  </h3>
                  <button
                    onClick={handleAddBreak}
                    className="text-xs flex items-center gap-1 text-purple-600 font-medium hover:text-purple-700 px-2 py-1 rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add Break
                  </button>
                </div>

                <div className="space-y-3">
                  {timesheet?.paidExternally && <p className="text-sm text-emerald-700">Already paid externally; excluded from new payroll payments. Historical record is read-only.</p>}
                  {formData.breaks.map((brk, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800 group"
                    >
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input
                          type="time"
                          aria-label={`Break ${idx + 1} start time`}
                          className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:ring-1 focus:ring-purple-500"
                          value={brk.startTime}
                          onChange={(e) =>
                            handleBreakChange(idx, "startTime", e.target.value)
                          }
                        />
                        <input
                          type="time"
                          aria-label={`Break ${idx + 1} end time`}
                          className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded focus:ring-1 focus:ring-purple-500"
                          value={brk.endTime}
                          onChange={(e) =>
                            handleBreakChange(idx, "endTime", e.target.value)
                          }
                        />
                      </div>
                      <button
                        aria-label={`Remove break ${idx + 1}`}
                        onClick={() => handleRemoveBreak(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {formData.breaks.length === 0 && (
                    <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                      No breaks recorded
                    </div>
                  )}
                </div>
              </div>

              {/* Timesheet notes */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-64">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <MessageSquare className="w-3 h-3" /> Timesheet notes
                </h3>
                <textarea
                  className="flex-1 w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none transition-all"
                  placeholder="Add your comments here..."
                  value={formData.managerComments}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      managerComments: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between gap-6 max-w-3xl mx-auto">
            <div className="flex gap-6 items-center">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Total Duration
                </div>
                <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                  {calculatedStats.duration.toFixed(2)}
                  <span className="text-sm font-normal text-slate-500 ml-0.5">
                    h
                  </span>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  {employeePay?.unit === "year"
                    ? "Annual salary"
                    : "Estimated cost"}
                </div>
                <div className="text-xl font-bold text-green-600 dark:text-green-400 font-mono">
                  {employeePay
                    ? `${formatCurrency(employeePay.unit === "year" ? employeePay.amount : calculatedStats.pay, safeCurrencyCode)}${employeePay.unit === "year" ? "/year" : ""}`
                    : "Rate not set"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {timesheet.paidExternally ? <span className="text-sm text-emerald-700">Historical paid record</span> : timesheet.status === "DISCARDED" ? (
                <button
                  onClick={handleRestore}
                  disabled={loading}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm disabled:opacity-50 transition-all uppercase tracking-wide flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Restore Timesheet
                </button>
              ) : (
                <>
                  {timesheet.status === "APPROVED" ? (
                    <button
                      onClick={() => handleSave("PENDING")}
                      className="px-6 py-2.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 hover:border-red-300 rounded-lg shadow-sm transition-all uppercase tracking-wide"
                    >
                      Unapprove
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSave("APPROVED")}
                      className="px-6 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg shadow-sm transition-all uppercase tracking-wide"
                    >
                      Approve
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-6 py-2.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 rounded-lg disabled:opacity-50 uppercase tracking-wide"
                  >
                    Discard
                  </button>
                  <button
                    onClick={() => handleSave()}
                    disabled={loading}
                    className="px-6 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm disabled:opacity-50 transition-all uppercase tracking-wide"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
