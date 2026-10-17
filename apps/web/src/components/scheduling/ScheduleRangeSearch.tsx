"use client";
import React, { useEffect, useRef, useState } from "react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import api from "../../lib/api";
import ServiceDatePicker from "../invoices/ServiceDatePicker";
import { toast } from "sonner";

type Row = {
  id: string;
  officer: string;
  location: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  breakMinutes: number;
  hours: number;
  status: string;
};
export default function ScheduleRangeSearch({
  businessId,
  locations,
  onClose,
}: {
  businessId?: string;
  onClose?: () => void;
  locations: Array<{ id: string; name: string }>;
}) {
  const [start, setStart] = useState(() =>
    format(startOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd"),
  );
  const [end, setEnd] = useState(() =>
    format(endOfWeek(new Date(), { weekStartsOn: 0 }), "yyyy-MM-dd"),
  );
  const [locationId, setLocation] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState("");
  const [downloadLocations, setDownloadLocations] = useState(locations);
  useEffect(() => {
    let active = true;
    setDownloadLocations(locations);
    api
      .get("/locations", { params: { businessId } })
      .then((res) => {
        if (active) setDownloadLocations(res.data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [businessId, locations]);
  const revision = useRef(0);
  useEffect(() => {
    revision.current++;
    setRows(null);
    setBusy("");
  }, [start, end, locationId, businessId]);
  useEffect(() => {
    setLocation("");
  }, [businessId]);
  async function run(kind: "search" | "xlsx" | "pdf") {
    if (!start || !end || start > end) {
      toast.error("Choose a valid start and end date.");
      return;
    }
    if (kind !== "search" && !locationId) {
      toast.error("Select a location to download its schedule.");
      return;
    }
    const version = revision.current;
    setBusy(kind);
    try {
      const response = await api.get("/scheduling/range", {
        params: {
          start,
          end,
          locationId: locationId || undefined,
          businessId,
          format: kind === "search" ? undefined : kind,
        },
        responseType: kind === "search" ? "json" : "blob",
      });
      if (version !== revision.current) return;
      if (kind === "search") setRows(response.data);
      else {
        const url = URL.createObjectURL(response.data);
        const link = document.createElement("a");
        link.href = url;
        const name =
          locations
            .find((l) => l.id === locationId)
            ?.name.replace(/[^a-z0-9]+/gi, "-") || "location";
        link.download = `${name}-schedule-${start}-${end}.${kind}`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast.success("Schedule downloaded.");
      }
    } catch (error: any) {
      let message = error?.response?.data?.message;
      if (error?.response?.data instanceof Blob) {
        try {
          message = JSON.parse(await error.response.data.text()).message;
        } catch {}
      }
      toast.error(message || "Unable to load the schedule. Please try again.");
    } finally {
      if (version === revision.current) setBusy("");
    }
  }
  return (
    <section
      id="schedule-range-search"
      className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-900 dark:text-white">
          Date range search & downloads
        </h2>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close date range search and downloads"
            className="rounded border border-slate-300 px-3 py-1 text-sm font-medium hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-700"
          >
            Close
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Choose dates and a location (MM/DD/YYYY). Downloads fit up to 16 days
        per page in a calendar grid with officer colors, the business logo and
        address. Shifts are included by their start date.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          Start date
          <ServiceDatePicker
            label="Schedule search start date"
            value={start}
            onChange={setStart}
            className="mt-1 block w-44 rounded border p-2 dark:bg-slate-900"
          />
        </label>
        <label className="text-sm">
          End date
          <ServiceDatePicker
            label="Schedule search end date"
            value={end}
            min={start}
            onChange={setEnd}
            className="mt-1 block w-44 rounded border p-2 dark:bg-slate-900"
          />
        </label>
        <label className="text-sm">
          Location
          <select
            aria-label="Schedule download location"
            value={locationId}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1 block max-w-xs rounded border p-2 dark:bg-slate-900"
          >
            <option value="">All locations (search only)</option>
            {downloadLocations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={!!busy}
          onClick={() => run("search")}
          className="rounded bg-purple-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy === "search" ? "Searching…" : "Search"}
        </button>
        {(["xlsx", "pdf"] as const).map((kind) => (
          <button
            key={kind}
            disabled={!!busy || !locationId}
            onClick={() => run(kind)}
            className="rounded border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            {busy === kind
              ? "Preparing…"
              : kind === "xlsx"
                ? "Download Excel"
                : "Download PDF (landscape)"}
          </button>
        ))}
      </div>
      {rows !== null && (
        <div className="mt-5">
          <p role="status" className="mb-3 text-sm font-semibold">
            {rows.length} shifts ·{" "}
            {rows.reduce((n, r) => n + r.hours, 0).toFixed(2)} net hours
          </p>
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">
              No scheduled shifts match these dates and location.
            </p>
          ) : (
            <div className="max-h-96 overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900">
                  <tr>
                    {[
                      "Officer",
                      "Location",
                      "Start",
                      "Finish",
                      "Break (min)",
                      "Net hours",
                      "Status",
                    ].map((h) => (
                      <th key={h} className="p-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-slate-100 dark:border-slate-700"
                    >
                      <td className="p-3">{r.officer}</td>
                      <td className="p-3">{r.location}</td>
                      <td className="p-3 whitespace-nowrap">
                        {r.startDate} {r.startTime}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {r.endDate} {r.endTime}
                      </td>
                      <td className="p-3">{r.breakMinutes}</td>
                      <td className="p-3">{r.hours.toFixed(2)}</td>
                      <td className="p-3">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
