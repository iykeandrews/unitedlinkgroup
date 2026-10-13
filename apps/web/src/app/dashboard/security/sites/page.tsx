"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  MapPin,
  Building,
  Navigation,
  MoreHorizontal,
  Download,
  Filter,
  X,
  Edit,
} from "lucide-react";
import { useBusiness } from "../../../../context/business-context";
import { downloadCsv } from "../../../../lib/time/records";
import { useAuth } from "../../../../context/auth-context";
import Link from "next/link";
import api from "../../../../lib/api";

interface Location {
  id: string;
  name: string;
  code: string;
  address: string;
  status: string;
  workOrder?: string;
  startDate?: string;
  endDate?: string;
  client?: {
    name: string;
  };
  servicePins?: any[];
}

export default function SitesPage() {
  const { selectedBusiness } = useBusiness();
  const requestVersion = useRef(0);
  const [error, setError] = useState("");
  const { user } = useAuth();
  const canCreate =
    user?.role === "BUSINESS_ADMIN" || user?.role === "SUPER_ADMIN";
  const router = useRouter();
  const [sites, setSites] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    fetchSites();
    return () => {
      requestVersion.current++;
    };
  }, [selectedBusiness?.id]);

  const fetchSites = async () => {
    const version = ++requestVersion.current;
    setSites([]);
    setError("");
    if (!selectedBusiness) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get("/locations", {
        headers: { "x-business-id": selectedBusiness.id },
      });
      if (version === requestVersion.current) setSites(res.data);
    } catch (error) {
      if (version === requestVersion.current)
        setError("Unable to load sites. Please retry.");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  };

  const filteredSites = sites.filter((site) => {
    const matchesSearch =
      site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.client?.name
        ?.toLowerCase()
        .includes(searchQuery.trim().toLowerCase()) ||
      site.address?.toLowerCase().includes(searchQuery.trim().toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" || site.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleExport = () => {
    const headers = [
      "Name",
      "Code",
      "Client",
      "Address",
      "Status",
      "Service Pins",
    ];
    downloadCsv(
      [
        headers,
        ...filteredSites.map((s) => [
          s.name,
          s.code,
          s.client?.name,
          s.address,
          s.status,
          s.servicePins?.length || 0,
        ]),
      ],
      "sites.csv",
    );
  };

  return (
    <div className="py-8">
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Security Sites
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage service locations and posts.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            disabled={loading || !filteredSites.length}
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
          >
            <Download size={20} />
            Export CSV
          </button>
          <button
            disabled={!canCreate || !selectedBusiness}
            onClick={() => router.push("/dashboard/security/sites/new")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus size={20} />
            Add Site
          </button>
        </div>
      </div>

      {!selectedBusiness && (
        <p className="p-4">Choose a business to view sites.</p>
      )}
      {error && (
        <p role="alert" className="p-4 text-red-600">
          {error}{" "}
          <button className="underline" onClick={fetchSites}>
            Retry
          </button>
        </p>
      )}
      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        <span>
          {sites.length} sites ·{" "}
          {sites.filter((s) => s.status === "ACTIVE").length} active ·{" "}
          {
            sites.filter(
              (s) => !s.servicePins?.some((p: any) => p.status === "ACTIVE"),
            ).length
          }{" "}
          without active pins
        </span>
        <button onClick={fetchSites} className="text-purple-600">
          Refresh
        </button>
        <Link href="/dashboard/scheduling" className="text-purple-600">
          Scheduling
        </Link>
        <Link href="/dashboard/time" className="text-purple-600">
          Timesheets
        </Link>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Search Bar & Filters */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search sites, codes, or clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                isFilterOpen
                  ? "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400"
                  : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              <Filter size={20} />
              Filters
            </button>
          </div>

          {/* Filter Panel */}
          {isFilterOpen && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-6">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 dark:border-slate-600 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-white dark:bg-slate-800"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                {/* Clear Filters */}
                {statusFilter !== "ALL" && (
                  <button
                    onClick={() => setStatusFilter("ALL")}
                    className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 mt-6"
                  >
                    <X size={16} />
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sites List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Site Name / Code
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Service Pins
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-slate-500"
                  >
                    Loading sites...
                  </td>
                </tr>
              ) : filteredSites.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-slate-500"
                  >
                    No sites found.
                  </td>
                </tr>
              ) : (
                filteredSites.map((site) => (
                  <tr
                    key={site.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        router.push(`/dashboard/security/sites/${site.id}`);
                    }}
                    onClick={() =>
                      router.push(`/dashboard/security/sites/${site.id}`)
                    }
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400">
                          <MapPin size={20} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {site.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {site.code || "No Code"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {site.client ? (
                        <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <Building size={14} className="text-slate-400" />
                          {site.client.name}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p
                        className="text-sm text-slate-600 dark:text-slate-300 line-clamp-1 max-w-xs"
                        title={site.address}
                      >
                        {site.address}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        <Navigation size={12} />
                        {site.servicePins?.length || 0} Pins
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          site.status === "ACTIVE"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {site.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/security/sites/${site.id}`);
                        }}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        aria-label={`Open ${site.name}`}
                        title="Open Site"
                      >
                        <Edit size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
