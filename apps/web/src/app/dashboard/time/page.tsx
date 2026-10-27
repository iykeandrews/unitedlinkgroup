"use client";
import ServiceDatePicker from "../../../components/invoices/ServiceDatePicker";
import { DailyRoster } from '../../../components/dashboard/DailyRoster';
import { recordPeriodBounds, startsInWorkPeriod } from '../../../lib/time/calendar-history';
import { formatRecordTime } from '../../../lib/time/record-zone';

import { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "../../../context/auth-context";
import {
  savedPay,
  DirectoryEmployee,
} from "../../../components/people/directory";
import { workedHours, downloadCsv } from "../../../lib/time/records";
import {
  canApproveTimesheet,
  groupTimesheetsByLocation,
} from "../../../lib/time/location-groups";
import api from "../../../lib/api";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Check,
  MoreHorizontal,
  Coffee,
  Clock,
  Zap,
  ChevronDown,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Printer,
  FileText,
  Download,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  isSameDay,
  differenceInMinutes,
  parseISO,
} from "date-fns";
import { useBusiness } from "../../../context/business-context";
import { formatCurrency } from "../../../lib/localization";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  hourlyRate?: number;
  salary?: number;
  role?: string;
  badgeNumber?: string;
  workerType?: string;
}

interface Break {
  id: string;
  startTime: string;
  endTime?: string | null;
  type: string;
}

interface Timesheet {
  shiftHourlyRate?: number | null;
  additionalWorkAmount?: number;
  additionalWorkDescription?: string | null;
  timeZone?: string | null;
  id: string;
  startTime: string;
  endTime?: string | null;
  status: "PENDING" | "APPROVED" | "IN_PROGRESS" | "REJECTED" | "DISCARDED";
  employeeId: string;
  workerType?: string;
  employee?: Employee;
  paidExternally?: boolean;
  breaks: Break[];
  notes?: string;
  location?: { id: string; name: string };
}

interface Location {
  id: string;
  name: string;
  workOrder?: string;
  startDate?: string;
  endDate?: string;
}

import { TimesheetDetailsModal } from "../../../components/time-tracking/TimesheetDetailsModal";
import { ManualTimesheetModal } from "../../../components/time-tracking/ManualTimesheetModal";

export default function TimeTrackingPage() {
  const { user } = useAuth();
  const canImport =
    user?.role === "BUSINESS_ADMIN" || user?.role === "SUPER_ADMIN";
  const canApprove = canImport || user?.role === "MANAGER";
  const { selectedBusiness } = useBusiness();
  const requestVersion = useRef(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attendanceRevision, setAttendanceRevision] = useState(0);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  // State
  const [startDate, setStartDate] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [endDate, setEndDate] = useState(() =>
    endOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [periodFrom, setPeriodFrom] = useState(() => format(startDate,"yyyy-MM-dd"));
  const [periodTo, setPeriodTo] = useState(() => format(endDate,"yyyy-MM-dd"));
  const [reportStatus, setReportStatus] = useState<"ALL" | "APPROVED" | "PENDING">("ALL");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportEmployeeMode, setReportEmployeeMode] = useState<"all" | "selected">("all");
  const [reportEmployeeIds, setReportEmployeeIds] = useState<string[]>([]);
  const [reportEmployeeQuery, setReportEmployeeQuery] = useState("");
  const [reportEmployeesOpen, setReportEmployeesOpen] = useState(false);
  useEffect(() => {setReportEmployeeIds([]);setReportEmployeeMode("all");},[selectedBusiness?.id,periodFrom,periodTo]);
  useEffect(() => {
    setPeriodFrom(format(startDate,"yyyy-MM-dd")); setPeriodTo(format(endDate,"yyyy-MM-dd"));
  }, [startDate,endDate]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<
    "all" | "pending" | "approved" | "discarded"
  >("all");
  const [roleTab, setRoleTab] = useState<"W2" | "CONTRACTOR_1099">("W2");
  const [expandedEmployees, setExpandedEmployees] = useState<
    Record<string, boolean>
  >({});

  // New State for Features
  const [groupBy, setGroupBy] = useState<"employee" | "date" | "location">(
    "employee",
  );
  const [selectedTimesheetIds, setSelectedTimesheetIds] = useState<Set<string>>(
    new Set(),
  );
  const [isViewOptionsOpen, setIsViewOptionsOpen] = useState(false);
  const [isAddOptionsOpen, setIsAddOptionsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
    return () => {
      requestVersion.current++;
    };
  }, [startDate, endDate, selectedBusiness?.id, roleTab, attendanceRevision]);

  const fetchData = async () => {
    const version = ++requestVersion.current;
    setError("");
    setSelectedTimesheetIds(new Set());
    setIsModalOpen(false);
    setManualOpen(false);
    setSelectedTimesheet(null);
    if (!selectedBusiness) {
      setTimesheets([]);
      setEmployees([]);
      setLocations([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const startDay = format(startDate,'yyyy-MM-dd'), endDay = format(endDate,'yyyy-MM-dd');
      const {start,end}=recordPeriodBounds(startDay,endDay);

      const [timesheetsRes, employeesRes, locationsRes] = await Promise.all([
        api.get("/time-tracking/timesheets", {
          params: {
            start: start.toISOString(),
            end: end.toISOString(),
            workerType: roleTab,
          },
          headers: selectedBusiness?.id
            ? { "x-business-id": selectedBusiness.id }
            : {},
        }),
        api.get("/employees", {
          headers: selectedBusiness?.id
            ? { "x-business-id": selectedBusiness.id }
            : {},
        }),
        api.get("/locations", {
          headers: selectedBusiness?.id
            ? { "x-business-id": selectedBusiness.id }
            : {},
        }),
      ]);

      if (version !== requestVersion.current) return;
      const records = timesheetsRes.data.filter(
        (t: Timesheet) =>
          (t.workerType || t.employee?.workerType || "W2") === roleTab && startsInWorkPeriod(t,startDay,endDay),
      );
      const directory = new Map<string, Employee>(employeesRes.data.map((employee: Employee) => [employee.id, employee]));
      records.forEach((record: Timesheet) => { if (record.employee && !directory.has(record.employeeId)) directory.set(record.employeeId, record.employee); });
      const team = Array.from(directory.values()).filter(
        (e: Employee) =>
          (e.workerType || "W2") === roleTab ||
          records.some((t: Timesheet) => t.employeeId === e.id),
      );
      setTimesheets(
        records.map((t: Timesheet) => ({
          ...t,
          status:
            !t.endTime && t.status === "PENDING" ? "IN_PROGRESS" : t.status,
        })),
      );
      setEmployees(
        team.map((e: Employee) => {
          const pay = savedPay({
            ...e,
            workerType: roleTab,
          } as DirectoryEmployee);
          return {
            ...e,
            hourlyRate: pay?.unit === "hour" ? pay.amount : undefined,
            salary: pay?.unit === "year" ? pay.amount : undefined,
          };
        }),
      );
      setLocations(locationsRes.data);

      // Initialize all employees as expanded
      const initialExpanded: Record<string, boolean> = {};
      employeesRes.data.forEach((e: Employee) => {
        initialExpanded[e.id] = true;
      });
      setExpandedEmployees(initialExpanded);
    } catch (error) {
      if (version !== requestVersion.current) return;
      setTimesheets([]);
      setEmployees([]);
      setError("Unable to load timesheets. Please retry.");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  };

  const handlePrevWeek = () => {
    setStartDate((d) => subWeeks(d, 1));
    setEndDate((d) => subWeeks(d, 1));
  };

  const handleNextWeek = () => {
    setStartDate((d) => addWeeks(d, 1));
    setEndDate((d) => addWeeks(d, 1));
  };

  const toggleEmployeeExpand = (empId: string) => {
    setExpandedEmployees((prev) => ({
      ...prev,
      [empId]: !(prev[empId] ?? (groupBy === "location")),
    }));
  };

  const toggleTimesheetSelection = (id: string) => {
    const newSet = new Set(selectedTimesheetIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedTimesheetIds(newSet);
  };

  const handleSelectAll = (ids: string[]) => {
    if (ids.every((id) => selectedTimesheetIds.has(id))) {
      // Deselect all
      const newSet = new Set(selectedTimesheetIds);
      ids.forEach((id) => newSet.delete(id));
      setSelectedTimesheetIds(newSet);
    } else {
      // Select all
      const newSet = new Set(selectedTimesheetIds);
      ids.forEach((id) => newSet.add(id));
      setSelectedTimesheetIds(newSet);
    }
  };

  const applyReportPeriod = () => {
    if (!periodFrom || !periodTo || periodFrom > periodTo || Date.parse(periodTo)-Date.parse(periodFrom)>366*86400000) {
      toast.error("Choose a valid date range of up to one year"); return false;
    }
    setStartDate(parseISO(periodFrom)); setEndDate(parseISO(periodTo));
    setSelectedEmployeeId(null); setActiveTab(reportStatus === "ALL" ? "all" : reportStatus === "APPROVED" ? "approved" : "pending");
    return true;
  };
  const downloadPeriodReport = async (fileFormat: "pdf" | "xlsx") => {
    if (reportEmployeeMode === "selected" && reportEmployeeIds.length === 0) {toast.error("Choose at least one employee, or select all employees");return;}
    if (!applyReportPeriod() || !selectedBusiness || reportBusy) return;
    setReportBusy(true);
    try {
      const response = await api.get("/time-tracking/timesheet-report",{
        params:{from:periodFrom,to:periodTo,status:reportStatus,format:fileFormat,workerType:roleTab,
          ...(selectedLocationId!=="all"?{locationId:selectedLocationId}:{}),
          ...(reportEmployeeMode==="selected"?{employeeIds:reportEmployeeIds.join(",")}:{})},
        headers:{"x-business-id":selectedBusiness.id},responseType:"blob",
      });
      const url=URL.createObjectURL(response.data);
      const link=document.createElement("a");link.href=url;link.download="timesheets-"+periodFrom+"-to-"+periodTo+"."+fileFormat;link.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch(error:any) {
      let message="Unable to download the timesheet report";
      try { if(error.response?.data instanceof Blob) message=JSON.parse(await error.response.data.text()).message || message; } catch {}
      toast.error(message);
    } finally { setReportBusy(false); }
  };

  const handleExportPDF = (
    targetTimesheets: Timesheet[],
    action: "download" | "print" = "download",
  ) => {
    const doc = new jsPDF();

    const tableData = targetTimesheets.map((t) => [
      t.employee ? `${t.employee.firstName} ${t.employee.lastName}` : "Unknown",
      formatRecordTime(t.startTime, "MMM d, yyyy", t.timeZone),
      formatRecordTime(t.startTime, "HH:mm", t.timeZone),
      t.endTime ? formatRecordTime(t.endTime, "HH:mm", t.timeZone) : "-",
      t.breaks.length > 0 ? `${t.breaks.length} breaks` : "None",
      getDurationHours(t.startTime, t.endTime, t.breaks).toFixed(2) + "h",
      t.status,
    ]);

    autoTable(doc, {
      head: [
        ["Employee", "Date", "Start", "End", "Breaks", "Duration", "Status"],
      ],
      body: tableData,
    });

    if (action === "download") {
      doc.save("timesheets.pdf");
    } else {
      doc.autoPrint();
      window.open(doc.output("bloburl"), "_blank");
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!canImport) return;
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    if (selectedBusiness?.id) {
      formData.append("businessId", selectedBusiness.id);
    }

    try {
      setLoading(true);
      const result = await api.post("/time-tracking/import", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      toast.success(
        `${result.data.count ?? result.data.imported ?? 0} timesheets imported`,
      );
      if (result.data.errors?.length)
        toast.error(result.data.errors.join("; "));
      await fetchData();
    } catch (error) {
      console.error("Import failed", error);
      toast.error("Failed to import timesheets");
    } finally {
      setLoading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Calculations
  const getDurationHours = (
    start: string,
    end?: string | null,
    breaks: Break[] = [],
  ) =>
    workedHours(
      start,
      end,
      breaks.filter((b) => b.type !== "PAID"),
    );

  const getPay = (hours: number, rate: number = 0) => {
    return hours * rate;
  };

  // Process Data
  const reportEmployeeOptions = employees.filter(employee => timesheets.some(t =>
    t.employeeId === employee.id && startsInWorkPeriod(t,periodFrom,periodTo) &&
    (reportStatus === "ALL" ? ["APPROVED","PENDING","IN_PROGRESS"].includes(t.status) : reportStatus === "PENDING" ? ["PENDING","IN_PROGRESS"].includes(t.status) : t.status === reportStatus) &&
    (selectedLocationId === "all" || t.location?.id === selectedLocationId)
  )).filter(employee => (employee.firstName+" "+employee.lastName+" "+(employee.badgeNumber||"")).toLowerCase().includes(reportEmployeeQuery.trim().toLowerCase()));
  const filteredEmployees = employees.filter((emp) =>
    (activeTab === "discarded" || timesheets.some(t => t.employeeId === emp.id && (reportStatus === "ALL" ? ["APPROVED","PENDING","IN_PROGRESS"].includes(t.status) : reportStatus === "PENDING" ? ["PENDING","IN_PROGRESS"].includes(t.status) : t.status === reportStatus) && (selectedLocationId === "all" || t.location?.id === selectedLocationId))) &&
    `${emp.firstName} ${emp.lastName}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()),
  );

  const paidHoursFor = (t: Timesheet) => {
    const rate = t.shiftHourlyRate ?? employees.find(e => e.id === t.employeeId)?.hourlyRate;
    return getDurationHours(t.startTime, t.endTime, t.breaks) + (rate && rate > 0 ? (t.additionalWorkAmount || 0) / rate : 0);
  };
  const paymentFor = (t: Timesheet) => getPay(getDurationHours(t.startTime, t.endTime, t.breaks), t.shiftHourlyRate ?? employees.find(e => e.id === t.employeeId)?.hourlyRate) + (t.additionalWorkAmount || 0);

  const employeeStats = useMemo(() => {
    const stats: Record<string, { count: number; hours: number; pay: number }> =
      {};
    employees.forEach((emp) => {
      const empTimesheets = timesheets.filter((t) => t.employeeId === emp.id && (activeTab === "discarded" ? ["DISCARDED","REJECTED"].includes(t.status) : reportStatus === "ALL" ? ["APPROVED","PENDING","IN_PROGRESS"].includes(t.status) : reportStatus === "PENDING" ? ["PENDING","IN_PROGRESS"].includes(t.status) : t.status === reportStatus));

      // Filter stats based on date range (already filtered by API) and location if needed
      let filtered = empTimesheets;
      if (selectedLocationId !== "all") {
        filtered = filtered.filter(
          (t) => t.location?.id === selectedLocationId,
        );
      }

      const count = filtered.length;
      let hours = 0;
      let pay = 0;

      filtered.forEach((t) => {
        const h = getDurationHours(t.startTime, t.endTime, t.breaks);
        const rate = t.shiftHourlyRate ?? emp.hourlyRate;
        hours += h + (rate && rate > 0 ? (t.additionalWorkAmount || 0) / rate : 0);
        pay += getPay(h, rate) + (t.additionalWorkAmount || 0);
      });

      stats[emp.id] = { count, hours, pay };
    });
    return stats;
  }, [timesheets, employees, selectedLocationId, reportStatus, activeTab]);

  const scopedTimesheets = timesheets.filter(
    (t) =>
      (selectedLocationId === "all" || t.location?.id === selectedLocationId) &&
      (!selectedEmployeeId || t.employeeId === selectedEmployeeId) &&
      filteredEmployees.some((e) => e.id === t.employeeId),
  );
  const groupedTimesheets = useMemo(() => {
    let filtered = activeTab === "discarded" ? timesheets : timesheets.filter(t => reportStatus !== "ALL" ? (reportStatus === "PENDING" ? ["PENDING","IN_PROGRESS"].includes(t.status) : t.status === reportStatus) : ["APPROVED","PENDING","IN_PROGRESS"].includes(t.status));

    // Tab Filter
    if (activeTab === "pending")
      filtered = filtered.filter(
        (t) => t.status === "PENDING" || t.status === "IN_PROGRESS",
      );
    if (activeTab === "approved")
      filtered = filtered.filter((t) => t.status === "APPROVED");
    if (activeTab === "discarded")
      filtered = filtered.filter(
        (t) => t.status === "DISCARDED" || t.status === "REJECTED",
      );

    // Location Filter
    if (selectedLocationId !== "all") {
      filtered = filtered.filter((t) => t.location?.id === selectedLocationId);
    }

    // Employee Filter
    if (selectedEmployeeId) {
      filtered = filtered.filter((t) => t.employeeId === selectedEmployeeId);
    }

    filtered = filtered.filter((t) =>
      filteredEmployees.some((e) => e.id === t.employeeId),
    );

    // Grouping Logic
    const groups: {
      id: string;
      title: string;
      subtitle?: string;
      employee?: Employee;
      timesheets: Timesheet[];
      stats: { count: number; hours: number; pay: number };
    }[] = [];

    if (groupBy === "employee") {
      // Group by Employee
      const sortedEmployees = [...filteredEmployees].sort((a, b) =>
        a.firstName.localeCompare(b.firstName),
      );

      sortedEmployees.forEach((emp) => {
        const empTimesheets = filtered.filter((t) => t.employeeId === emp.id);
        if (empTimesheets.length > 0) {
          const stats = {
            count: empTimesheets.length,
            hours: empTimesheets.reduce(
              (acc, t) =>
                acc + paidHoursFor(t),
              0,
            ),
            pay: empTimesheets.reduce(
              (acc, t) =>
                acc +
                paymentFor(t),
              0,
            ),
          };
          groups.push({
            id: emp.id,
            title: emp.firstName,
            subtitle: `(${emp.firstName} ${emp.lastName})`,
            employee: emp,
            timesheets: empTimesheets,
            stats,
          });
        }
      });
    } else if (groupBy === "location") {
      groups.push(
        ...groupTimesheetsByLocation<Timesheet>(filtered).map((group) => ({
          ...group,
          stats: {
            count: group.timesheets.length,
            hours: group.timesheets.reduce((n, t) => n + paidHoursFor(t), 0),
            pay: group.timesheets.reduce((n, t) => n + paymentFor(t), 0),
          },
        })),
      );
    } else {
      // Group by Date
      const dateMap = new Map<string, Timesheet[]>();
      filtered.forEach((t) => {
        const dateKey = formatRecordTime(t.startTime, "yyyy-MM-dd", t.timeZone);
        if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
        dateMap.get(dateKey)?.push(t);
      });

      // Sort dates (newest first)
      const sortedDates = Array.from(dateMap.keys()).sort((a, b) =>
        b.localeCompare(a),
      );

      sortedDates.forEach((dateStr) => {
        const dateTimesheets = dateMap.get(dateStr) || [];
        // Sort timesheets within date by time
        dateTimesheets.sort(
          (a, b) =>
            new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
        );

        const displayDate = format(parseISO(dateStr), "EEE, MMM d, yyyy");

        const stats = {
          count: dateTimesheets.length,
          hours: dateTimesheets.reduce(
            (acc, t) =>
              acc + paidHoursFor(t),
            0,
          ),
          pay: dateTimesheets.reduce((acc, t) => {
            const emp = employees.find((e) => e.id === t.employeeId);
            return (
              acc +
              paymentFor(t)
            );
          }, 0),
        };

        groups.push({
          id: dateStr,
          title: displayDate,
          timesheets: dateTimesheets,
          stats,
        });
      });
    }

    return groups;
  }, [
    reportStatus,
    timesheets,
    filteredEmployees,
    activeTab,
    selectedLocationId,
    selectedEmployeeId,
    groupBy,
    employees,
  ]);

  const totalStats = useMemo(() => {
    return groupedTimesheets.reduce(
      (acc, group) => {
        return {
          count: acc.count + group.stats.count,
          hours: acc.hours + group.stats.hours,
          pay: acc.pay + group.stats.pay,
        };
      },
      { count: 0, hours: 0, pay: 0 },
    );
  }, [groupedTimesheets]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <Zap className="w-3 h-3 fill-current" />
            Approved
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <Clock className="w-3 h-3" />
            Clocked In
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <AlertCircle className="w-3 h-3" />
            Pending Approval
          </span>
        );
      case "REJECTED":
      case "DISCARDED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="w-3 h-3" />
            Discarded
          </span>
        );
      default:
        return null;
    }
  };

  const bulkAction = async (
    action: "approve" | "discard" | "restore",
    scopeIds?: string[],
  ) => {
    if (busy) return;
    const targets = groupedTimesheets
      .flatMap((g) => g.timesheets)
      .filter((t) => scopeIds ? scopeIds.includes(t.id) : selectedTimesheetIds.has(t.id))
      .filter((t) => action !== "approve" || canApproveTimesheet(t));
    if (!targets.length) {
      if (action === "approve")
        toast.info("No completed pending timesheets are ready for approval in this selection.");
      return;
    }
    setBusy(true);
    const results: PromiseSettledResult<unknown>[] = [];
    for (let offset = 0; offset < targets.length; offset += 5)
      results.push(...await Promise.allSettled(
      targets.slice(offset, offset + 5).map((t) =>
        action === "approve"
          ? api.patch(`/time-tracking/timesheets/${t.id}`, {
              status: "APPROVED",
            })
          : action === "discard"
            ? api.delete(`/time-tracking/timesheets/${t.id}`)
            : api.post(`/time-tracking/timesheets/${t.id}/restore`),
      ),
    ));
    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length)
      toast.error(
        `${failed.length} timesheets could not be updated. Review incomplete shifts and retry.`,
      );
    if (results.length > failed.length)
      toast.success(`${results.length - failed.length} timesheets updated`);
    setBusy(false);
    await fetchData();
  };
  useEffect(() => {
    setSelectedTimesheetIds(new Set());
  }, [
    roleTab,
    activeTab,
    selectedLocationId,
    selectedEmployeeId,
    searchTerm,
    selectedBusiness?.id,
  ]);

  if (loading && employees.length === 0)
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        Loading...
      </div>
    );

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-white dark:bg-slate-900">
      {!selectedBusiness && (
        <p className="p-4">Choose a business to view timesheets.</p>
      )}
      {error && (
        <p role="alert" className="p-4 text-red-600">
          {error}{" "}
          <button onClick={fetchData} className="underline">
            Retry
          </button>
        </p>
      )}
      {selectedTimesheetIds.size > 0 && (
        <div className="flex flex-wrap gap-3 p-3 bg-purple-50 dark:bg-slate-800">
          <span>{selectedTimesheetIds.size} selected</span>
          {(["approve", "discard", "restore"] as const).map((action) => (
            <button
              disabled={busy}
              key={action}
              onClick={() => bulkAction(action)}
              className="capitalize text-purple-600 disabled:opacity-50"
            >
              {action}
            </button>
          ))}
        </div>
      )}
      <p className="px-4 py-2 text-xs text-slate-500">
        Cost estimates exclude missing hourly rates. Salary, overtime and
        allowances are calculated in payroll.
      </p>
      {/* Role Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4">
        <button
          onClick={() => setRoleTab("W2")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            roleTab === "W2"
              ? "border-purple-600 text-purple-600 dark:text-purple-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          W-2 Payroll Hours
        </button>
        <button
          onClick={() => setRoleTab("CONTRACTOR_1099")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            roleTab === "CONTRACTOR_1099"
              ? "border-orange-500 text-orange-600 dark:text-orange-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          }`}
        >
          1099 Contractor Hours
        </button>

        {/* Tooltip / Help Info */}
        <div className="flex items-center ml-4">
          <div className="group relative flex items-center">
            <div className="cursor-help text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
              Hours are completely separate. W-2 hours affect payroll taxes,
              while 1099 hours are for contractor payments only.
            </div>
          </div>
        </div>
      </div>

      {canImport && <details className="flex-shrink-0 border-b dark:border-slate-700"><summary className="cursor-pointer px-4 py-3 font-semibold text-purple-700">Live attendance · Clock officers in or out</summary><div className="max-h-80 overflow-auto p-4"><DailyRoster businessId={selectedBusiness?.id} onAttendanceChange={() => setAttendanceRevision(v => v + 1)} /></div></details>}

      <div className="flex flex-wrap items-end gap-3 border-b bg-slate-50 px-4 py-3 dark:bg-slate-800">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Period from<ServiceDatePicker label="Timesheet period from" value={periodFrom} onChange={setPeriodFrom} className="mt-1 block rounded-lg border bg-white p-2 text-sm dark:bg-slate-900" /></label>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Period to<ServiceDatePicker label="Timesheet period to" min={periodFrom} value={periodTo} onChange={setPeriodTo} className="mt-1 block rounded-lg border bg-white p-2 text-sm dark:bg-slate-900" /></label>
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Attendance status<select aria-label="Report attendance status" value={reportStatus} onChange={event=>{setReportStatus(event.target.value as typeof reportStatus);setSelectedEmployeeId(null);setActiveTab("all");}} className="mt-1 block rounded-lg border bg-white p-2 text-sm dark:bg-slate-900"><option value="ALL">Approved and pending</option><option value="APPROVED">Approved only</option><option value="PENDING">Pending only</option></select></label>
        <button type="button" onClick={applyReportPeriod} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white">Search period</button>
        <div className="relative" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setReportEmployeesOpen(false);}}>
          <button type="button" aria-haspopup="dialog" aria-expanded={reportEmployeesOpen} aria-controls="report-employee-picker" onClick={()=>{setReportEmployeeQuery("");setReportEmployeesOpen(v=>!v);}} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm dark:bg-slate-900">
            {reportEmployeeMode==="all"?"All employees":reportEmployeeIds.length+" employees selected"}<ChevronDown size={16} />
          </button>
          {reportEmployeesOpen && <div id="report-employee-picker" role="dialog" aria-label="Choose employees to download" className="absolute left-0 top-full z-50 mt-1 w-80 rounded-lg border bg-white p-3 shadow-xl dark:bg-slate-900">
            <input autoFocus type="search" aria-label="Search employees to download" placeholder="Search employees by name or badge" value={reportEmployeeQuery} onChange={event=>setReportEmployeeQuery(event.target.value)} className="mb-2 w-full rounded border p-2 text-sm dark:bg-slate-800" />
            <label className="mb-2 flex items-center gap-2 border-b pb-2 text-sm font-semibold"><input type="checkbox" checked={reportEmployeeMode==="all"} onChange={event=>{setReportEmployeeMode(event.target.checked?"all":"selected");setReportEmployeeIds([]);}} />All employees in the period</label>
            <div className="max-h-52 overflow-auto">{reportEmployeeOptions.map(employee=><label key={employee.id} className="flex items-center gap-2 rounded px-1 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
              <input type="checkbox" checked={reportEmployeeMode==="selected" && reportEmployeeIds.includes(employee.id)} onChange={event=>{setReportEmployeeMode("selected");setReportEmployeeIds(previous=>event.target.checked?Array.from(new Set([...previous,employee.id])):previous.filter(id=>id!==employee.id));}} />
              {employee.firstName} {employee.lastName}{employee.badgeNumber?" · "+employee.badgeNumber:""}
            </label>)}
            {reportEmployeeOptions.length===0 && <p className="py-2 text-xs text-slate-500">No matching employees. Search the period first to refresh available attendance.</p>}</div>
            <button type="button" onClick={()=>setReportEmployeesOpen(false)} className="mt-2 w-full rounded bg-purple-600 px-3 py-2 text-sm font-semibold text-white">Done</button>
          </div>}
        </div>
        <button type="button" disabled={reportBusy || !selectedBusiness} onClick={()=>downloadPeriodReport("pdf")} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50 dark:bg-slate-900"><FileText size={16} />Download PDF</button>
        <button type="button" disabled={reportBusy || !selectedBusiness} onClick={()=>downloadPeriodReport("xlsx")} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50 dark:bg-slate-900"><FileSpreadsheet size={16} />Download Excel</button>
        <p className="w-full text-xs text-slate-500">{reportBusy ? "Preparing report…" : "Reports use the selected period, classification, location and chosen employees. Gross pay is estimated; pending time remains subject to approval."}</p>
      </div>

      {/* Top Toolbar - Global Filters */}
      <div className="min-h-16 flex flex-wrap gap-3 items-center justify-between px-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0 z-10">
        <div className="flex flex-wrap items-center gap-3">
          {/* Location Selector */}
          {canImport && <button type="button" onClick={() => setManualOpen(true)} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white">Add timesheet</button>}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <div className="w-2 h-2 rounded-full bg-purple-600"></div>
            </div>
            <select
              className="appearance-none bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 text-purple-700 dark:text-purple-300 pl-8 pr-8 py-1.5 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer min-w-[160px]"
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
            >
              <option value="all">All Locations</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2 top-2.5 text-purple-700 dark:text-purple-300 pointer-events-none" />
          </div>

          {/* Date Navigation */}
          <div className="flex items-center bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-md p-0.5">
            <button
              aria-label="Previous week"
              onClick={handlePrevWeek}
              className="p-1 hover:bg-white dark:hover:bg-purple-900/50 rounded text-purple-700 dark:text-purple-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm font-medium text-purple-700 dark:text-purple-300 min-w-[180px] text-center">
              {format(startDate, "EEE d MMM")} - {format(endDate, "EEE d MMM")}
            </span>
            <button
              aria-label="Next week"
              onClick={handleNextWeek}
              className="p-1 hover:bg-white dark:hover:bg-purple-900/50 rounded text-purple-700 dark:text-purple-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchData}
            className="p-1.5 text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <select
            aria-label="Group timesheets"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as "employee" | "date" | "location")}
            className="rounded border p-2 dark:bg-slate-800"
          >
            <option value="employee">Group by team member</option>
            <option value="date">Group by date</option>
            <option value="location">Group by location</option>
          </select>
          {groupBy === "location" && <span className="text-xs text-slate-500">Location approvals use the current period, {roleTab === "W2" ? "W-2" : "1099"} tab and filters.</span>}
          <input
            aria-label="Search timesheets"
            placeholder="Search team members"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="md:hidden rounded border p-2 dark:bg-slate-800 w-full"
          />
          {/* View Options */}
          <div className="relative">
            <div className="relative">
              <button
                onClick={() => setIsViewOptionsOpen(!isViewOptionsOpen)}
                className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-md text-sm font-medium"
              >
                View options
                <ChevronDown className="w-4 h-4" />
              </button>
              {isViewOptionsOpen && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-50">
                  <button
                    onClick={() => {
                      handleExportPDF(
                        groupedTimesheets.flatMap((g) => g.timesheets),
                      );
                      setIsViewOptionsOpen(false);
                    }}
                    className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <FileText className="w-4 h-4" /> Export Timesheet as PDF
                  </button>
                  <button
                    onClick={() => {
                      handleExportPDF(
                        groupedTimesheets.flatMap((g) => g.timesheets),
                        "print",
                      );
                      setIsViewOptionsOpen(false);
                    }}
                    className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <Printer className="w-4 h-4" /> Print Timesheet
                  </button>
                  <div className="border-t border-slate-100 dark:border-slate-700 my-1"></div>
                  <button
                    onClick={() => {
                      const selected = timesheets.filter((t) =>
                        selectedTimesheetIds.has(t.id),
                      );
                      if (selected.length === 0)
                        return toast.error("No timesheets selected");
                      handleExportPDF(selected, "print");
                      setIsViewOptionsOpen(false);
                    }}
                    className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <Printer className="w-4 h-4" /> Print Selected Timesheet
                  </button>
                  <button
                    onClick={() => {
                      const selected = timesheets.filter((t) =>
                        selectedTimesheetIds.has(t.id),
                      );
                      if (selected.length === 0)
                        return toast.error("No timesheets selected");
                      handleExportPDF(selected, "download");
                      setIsViewOptionsOpen(false);
                    }}
                    className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    <FileText className="w-4 h-4" /> Export Selected Timesheet
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add Button */}
        <div>
          <div className="relative">
            <button
              onClick={() => setIsAddOptionsOpen(!isAddOptionsOpen)}
              className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-md text-sm font-medium hover:bg-purple-100 transition-colors"
            >
              Import
              <ChevronDown className="w-4 h-4" />
            </button>
            {isAddOptionsOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-50">
                <button
                  onClick={() => {
                    downloadCsv(
                      [["EmployeeEmail", "Date", "StartTime", "EndTime"]],
                      "timesheet-import-template.csv",
                    );
                    setIsAddOptionsOpen(false);
                  }}
                  className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <Download className="w-4 h-4" /> Download import template
                </button>
                <button
                  disabled={!canImport}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <Upload className="w-4 h-4" /> Import from Excel
                </button>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
            />
          </div>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Left */}
        <div className="hidden md:flex w-80 flex-col border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-0">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search"
                className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              aria-label="Clear employee search"
              onClick={() => {
                setSearchTerm("");
                setSelectedEmployeeId(null);
              }}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500"
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>

          {/* Employee List */}
          <div className="flex-1 overflow-y-auto">
            {filteredEmployees.map((emp) => {
              const stats = employeeStats[emp.id];
              // Simple logic to determine if this employee has data in current view
              const hasData = stats && stats.count > 0;
              const isSelected = selectedEmployeeId === emp.id;

              return (
                <div
                  key={emp.id}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedEmployeeId(isSelected ? null : emp.id);
                    }
                  }}
                  onClick={() =>
                    setSelectedEmployeeId(isSelected ? null : emp.id)
                  }
                  className={`flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-purple-50 dark:bg-purple-900/20 border-l-4 border-l-purple-600"
                      : hasData
                        ? "bg-slate-50/50 dark:bg-slate-800/30"
                        : ""
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 border-2 border-white dark:border-slate-800 flex items-center justify-center flex-shrink-0 relative">
                    <span className="text-sm font-bold text-green-700 dark:text-green-400">
                      {emp.firstName[0]}
                      {emp.lastName[0]}
                    </span>
                    {hasData &&
                      timesheets
                        .filter(
                          (t) =>
                            t.employeeId === emp.id &&
                            (selectedLocationId === "all" ||
                              t.location?.id === selectedLocationId),
                        )
                        .every((t) => t.status === "APPROVED") && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full flex items-center justify-center">
                          <Check className="w-2 h-2 text-white" />
                        </div>
                      )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate flex items-center gap-2">
                      {emp.firstName}{" "}
                      <span className="text-slate-500 font-normal">
                        ({emp.firstName} {emp.lastName})
                      </span>
                      {timesheets.some(
                        (t) =>
                          t.employeeId === emp.id && t.status === "IN_PROGRESS",
                      ) && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          Active
                        </span>
                      )}
                    </div>
                    {emp.salary != null && (
                      <div className="text-xs text-slate-500">
                        Annual salary:{" "}
                        {formatCurrency(
                          emp.salary,
                          selectedBusiness?.currencyCode,
                        )}
                        /year
                      </div>
                    )}
                    {stats && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {stats.count} | {stats.hours.toFixed(1)}h ·{" "}
                        {formatCurrency(
                          stats.pay,
                          selectedBusiness?.currencyCode,
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredEmployees.length === 0 && (
              <div className="p-6 text-center text-sm text-slate-500">
                No employees found.
              </div>
            )}
          </div>
        </div>

        {/* Main Content - Right */}
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900/50 min-w-0">
          {/* Tabs */}
          <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 pt-4 flex-shrink-0">
            <div className="flex flex-wrap gap-4">
              {[
                { id: "all", label: "All", count: timesheets.length },
                {
                  id: "pending",
                  label: "Pending",
                  count: scopedTimesheets.filter(
                    (t) => t.status === "PENDING" || t.status === "IN_PROGRESS",
                  ).length,
                },
                {
                  id: "approved",
                  label: "Approved",
                  count: scopedTimesheets.filter((t) => t.status === "APPROVED")
                    .length,
                },
                {
                  id: "discarded",
                  label: "Discarded",
                  count: scopedTimesheets.filter(
                    (t) => t.status === "DISCARDED" || t.status === "REJECTED",
                  ).length,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === tab.id
                      ? "border-purple-600 text-purple-600 dark:text-purple-400"
                      : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      activeTab === tab.id
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-auto p-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
              {/* Summary Row */}
              <div className="flex items-center gap-4 p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  checked={
                    groupedTimesheets.length > 0 &&
                    groupedTimesheets.every((g) =>
                      g.timesheets.every((t) => selectedTimesheetIds.has(t.id)),
                    )
                  }
                  onChange={() => {
                    const allIds = groupedTimesheets.flatMap((g) =>
                      g.timesheets.map((t) => t.id),
                    );
                    handleSelectAll(allIds);
                  }}
                />
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  All timesheets{" "}
                  <span className="text-slate-500 dark:text-slate-400 font-normal ml-1">
                    {totalStats.count} timesheet
                    {totalStats.count !== 1 ? "s" : ""} ·{" "}
                    {totalStats.hours.toFixed(1)}h ·{" "}
                    {formatCurrency(
                      totalStats.pay,
                      selectedBusiness?.currencyCode,
                    )}{" "}
                    hourly estimate · salaries calculated in payroll
                  </span>
                </div>
              </div>

              {/* Grouped Rows */}
              {groupedTimesheets.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  No timesheets found for this view.
                </div>
              ) : (
                groupedTimesheets.map((group) => {
                  const isExpanded = expandedEmployees[group.id] ?? (groupBy === "location");
                  const approvable = group.timesheets.filter(canApproveTimesheet);
                  const allSelected =
                    group.timesheets.length > 0 &&
                    group.timesheets.every((t) =>
                      selectedTimesheetIds.has(t.id),
                    );
                  const someSelected = group.timesheets.some((t) =>
                    selectedTimesheetIds.has(t.id),
                  );

                  return (
                    <div
                      key={group.id}
                      className="border-b border-slate-200 dark:border-slate-700 last:border-b-0"
                    >
                      {/* Group Header */}
                      <div
                        className="flex flex-wrap items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer group"
                        onClick={() => toggleEmployeeExpand(group.id)}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Select timesheets for ${group.title}`}
                          className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                          checked={allSelected}
                          ref={(input) => {
                            if (input)
                              input.indeterminate =
                                someSelected && !allSelected;
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onChange={() =>
                            handleSelectAll(group.timesheets.map((t) => t.id))
                          }
                        />

                        {groupBy === "employee" && group.employee ? (
                          <>
                            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                              {group.employee.firstName[0]}
                              {group.employee.lastName[0]}
                            </div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white flex-1">
                              {group.employee.firstName}{" "}
                              <span className="text-slate-500 font-normal">
                                ({group.employee.firstName}{" "}
                                {group.employee.lastName})
                              </span>
                              <span className="text-slate-500 dark:text-slate-400 font-normal ml-2">
                                {group.stats.count} timesheet
                                {group.stats.count !== 1 ? "s" : ""} ·{" "}
                                {group.stats.hours.toFixed(1)}h ·{" "}
                                {formatCurrency(
                                  group.stats.pay,
                                  selectedBusiness?.currencyCode,
                                )}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="text-sm font-bold text-slate-900 dark:text-white flex-1">
                            {group.title}
                            <span className="text-slate-500 dark:text-slate-400 font-normal ml-2">
                              {group.stats.count} timesheet
                              {group.stats.count !== 1 ? "s" : ""} ·{" "}
                              {group.stats.hours.toFixed(1)}h ·{" "}
                              {formatCurrency(
                                group.stats.pay,
                                selectedBusiness?.currencyCode,
                              )}
                            </span>
                          </div>
                        )}

                        {groupBy === "location" && canApprove && activeTab !== "discarded" && <button
                          type="button"
                          disabled={busy || loading || approvable.length===0}
                          aria-label={`Approve ${approvable.length} pending timesheets at ${group.title}`}
                          onClick={e=>{e.stopPropagation();void bulkAction("approve",group.timesheets.map(t=>t.id));}}
                          className="shrink-0 rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >Approve {approvable.length} pending</button>}

                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        />
                      </div>

                      {/* Timesheets List */}
                      {isExpanded && (
                        <div className="bg-slate-50 dark:bg-slate-900/20">
                          {group.timesheets.map((timesheet) => {
                            const clockedHours = getDurationHours(
                              timesheet.startTime,
                              timesheet.endTime,
                              timesheet.breaks,
                            );
                            const rate = timesheet.shiftHourlyRate ?? employees.find(e => e.id === timesheet.employeeId)?.hourlyRate;
                            const hours = clockedHours + (rate && rate > 0 ? (timesheet.additionalWorkAmount || 0) / rate : 0);
                            const pay = getPay(clockedHours, rate) + (timesheet.additionalWorkAmount || 0);

                            // Break duration
                            let breakMinutes = 0;
                            timesheet.breaks.forEach((b) => {
                              if (b.startTime && b.endTime) {
                                breakMinutes += differenceInMinutes(
                                  parseISO(b.endTime),
                                  parseISO(b.startTime),
                                );
                              }
                            });

                            return (
                              <div
                                key={timesheet.id}
                                className="flex items-start md:items-center gap-3 p-3 md:p-4 md:pl-14 border-t border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                  checked={selectedTimesheetIds.has(
                                    timesheet.id,
                                  )}
                                  onChange={() =>
                                    toggleTimesheetSelection(timesheet.id)
                                  }
                                />

                                <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-12 gap-3 md:gap-4 items-center">
                                  {/* Date / Employee Name */}
                                  <div className="col-span-1 md:col-span-3 text-sm font-medium text-slate-900 dark:text-white">
                                    {groupBy !== "employee" ? (
                                      <span className="flex items-center gap-2">
                                        {timesheet.employee && (
                                          <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                            {timesheet.employee.firstName[0]}
                                            {timesheet.employee.lastName[0]}
                                          </span>
                                        )}
                                        <span>
                                          {timesheet.employee
                                            ? `${timesheet.employee.firstName} ${timesheet.employee.lastName}`
                                            : "Unknown"}
                                        </span>

                                        <span
                                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                            roleTab === "W2"
                                              ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800"
                                              : "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800"
                                          }`}
                                        >
                                          {roleTab === "W2" ? "W-2" : "1099"}
                                        </span>
                                      </span>
                                    ) : (
                                      formatRecordTime(timesheet.startTime, "EEE d MMM", timesheet.timeZone)
                                    )}
                                    {groupBy === "location" && <span className="block text-xs font-normal text-slate-500 mt-1">{formatRecordTime(timesheet.startTime, "EEE d MMM, yyyy", timesheet.timeZone)}</span>}
                                  </div>

                                  {/* Status */}
                                  <div className="col-span-1 md:col-span-2">
                                    {getStatusBadge(timesheet.status)}
                                    {timesheet.paidExternally && <span className="block text-xs text-emerald-700">Paid externally</span>}
                                  </div>

                                  {/* Time Range */}
                                  <div className="col-span-1 md:col-span-2 text-sm text-slate-600 dark:text-slate-300">
                                    {formatRecordTime(timesheet.startTime, "h:mm a", timesheet.timeZone)}{" "}
                                    –{" "}
                                    {timesheet.endTime
                                      ? formatRecordTime(timesheet.endTime, "h:mm a", timesheet.timeZone)
                                      : "Now"}
                                  </div>

                                  {/* Breaks */}
                                  <div className="col-span-1 md:col-span-1 flex items-center gap-1 text-sm text-slate-500">
                                    <Coffee className="w-3 h-3" />
                                    {breakMinutes}m
                                  </div>

                                  {/* Hours */}
                                  <div className="col-span-1 md:col-span-1 flex items-center gap-1 text-sm text-slate-500">
                                    <Clock className="w-3 h-3" />
                                    {hours.toFixed(1)}h
                                  </div>

                                  {/* Type/Location */}
                                  <div className="col-span-1 md:col-span-2 text-sm text-slate-500 truncate">
                                    {timesheet.location?.name ||
                                      "Regular Shift"}
                                  </div>

                                  {/* Pay */}
                                  <div className="col-span-1 md:col-span-1 text-sm font-medium text-slate-900 dark:text-white text-right">
                                    {employees.find(
                                      (e) => e.id === timesheet.employeeId,
                                    )?.salary != null
                                      ? "Salary"
                                      : formatCurrency(
                                          pay,
                                          selectedBusiness?.currencyCode,
                                        )}
                                  </div>
                                </div>

                                {/* Actions */}
                                <div className="flex justify-end">
                                  <button
                                    onClick={() => {
                                      setSelectedTimesheet({
                                        ...timesheet,
                                        employee:
                                          employees.find(
                                            (e) =>
                                              e.id === timesheet.employeeId,
                                          ) || timesheet.employee,
                                      });
                                      setIsModalOpen(true);
                                    }}
                                    aria-label="Review timesheet"
                                    className="text-slate-400 hover:text-purple-600"
                                  >
                                    <MoreHorizontal className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {canImport && <ManualTimesheetModal businessId={selectedBusiness?.id} isOpen={manualOpen} onClose={() => setManualOpen(false)} employees={employees} locations={locations} workerType={roleTab} onSaved={(record) => {
        const date = new Date(formatRecordTime(record.startTime, 'yyyy-MM-dd', record.timeZone) + 'T12:00:00');
        setStartDate(date); setEndDate(date); setSelectedEmployeeId(null); setSelectedLocationId('all'); setActiveTab('pending'); setAttendanceRevision(v => v + 1);
      }} />}
      <TimesheetDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        timesheet={selectedTimesheet}
        locations={locations}
        onUpdate={fetchData}
        currencyCode={selectedBusiness?.currencyCode}
      />
    </div>
  );
}
