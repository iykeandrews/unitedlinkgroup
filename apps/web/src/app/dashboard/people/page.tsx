"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
  type ComponentProps,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Plus,
  Users,
  UserCheck,
  UserMinus,
  ClipboardList,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  MoreHorizontal,
  X,
  AlertCircle,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import api from "../../../lib/api";
import { useBusiness } from "../../../context/business-context";
import { useAuth } from "../../../context/auth-context";
import { AddTeamMemberModal } from "../../../components/AddTeamMemberModal";
import { EmployeeProfileModal } from "../../../components/EmployeeProfileModal";
import { ConfirmModal } from "../../../components/ConfirmModal";
import EmployeeSelfProfilePage from "../../../components/people/EmployeeSelfProfilePage";
import {
  DirectoryEmployee,
  directoryCsv,
  matchesDirectory,
  roleLabel,
  savedPay,
  toggleVisibleSelection,
} from "../../../components/people/directory";
import { formatCurrency } from "../../../lib/localization";
import { resolveFileUrl } from "../../../lib/file-url";

const inputClass =
  "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";
const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800";
const label = (value: string) =>
  value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
const profileTabs = [
  "Personal",
  "Employment",
  "Qualifications",
  "Shifts",
  "Leave",
  "Availability",
  "News feed",
];

function Avatar({ employee }: { employee: DirectoryEmployee }) {
  const [failed, setFailed] = useState(false);
  const url = resolveFileUrl(employee.profileImageUrl || "");
  useEffect(() => setFailed(false), [url]);
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-purple-100 text-sm font-semibold text-purple-700 dark:bg-purple-900/40 dark:text-purple-200">
      {url && !failed ? (
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        `${employee.firstName?.[0] || ""}${employee.lastName?.[0] || ""}`.toUpperCase() ||
        "?"
      )}
    </div>
  );
}

function AdminPeoplePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedBusiness, isLoading: businessLoading } = useBusiness();
  const { user } = useAuth();
  const canAdd = ["BUSINESS_ADMIN", "SUPER_ADMIN"].includes(String(user?.role));
  const [employees, setEmployees] = useState<DirectoryEmployee[]>([]);
  const [locations, setLocations] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [role, setRole] = useState("ALL");
  const [location, setLocation] = useState("ALL");
  const [department, setDepartment] = useState("ALL");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"list" | "grid">("list");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [profile, setProfile] =
    useState<ComponentProps<typeof EmployeeProfileModal>["employee"]>(null);
  const [profileTab, setProfileTab] = useState("Personal");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{
    ids: string[];
    status: string;
  } | null>(null);
  const [assignLocation, setAssignLocation] = useState("");
  const requestVersion = useRef(0);
  const profileVersion = useRef(0);
  const size = 15;
  const businessId = selectedBusiness?.id;
  const activeBusiness = useRef(businessId);
  activeBusiness.current = businessId;

  const refresh = useCallback(async () => {
    if (activeBusiness.current !== businessId) return;
    const version = ++requestVersion.current;
    if (!businessId) {
      setEmployees([]);
      setLocations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const headers = { "x-business-id": businessId };
    try {
      const [people, sites] = await Promise.allSettled([
        api.get("/employees", { headers }),
        api.get("/locations", { headers, params: { status: "ACTIVE" } }),
      ]);
      if (version !== requestVersion.current) return;
      if (people.status === "rejected") throw people.reason;
      if (!Array.isArray(people.value.data))
        throw new Error("The team directory returned an invalid response");
      setEmployees(people.value.data);
      setSelected(
        (previous) =>
          new Set(
            Array.from(previous).filter((id) =>
              people.value.data.some(
                (person: DirectoryEmployee) => person.id === id,
              ),
            ),
          ),
      );
      setLocations(
        sites.status === "fulfilled" && Array.isArray(sites.value.data)
          ? sites.value.data
          : [],
      );
      if (sites.status === "rejected")
        toast.error("Location options could not be loaded. Refresh to retry.");
    } catch (failure: any) {
      if (version === requestVersion.current) {
        setEmployees([]);
        setError(
          failure?.response?.data?.message ||
            failure?.message ||
            "Could not load your team",
        );
      }
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    setBusy(false);
    setAddOpen(false);
    setOpeningId(null);
    setEmployees([]);
    setSelected(new Set());
    setProfile(null);
    setConfirm(null);
    setMenuId(null);
    setLocation("ALL");
    setDepartment("ALL");
    profileVersion.current++;
    refresh();
    return () => {
      requestVersion.current++;
      profileVersion.current++;
    };
  }, [refresh]);
  useEffect(() => {
    if (window.matchMedia("(max-width: 639px)").matches) setView("grid");
  }, []);
  useEffect(() => {
    setPage(1);
    setSelected(new Set());
    setMenuId(null);
  }, [search, status, role, location, department]);

  const openProfile = useCallback(
    async (employee: { id: string }, tab = "Personal") => {
      if (!businessId) return;
      const version = ++profileVersion.current;
      setOpeningId(employee.id);
      setMenuId(null);
      try {
        const response = await api.get(`/employees/${employee.id}`, {
          headers: { "x-business-id": businessId },
        });
        if (version === profileVersion.current) {
          setProfile(response.data);
          setProfileTab(profileTabs.includes(tab) ? tab : "Personal");
        }
      } catch (failure: any) {
        if (version === profileVersion.current)
          toast.error(
            failure?.response?.data?.message || "Could not open this profile",
          );
      } finally {
        if (version === profileVersion.current) setOpeningId(null);
      }
    },
    [businessId],
  );

  useEffect(() => {
    if (!businessId || loading || !employees.length) return;
    const id = searchParams.get("employeeId");
    const action = searchParams.get("action");
    if (!id && action !== "add") return;
    const params = new URLSearchParams(searchParams.toString());
    if (action === "add") {
      if (canAdd) setAddOpen(true);
      else toast.error("Only administrators can add team members");
      params.delete("action");
    }
    if (id) {
      const employee = employees.find((person) => person.id === id);
      if (employee)
        openProfile(employee, searchParams.get("tab") || "Personal");
      else toast.error("This person is not in the selected business");
      params.delete("employeeId");
    }
    router.replace(`/dashboard/people${params.size ? `?${params}` : ""}`, {
      scroll: false,
    });
  }, [
    businessId,
    loading,
    employees,
    searchParams,
    router,
    canAdd,
    openProfile,
  ]);
  // The add shortcut must also work when the directory is empty.
  useEffect(() => {
    if (
      businessId &&
      !loading &&
      !employees.length &&
      searchParams.get("action") === "add" &&
      canAdd
    ) {
      setAddOpen(true);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("action");
      router.replace(`/dashboard/people${params.size ? `?${params}` : ""}`, {
        scroll: false,
      });
    }
  }, [businessId, loading, employees.length, searchParams, canAdd, router]);

  const roles = useMemo(
    () => Array.from(new Set(employees.map(roleLabel))).sort(),
    [employees],
  );
  const departments = useMemo(
    () =>
      Array.from(
        new Map(
          employees
            .filter((person) => person.department)
            .map((person) => [person.department!.id, person.department!]),
        ).values(),
      ).sort((a, b) => a.name.localeCompare(b.name)),
    [employees],
  );
  const filtered = useMemo(
    () =>
      employees
        .filter(
          (person) =>
            matchesDirectory(person, search) &&
            (status === "ALL" ||
              (status === "ARCHIVED"
                ? ["INACTIVE", "TERMINATED", "ARCHIVED"].includes(person.status)
                : status === "ONBOARDING"
                  ? person.type === "ONBOARDING"
                  : person.status === status)) &&
            (role === "ALL" || roleLabel(person) === role) &&
            (location === "ALL" || person.defaultLocationId === location) &&
            (department === "ALL" || person.departmentId === department),
        )
        .sort((a, b) =>
          sort === "firstName"
            ? `${a.firstName} ${a.lastName}`.localeCompare(
                `${b.firstName} ${b.lastName}`,
              )
            : sort === "status"
              ? a.status.localeCompare(b.status) ||
                a.lastName.localeCompare(b.lastName)
              : `${a.lastName} ${a.firstName}`.localeCompare(
                  `${b.lastName} ${b.firstName}`,
                ),
        ),
    [employees, search, status, role, location, department, sort],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * size, currentPage * size);
  const allVisibleSelected =
    visible.length > 0 && visible.every((person) => selected.has(person.id));
  const selectedPeople = employees.filter((person) => selected.has(person.id));
  const canManage = (person: DirectoryEmployee) =>
    canAdd ||
    !["BUSINESS_ADMIN", "SUPER_ADMIN", "MANAGER"].includes(person.role);
  const toggle = (id: string) =>
    setSelected((previous) => {
      const next = new Set(previous);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const exportPeople = () => {
    const rows = selected.size ? selectedPeople : filtered;
    if (!rows.length) {
      toast.info("There are no people to export");
      return;
    }
    const url = URL.createObjectURL(
      new Blob([directoryCsv(rows)], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `people-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} team members`);
  };
  const updatePeople = async (
    ids: string[],
    payload: Record<string, string>,
  ) => {
    if (!businessId || busy) return;
    setBusy(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) =>
          api.patch(`/employees/${id}`, payload, {
            headers: { "x-business-id": businessId },
          }),
        ),
      );
      if (activeBusiness.current !== businessId) return;
      const succeeded = results.filter(
        (result) => result.status === "fulfilled",
      ).length;
      const failures = results.filter(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected",
      );
      if (succeeded)
        toast.success(
          `Updated ${succeeded} team member${succeeded === 1 ? "" : "s"}`,
        );
      if (failures.length)
        toast.error(
          `${failures.length} could not be updated. ${failures[0].reason?.response?.data?.message || "Please retry."}`,
        );
      setSelected(
        new Set(ids.filter((_, index) => results[index].status === "rejected")),
      );
      setAssignLocation("");
      setConfirm(null);
      await refresh();
    } finally {
      if (activeBusiness.current === businessId) setBusy(false);
    }
  };
  const payText = (person: DirectoryEmployee) => {
    const pay = savedPay(person);
    return pay
      ? `${formatCurrency(pay.amount, selectedBusiness?.currencyCode)} / ${pay.unit}`
      : "Not set";
  };
  const statusBadge = (person: DirectoryEmployee) => (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${person.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : person.status === "ON_LEAVE" ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}
    >
      {label(person.status)}
    </span>
  );
  const actions = (person: DirectoryEmployee) => (
    <div className="relative text-left">
      <button
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-label={`Actions for ${person.firstName} ${person.lastName}`}
        aria-expanded={menuId === person.id}
        disabled={busy}
        onClick={() => setMenuId(menuId === person.id ? null : person.id)}
      >
        <MoreHorizontal size={18} />
      </button>
      {menuId === person.id && (
        <>
          <button
            className="fixed inset-0 z-20 cursor-default"
            aria-label="Close person actions"
            onClick={() => setMenuId(null)}
          />
          <div className="absolute right-0 top-full z-30 mt-1 w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
            {profileTabs.map((tab) => (
              <button
                key={tab}
                className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() => openProfile(person, tab)}
              >
                {tab === "News feed"
                  ? "Message"
                  : tab === "Personal"
                    ? "View profile"
                    : tab}
              </button>
            ))}
            {canManage(person) && (
              <button
                className="block w-full rounded border-t border-slate-100 px-3 py-2 text-left text-sm text-purple-700 hover:bg-purple-50 dark:border-slate-700 dark:text-purple-300 dark:hover:bg-slate-800"
                onClick={() => {
                  setMenuId(null);
                  setConfirm({
                    ids: [person.id],
                    status: person.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                  });
                }}
              >
                {person.status === "ACTIVE"
                  ? "Archive team member"
                  : "Reactivate team member"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );

  if (businessLoading)
    return (
      <div className="p-8 text-slate-500" role="status">
        Loading your business…
      </div>
    );
  if (!businessId)
    return (
      <div className="m-6 rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
        <Users className="mx-auto mb-3 text-purple-500" size={32} />
        <h1 className="text-xl font-semibold">Choose a business</h1>
        <p className="mt-2 text-sm text-slate-500">
          Select a business to manage its team.
        </p>
      </div>
    );
  return (
    <div className="min-h-full bg-slate-50 p-4 text-slate-800 dark:bg-slate-950 dark:text-slate-100 md:p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">People</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage your team at {selectedBusiness?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className={buttonClass}
            onClick={exportPeople}
            disabled={loading || !filtered.length}
          >
            <Download size={16} />
            Export
          </button>
          {canAdd && (
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
              onClick={() => setAddOpen(true)}
            >
              <Plus size={17} />
              Add people
            </button>
          )}
        </div>
      </header>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            title: "Total team",
            count: employees.length,
            filter: "ALL",
            icon: Users,
          },
          {
            title: "Active",
            count: employees.filter((person) => person.status === "ACTIVE")
              .length,
            filter: "ACTIVE",
            icon: UserCheck,
          },
          {
            title: "Onboarding",
            count: employees.filter((person) => person.type === "ONBOARDING")
              .length,
            filter: "ONBOARDING",
            icon: ClipboardList,
          },
          {
            title: "Archived",
            count: employees.filter((person) =>
              ["INACTIVE", "TERMINATED", "ARCHIVED"].includes(person.status),
            ).length,
            filter: "ARCHIVED",
            icon: UserMinus,
          },
        ].map((stat) => (
          <button
            key={stat.title}
            onClick={() => setStatus(stat.filter)}
            aria-pressed={status === stat.filter}
            className={`flex items-center gap-3 rounded-xl border bg-white p-4 text-left dark:bg-slate-900 ${status === stat.filter ? "border-purple-400 ring-1 ring-purple-100 dark:ring-purple-900" : "border-slate-200 dark:border-slate-800"}`}
          >
            <stat.icon size={20} className="text-purple-500" />
            <div>
              <div className="text-2xl font-semibold">
                {loading ? "—" : stat.count}
              </div>
              <div className="text-xs text-slate-500">{stat.title}</div>
            </div>
          </button>
        ))}
      </div>
      <nav aria-label="People activities" className="mb-5 flex flex-wrap gap-2">
        {[
          ["Availability", "/dashboard/people/availability"],
          ["Qualifications", "/dashboard/people/certifications"],
          ["Employment forms", "/dashboard/people/employment-forms"],
          ["Departments", "/dashboard/people/departments"],
        ].map(([name, path]) => (
          <button
            key={path}
            className={buttonClass}
            onClick={() => router.push(path)}
          >
            {name}
          </button>
        ))}
      </nav>
      <section
        className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
        aria-label="Team directory"
      >
        <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="relative min-w-[220px] flex-1">
            <Search
              size={17}
              className="absolute left-3 top-2.5 text-slate-400"
            />
            <input
              aria-label="Search team"
              placeholder="Search name, email, phone or location"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={`${inputClass} w-full pl-9`}
            />
          </div>
          <select
            aria-label="Status filter"
            className={inputClass}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {["ALL", "ACTIVE", "ONBOARDING", "ON_LEAVE", "ARCHIVED"].map(
              (value) => (
                <option key={value} value={value}>
                  {value === "ALL" ? "All statuses" : label(value)}
                </option>
              ),
            )}
          </select>
          <select
            aria-label="Role filter"
            className={inputClass}
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            <option value="ALL">All roles</option>
            {roles.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select
            aria-label="Location filter"
            className={inputClass}
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          >
            <option value="ALL">All locations</option>
            {locations.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Department filter"
            className={inputClass}
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
          >
            <option value="ALL">All departments</option>
            {departments.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Sort team"
            className={inputClass}
            value={sort}
            onChange={(event) => {
              setSort(event.target.value);
              setPage(1);
            }}
          >
            <option value="name">Last name A–Z</option>
            <option value="firstName">First name A–Z</option>
            <option value="status">Status</option>
          </select>
          <button
            className={buttonClass}
            onClick={refresh}
            disabled={loading}
            aria-label="Refresh team"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            className={buttonClass}
            onClick={() => setView("list")}
            aria-label="List view"
            aria-pressed={view === "list"}
          >
            <List size={17} />
          </button>
          <button
            className={buttonClass}
            onClick={() => setView("grid")}
            aria-label="Grid view"
            aria-pressed={view === "grid"}
          >
            <LayoutGrid size={17} />
          </button>
        </div>
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-purple-100 bg-purple-50 px-4 py-3 dark:border-purple-900 dark:bg-purple-950/30">
            <span className="mr-2 text-sm font-medium">
              {selected.size} selected
            </span>
            <button className={buttonClass} onClick={exportPeople}>
              Export selected
            </button>
            <button
              className={buttonClass}
              disabled={
                busy || selectedPeople.some((person) => !canManage(person))
              }
              onClick={() =>
                setConfirm({ ids: Array.from(selected), status: "INACTIVE" })
              }
            >
              Archive
            </button>
            <button
              className={buttonClass}
              disabled={
                busy || selectedPeople.some((person) => !canManage(person))
              }
              onClick={() =>
                setConfirm({ ids: Array.from(selected), status: "ACTIVE" })
              }
            >
              Reactivate
            </button>
            <select
              className={inputClass}
              aria-label="Assign selected people to location"
              value={assignLocation}
              onChange={(event) => setAssignLocation(event.target.value)}
            >
              <option value="">Set default location…</option>
              {locations.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
            <button
              className={buttonClass}
              disabled={
                busy ||
                !assignLocation ||
                selectedPeople.some((person) => !canManage(person))
              }
              onClick={() =>
                updatePeople(Array.from(selected), {
                  defaultLocationId: assignLocation,
                })
              }
            >
              {busy ? "Updating…" : "Apply location"}
            </button>
            <button
              className="ml-auto p-2"
              aria-label="Clear selection"
              disabled={busy}
              onClick={() => setSelected(new Set())}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {error ? (
          <div className="p-10 text-center" role="alert">
            <AlertCircle className="mx-auto mb-3 text-red-500" />
            <p>{error}</p>
            <button className={`${buttonClass} mt-4`} onClick={refresh}>
              Retry
            </button>
          </div>
        ) : loading ? (
          <div
            className="p-14 text-center text-sm text-slate-500"
            role="status"
          >
            Loading team members…
          </div>
        ) : !visible.length ? (
          <div className="p-14 text-center">
            <Users className="mx-auto mb-3 text-slate-400" size={32} />
            <h2 className="font-semibold">
              {employees.length
                ? "No matching team members"
                : "Build your team"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {employees.length
                ? "Adjust your search or filters to find a person."
                : "Add your first team member to get started."}
            </p>
            <button
              className={`${buttonClass} mt-4`}
              onClick={() => {
                setSearch("");
                setStatus("ALL");
                setRole("ALL");
                setLocation("ALL");
                setDepartment("ALL");
              }}
            >
              Clear filters
            </button>
          </div>
        ) : view === "list" ? (
          <div className="overflow-x-auto pb-52 -mb-52">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select current page"
                      checked={allVisibleSelected}
                      ref={(node) => {
                        if (node)
                          node.indeterminate =
                            !allVisibleSelected &&
                            visible.some((person) => selected.has(person.id));
                      }}
                      onChange={() =>
                        setSelected((previous) =>
                          toggleVisibleSelection(
                            previous,
                            visible.map((person) => person.id),
                          ),
                        )
                      }
                    />
                  </th>
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Access role</th>
                  <th className="px-3 py-3">Location / department</th>
                  <th className="px-3 py-3">Status</th>
                  {canAdd && <th className="px-3 py-3">Pay rate</th>}
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visible.map((person) => (
                  <tr
                    key={person.id}
                    className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${selected.has(person.id) ? "bg-purple-50/50 dark:bg-purple-950/20" : ""}`}
                  >
                    <td className="px-4 py-4">
                      <input
                        aria-label={`Select ${person.firstName} ${person.lastName}`}
                        type="checkbox"
                        checked={selected.has(person.id)}
                        disabled={busy}
                        onChange={() => toggle(person.id)}
                      />
                    </td>
                    <td className="px-3 py-4">
                      <button
                        className="flex items-center gap-3 text-left"
                        disabled={openingId === person.id}
                        onClick={() => openProfile(person)}
                      >
                        <Avatar employee={person} />
                        <span>
                          <span className="block font-semibold text-slate-900 hover:text-purple-700 dark:text-white">
                            {person.firstName} {person.lastName}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {openingId === person.id
                              ? "Opening profile…"
                              : person.email || "No email"}
                          </span>
                          {person.type === "ONBOARDING" && (
                            <span className="text-xs text-amber-600">
                              Onboarding
                            </span>
                          )}
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-4">{roleLabel(person)}</td>
                    <td className="px-3 py-4">
                      <div>
                        {person.defaultLocation?.name || "Location not set"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {person.department?.name || "No department"}
                      </div>
                    </td>
                    <td className="px-3 py-4">{statusBadge(person)}</td>
                    {canAdd && (
                      <td className="px-3 py-4 tabular-nums">
                        {payText(person)}
                      </td>
                    )}
                    <td className="px-4 py-4">{actions(person)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((person) => (
              <article
                key={person.id}
                className={`rounded-xl border p-4 ${selected.has(person.id) ? "border-purple-400" : "border-slate-200 dark:border-slate-700"}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <input
                    type="checkbox"
                    aria-label={`Select ${person.firstName} ${person.lastName}`}
                    checked={selected.has(person.id)}
                    disabled={busy}
                    onChange={() => toggle(person.id)}
                  />
                  {actions(person)}
                </div>
                <button
                  className="flex w-full items-center gap-3 text-left"
                  onClick={() => openProfile(person)}
                >
                  <Avatar employee={person} />
                  <span>
                    <span className="block font-semibold">
                      {person.firstName} {person.lastName}
                    </span>
                    <span className="text-xs text-slate-500">
                      {roleLabel(person)}
                    </span>
                  </span>
                </button>
                <p className="mt-3 truncate text-sm text-slate-500">
                  {person.email}
                </p>
                <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin size={13} />
                  {person.defaultLocation?.name || "Location not set"}
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  {statusBadge(person)}
                  {canAdd && <span className="text-xs">{payText(person)}</span>}
                </div>
              </article>
            ))}
          </div>
        )}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-slate-800">
          <span>
            {filtered.length
              ? `${(currentPage - 1) * size + 1}–${Math.min(currentPage * size, filtered.length)} of ${filtered.length} people`
              : "0 people"}
          </span>
          <div className="flex items-center gap-2">
            <button
              className={buttonClass}
              aria-label="Previous page"
              disabled={currentPage <= 1 || loading}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              Page {currentPage} of {pages}
            </span>
            <button
              className={buttonClass}
              aria-label="Next page"
              disabled={currentPage >= pages || loading}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      </section>
      {canAdd && (
        <AddTeamMemberModal
          isOpen={addOpen}
          onClose={() => setAddOpen(false)}
          onSuccess={refresh}
        />
      )}
      <EmployeeProfileModal
        isOpen={!!profile}
        onClose={() => {
          setProfile(null);
          profileVersion.current++;
        }}
        employee={profile}
        onUpdate={async () => {
          await refresh();
          if (profile) await openProfile(profile, profileTab);
        }}
        initialTab={profileTab}
        highlightQualificationId={
          searchParams.get("qualificationId") || undefined
        }
      />
      <ConfirmModal
        isOpen={!!confirm}
        onClose={() => {
          if (!busy) setConfirm(null);
        }}
        onConfirm={() => {
          if (confirm) updatePeople(confirm.ids, { status: confirm.status });
        }}
        isLoading={busy}
        title={
          confirm?.status === "INACTIVE"
            ? "Archive team members"
            : "Reactivate team members"
        }
        message={
          confirm?.status === "INACTIVE"
            ? `Archive ${confirm.ids.length} team member(s)? Their history stays available. Resolve upcoming shifts and open timesheets first.`
            : `Reactivate ${confirm?.ids.length || 0} team member(s)? They will become available for scheduling again.`
        }
        confirmText={confirm?.status === "INACTIVE" ? "Archive" : "Reactivate"}
      />
    </div>
  );
}
export default function PeoplePage() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="p-8 text-slate-500" role="status">
        Loading People…
      </div>
    );
  if (!user)
    return <div className="p-8 text-slate-500">Sign in to view your team.</div>;
  return (
    <Suspense
      fallback={<div className="p-8 text-slate-500">Loading People…</div>}
    >
      {String(user.role).toUpperCase() === "EMPLOYEE" ? (
        <EmployeeSelfProfilePage />
      ) : (
        <AdminPeoplePageContent />
      )}
    </Suspense>
  );
}
