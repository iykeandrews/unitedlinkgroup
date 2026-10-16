"use client";
import { useEffect, useState } from "react";
import api from "../lib/api";
import { useBusiness } from "../context/business-context";
import { formatRecordTime } from "../lib/time/record-zone";
export default function AssignedClientPins() {
  const { selectedBusiness } = useBusiness();
  const [revision, setRevision] = useState(0);
  const [shifts, setShifts] = useState<any[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const r = await api.get("/scheduling/my-client-pins");
        if (active) {
          setShifts(r.data);
          setError("");
        }
      } catch {
        if (active) setShifts([]);
        if (active)
          setError(
            "Unable to load client PIN assignments. Refresh to try again.",
          );
      }
    };
    setShifts([]);
    load();
    const timer = setInterval(load, 30000);
    window.addEventListener("focus", load);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [selectedBusiness?.id, revision]);
  return (
    <section className="rounded-xl border border-indigo-200 bg-white p-5 dark:bg-slate-900">
      <div className="flex justify-between gap-3">
        <h2 className="text-lg font-semibold">Your assigned client-app PINs</h2>
        <button
          type="button"
          onClick={() => setRevision((v) => v + 1)}
          className="text-sm font-semibold text-indigo-600"
        >
          Refresh assignments
        </button>
      </div>
      <p className="mb-3 text-sm text-slate-500">
        Use these PINs in the client’s app. They are not needed to clock in or
        out here.
      </p>
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {shifts.map((s) => (
          <div
            key={s.id}
            className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800"
          >
            <strong>{s.location?.name}</strong>
            <p className="text-sm">
              {formatRecordTime(s.startTime, "MM/dd/yyyy h:mm a", s.timeZone)} –{" "}
              {formatRecordTime(s.endTime, "MM/dd/yyyy h:mm a", s.timeZone)}
            </p>
            {s.clientPinAssignment?.pin ? (
              <p className="mt-2 text-lg font-semibold">
                PIN: {s.clientPinAssignment.pin}{" "}
                <span className="text-xs font-normal">
                  {s.clientPinAssignment.classification}
                </span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-amber-700">
                {s.clientPinAssignment?.state === "NOT_REQUIRED"
                  ? "No client-app PIN is required for this location."
                  : s.clientPinAssignment?.state === "CATEGORY_REQUIRED"
                    ? "Ask your administrator to set your officer category."
                    : "No active matching PIN is configured. Contact your administrator."}
              </p>
            )}
          </div>
        ))}
      </div>
      {!shifts.length && !error && (
        <p className="text-sm text-slate-500">No upcoming assigned shifts.</p>
      )}
    </section>
  );
}
