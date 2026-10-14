"use client";
import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Save,
  ShieldCheck,
  MapPin,
  Loader2,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import api from "../../lib/api";
import { useBusiness } from "../../context/business-context";

const STATES =
  "AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY".split(
    " ",
  );
const inputClass =
  "w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20";
const card =
  "rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 sm:p-6";
const emptyAddress = () => ({
  address: "",
  city: "",
  state: "",
  zip: "",
  jurisdictionIds: [],
  localJurisdictionsReviewed: false,
});
const statuses = [
  { value: "", label: "All filing statuses" },
  { value: "SINGLE", label: "Single" },
  { value: "MARRIED_JOINT", label: "Married, filing jointly" },
  { value: "MARRIED_SEPARATE", label: "Married, filing separately" },
  { value: "HEAD_OF_HOUSEHOLD", label: "Head of household" },
];
function Field({ label, children }: any) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
        {label}
      </span>
      {children}
    </label>
  );
}
const errorMessage = (e: any) => {
  const m = e.response?.data?.message;
  return Array.isArray(m) ? m.join(" ") : m || "Unable to save tax setup.";
};
function AddressFields({ value, onChange, title }: any) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
      <h4 className="font-semibold flex gap-2 items-center">
        <MapPin size={16} />
        {title}
      </h4>
      <div className="grid sm:grid-cols-2 gap-3">
        {["address", "city", "zip"].map((k) => (
          <Field
            key={k}
            label={
              k === "address"
                ? "Street address"
                : k === "zip"
                  ? "ZIP code"
                  : "City"
            }
          >
            <input
              className={inputClass}
              value={value[k] || ""}
              onChange={(e) => onChange({ ...value, [k]: e.target.value })}
            />
          </Field>
        ))}
        <Field label="State / DC">
          <select
            className={inputClass}
            value={value.state}
            onChange={(e) => onChange({ ...value, state: e.target.value })}
          >
            <option value="">Select state</option>
            {STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Local jurisdiction IDs (comma separated)">
          <input
            className={inputClass}
            value={
              value.jurisdictionIdsText ??
              (value.jurisdictionIds || []).join(", ")
            }
            onChange={(e) =>
              onChange({
                ...value,
                jurisdictionIdsText: e.target.value,
                jurisdictionIds: e.target.value
                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Match the IDs in your local tax rules"
          />
        </Field>
        {value.wagePercent !== undefined && (
          <Field label="Wages earned at this location (%)">
            <input
              className={inputClass}
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={value.wagePercent}
              onChange={(e) =>
                onChange({ ...value, wagePercent: Number(e.target.value) })
              }
            />
          </Field>
        )}
      </div>
      <label className="flex gap-2 text-sm items-start">
        <input
          type="checkbox"
          className="mt-1"
          checked={value.localJurisdictionsReviewed || false}
          onChange={(e) =>
            onChange({ ...value, localJurisdictionsReviewed: e.target.checked })
          }
        />
        I reviewed the local tax jurisdictions for this street address,
        including whether no local tax applies.
      </label>
    </div>
  );
}

export default function TaxSetup({
  employeeId,
  onSaved,
  selectedEmployee,
}: { employeeId?: string; onSaved?: () => void; selectedEmployee?: any } = {}) {
  const { selectedBusiness } = useBusiness();
  const businessId = selectedBusiness?.id;
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const [section, setSection] = useState<"rules" | "employees">(
    employeeId ? "employees" : "rules",
  );
  const [people, setPeople] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({
    rules: [],
    reviewedStates: [],
    workweekAnchor: "2026-01-04T00:00:00Z",
    payrollTimeZone: "UTC",
  });
  const [editing, setEditing] = useState<any>(null),
    [person, setPerson] = useState<any>(null),
    [profile, setProfile] = useState<any>(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setEditing(null);
    setPerson(null);
    setPeople([]);
    setConfig({
      rules: [],
      reviewedStates: [],
      workweekAnchor: "2026-01-04T00:00:00Z",
      payrollTimeZone: "UTC",
    });
    if (!businessId) {
      setLoading(false);
      return;
    }
    api
      .get(`/payroll/tax-setup/${businessId}`)
      .then((r) => {
        if (!cancelled) {
          setConfig(
            r.data.config || {
              rules: [],
              reviewedStates: [],
              workweekAnchor: "2026-01-04T00:00:00Z",
              payrollTimeZone: "UTC",
            },
          );
          setPeople(r.data.employees);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [businessId]);
  const saveRules = async () => {
    setSaving(true);
    try {
      const r = await api.patch(
        `/payroll/tax-setup/${businessId}/rules`,
        config,
      );
      setConfig(r.data);
      toast.success(
        "Tax rules saved. Recalculate existing drafts to apply them.",
      );
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  const newRule = () =>
    setEditing({
      id: crypto.randomUUID(),
      label: "",
      state: "",
      jurisdictionId: "",
      category: "STATE_INCOME",
      payer: "EMPLOYEE",
      basis: "WORK",
      method: "FLAT",
      ratePercent: 0,
      brackets: [{ threshold: 0, ratePercent: 0 }],
      annualDeduction: 0,
      allowanceValue: 0,
      annualCredit: 0,
      wageCap: null,
      filingStatus: "",
      reciprocityStates: [],
      creditForWorkStates: [],
      sourceUrl: "",
      effectiveFrom: `${new Date().getFullYear()}-01-01`,
      effectiveTo: `${new Date().getFullYear()}-12-31`,
    });
  const openPerson = (p: any) => {
    setPerson(p);
    const saved = p.payrollTaxProfile;
    setProfile(
      saved?.version
        ? saved
        : {
            version: 1,
            residence: {
              ...emptyAddress(),
              address: p.address || "",
              city: p.city || "",
              state: p.state || "",
              zip: p.zip || "",
            },
            workLocations: [{ ...emptyAddress(), wagePercent: 100 }],
            w4FormYear: 2026,
            federalExempt: false,
            nonresidentAlien: false,
            elections: [],
          },
    );
  };
  useEffect(() => {
    if (employeeId && !loading) {
      const selected =
        people.find((p) => p.id === employeeId) || selectedEmployee;
      if (selected?.id === employeeId) {
        try {
          openPerson({
            ...selected,
            payrollTaxProfile:
              typeof selected.payrollTaxProfile === "string"
                ? JSON.parse(selected.payrollTaxProfile)
                : selected.payrollTaxProfile,
          });
        } catch {
          setError(
            "The saved employee tax profile is invalid. Review it in Payroll before calculating deductions.",
          );
        }
      }
    }
  }, [employeeId, people, loading, selectedEmployee]);
  const saveProfile = async () => {
    setSaving(true);
    try {
      const r = await api.patch(
        `/payroll/tax-setup/${businessId}/employees/${person.id}`,
        profile,
      );
      setPeople((v) =>
        v.map((p) =>
          p.id === person.id ? { ...p, payrollTaxProfile: r.data } : p,
        ),
      );
      if (!employeeId) setPerson(null);
      onSaved?.();
      toast.success(
        "Employee tax profile saved. Recalculate their draft payroll.",
      );
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };
  if (loading)
    return (
      <div className="p-12 flex justify-center">
        <Loader2 className="animate-spin" aria-label="Loading tax setup" />
      </div>
    );
  if (error)
    return (
      <div role="alert" className={`${card} text-red-700`}>
        {error}
      </div>
    );
  const updateRule = (key: string, value: any) =>
    setEditing((r: any) => ({ ...r, [key]: value }));
  return (
    <div className="space-y-6">
      {!employeeId && (
        <>
          <div className="rounded-2xl bg-slate-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row gap-6 justify-between">
            <div>
              <p className="text-xs tracking-widest uppercase text-teal-300 font-semibold mb-2">
                UnitedLink payroll · US tax setup
              </p>
              <h2 className="text-2xl font-semibold">
                Your rules. A clear payroll breakdown.
              </h2>
              <p className="text-slate-300 text-sm mt-3 max-w-2xl">
                Federal withholding uses 2026 IRS tables. Enter state, local and
                employer rules from government guidance. Your team maintains
                these rates; changes apply when a draft is recalculated.
              </p>
            </div>
            <ShieldCheck className="text-teal-300 shrink-0" size={36} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium ${section === "rules" ? "bg-teal-700 text-white" : "bg-slate-100 dark:bg-slate-700"}`}
              onClick={() => {
                setSection("rules");
                setPerson(null);
              }}
            >
              Tax rules
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium ${section === "employees" ? "bg-teal-700 text-white" : "bg-slate-100 dark:bg-slate-700"}`}
              onClick={() => {
                setSection("employees");
                setEditing(null);
              }}
            >
              Employee tax profiles
            </button>
          </div>
        </>
      )}
      {section === "rules" && !editing && (
        <>
          <div
            className={`${card} flex flex-col sm:flex-row justify-between gap-4`}
          >
            <div>
              <h3 className="font-semibold">State & local deduction rules</h3>
              <p className="text-sm text-slate-500 mt-1">
                {config.rules.length} rules · {config.reviewedStates.length}{" "}
                states reviewed
              </p>
            </div>
            <button
              onClick={newRule}
              className="inline-flex justify-center items-center gap-2 rounded-lg bg-teal-700 text-white px-4 py-2"
            >
              <Plus size={17} />
              Add tax rule
            </button>
          </div>
          <div className={`${card} overflow-x-auto`}>
            <table className="w-full text-sm text-left">
              <thead className="text-slate-500">
                <tr>
                  {[
                    "Rule",
                    "Jurisdiction",
                    "Paid by",
                    "Calculation",
                    "Effective dates",
                    "",
                  ].map((t, i) => (
                    <th key={i} className="pb-4 px-2">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {config.rules.map((r: any) => (
                  <tr
                    key={r.id}
                    className="border-t border-slate-100 dark:border-slate-700"
                  >
                    <td className="py-4 px-2 font-medium">
                      {r.label}
                      <span className="block text-xs text-slate-500">
                        {r.category.replaceAll("_", " ").toLowerCase()}
                      </span>
                    </td>
                    <td className="px-2">
                      {r.state}
                      {r.jurisdictionId ? ` / ${r.jurisdictionId}` : ""}
                    </td>
                    <td className="px-2">
                      {r.payer === "EMPLOYEE" ? "Employee" : "Employer"}
                    </td>
                    <td className="px-2">
                      {r.method === "FLAT"
                        ? `${r.ratePercent}%`
                        : "Graduated brackets"}
                    </td>
                    <td className="px-2 whitespace-nowrap">
                      {r.effectiveFrom} → {r.effectiveTo}
                    </td>
                    <td className="px-2">
                      <div className="flex gap-3">
                        <button
                          onClick={() => setEditing(structuredClone(r))}
                          className="text-teal-700 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          aria-label={`Remove ${r.label}`}
                          onClick={() =>
                            setConfig({
                              ...config,
                              rules: config.rules.filter(
                                (x: any) => x.id !== r.id,
                              ),
                            })
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!config.rules.length && (
              <div className="py-10 text-center">
                <BookOpen className="mx-auto text-slate-400 mb-3" />
                <p className="font-medium">
                  Start with the states where your team lives and works
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  Add income withholding, unemployment and FUTA rules. Use
                  explicit 0% rules when a tax does not apply.
                </p>
              </div>
            )}
          </div>
          <div className={card}>
            <Field label="Payroll calendar time zone">
              <select
                className={inputClass}
                value={config.payrollTimeZone || "UTC"}
                onChange={(e) =>
                  setConfig({ ...config, payrollTimeZone: e.target.value })
                }
              >
                {[
                  "UTC",
                  "America/New_York",
                  "America/Chicago",
                  "America/Denver",
                  "America/Phoenix",
                  "America/Los_Angeles",
                  "America/Anchorage",
                  "Pacific/Honolulu",
                ].map((z) => (
                  <option key={z}>{z}</option>
                ))}
              </select>
            </Field>
            <div className="mt-4" />
            <Field label="Fixed 168-hour workweek start (timestamp with UTC offset)">
              <input
                className={inputClass}
                value={config.workweekAnchor}
                onChange={(e) =>
                  setConfig({ ...config, workweekAnchor: e.target.value })
                }
              />
            </Field>
            <p className="text-xs text-slate-500 mt-2">
              Use the employer’s established workweek start, for example
              2026-01-04T00:00:00-05:00. Payroll does not reset overtime at a
              pay-period boundary.
            </p>
            <h3 className="font-semibold mt-6 mb-3">
              States reviewed for this configuration
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Mark a state only after checking all applicable employee and
              employer taxes, local jurisdictions and current official rules.
              Required rules must cover each pay date.
            </p>
            <div className="grid grid-cols-6 sm:grid-cols-9 gap-3">
              {STATES.map((s) => (
                <label key={s} className="flex gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={config.reviewedStates.includes(s)}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        reviewedStates: e.target.checked
                          ? [...config.reviewedStates, s]
                          : config.reviewedStates.filter(
                              (x: string) => x !== s,
                            ),
                      })
                    }
                  />
                  {s}
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between gap-4 mt-6">
              <p className="text-xs text-slate-500">
                {config.reviewedAt
                  ? `Last saved ${new Date(config.reviewedAt).toLocaleDateString()}`
                  : "Changes are saved only when you select Save rules."}
              </p>
              <button
                disabled={saving}
                onClick={saveRules}
                className="flex items-center gap-2 rounded-lg bg-teal-700 text-white px-5 py-2.5 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={17} />
                ) : (
                  <Save size={17} />
                )}
                Save rules
              </button>
            </div>
          </div>
        </>
      )}
      {editing && section === "rules" && (
        <div className={`${card} space-y-5`}>
          <div className="flex justify-between">
            <h3 className="text-lg font-semibold">
              {config.rules.some((r: any) => r.id === editing.id)
                ? "Edit tax rule"
                : "New tax rule"}
            </h3>
            <button
              onClick={() => setEditing(null)}
              className="text-sm text-slate-500"
            >
              Cancel
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Field label="Rule name">
              <input
                className={inputClass}
                value={editing.label}
                onChange={(e) => updateRule("label", e.target.value)}
                placeholder="State income withholding"
              />
            </Field>
            <Field label="State / DC">
              <select
                className={inputClass}
                value={editing.state}
                onChange={(e) => updateRule("state", e.target.value)}
              >
                <option value="">Select state</option>
                {STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Tax category">
              <select
                className={inputClass}
                value={editing.category}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    category: e.target.value,
                    ...(["FUTA", "UNEMPLOYMENT"].includes(e.target.value)
                      ? { payer: "EMPLOYER", basis: "WORK" }
                      : e.target.value === "STATE_INCOME"
                        ? { payer: "EMPLOYEE" }
                        : {}),
                    ...(e.target.value === "FUTA"
                      ? { method: "FLAT", wageCap: 7000 }
                      : {}),
                  })
                }
              >
                {[
                  ["STATE_INCOME", "State income"],
                  ["LOCAL", "Local tax"],
                  ["STATE_PAYROLL", "State payroll / leave / disability"],
                  ["UNEMPLOYMENT", "Employer unemployment"],
                  ["FUTA", "Federal unemployment (FUTA)"],
                ].map(([v, t]) => (
                  <option value={v} key={v}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Paid by">
              <select
                className={inputClass}
                value={editing.payer}
                onChange={(e) => updateRule("payer", e.target.value)}
              >
                <option value="EMPLOYEE">Employee deduction</option>
                <option value="EMPLOYER">Employer contribution</option>
              </select>
            </Field>
            <Field label="Applies to">
              <select
                className={inputClass}
                value={editing.basis}
                onChange={(e) => updateRule("basis", e.target.value)}
              >
                <option value="WORK">Work location wages</option>
                <option value="RESIDENCE">Residence</option>
              </select>
            </Field>
            <Field label="Calculation method">
              <select
                className={inputClass}
                value={editing.method}
                onChange={(e) => updateRule("method", e.target.value)}
              >
                <option value="FLAT">Flat percentage</option>
                <option value="ANNUAL_BRACKETS">
                  Annual graduated brackets
                </option>
              </select>
            </Field>
            <Field label="Filing status">
              <select
                className={inputClass}
                value={editing.filingStatus || ""}
                onChange={(e) => updateRule("filingStatus", e.target.value)}
              >
                {statuses.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Effective from">
              <input
                type="date"
                className={inputClass}
                value={editing.effectiveFrom}
                onChange={(e) => updateRule("effectiveFrom", e.target.value)}
              />
            </Field>
            <Field label="Effective through">
              <input
                type="date"
                className={inputClass}
                value={editing.effectiveTo}
                onChange={(e) => updateRule("effectiveTo", e.target.value)}
              />
            </Field>
            {editing.method === "FLAT" && (
              <Field label="Rate (%)">
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  max="100"
                  step="0.0001"
                  value={editing.ratePercent}
                  onChange={(e) =>
                    updateRule("ratePercent", Number(e.target.value))
                  }
                />
              </Field>
            )}
            <Field label="Annual taxable wage cap ($, blank = unlimited)">
              <input
                className={inputClass}
                type="number"
                min="0"
                step="0.01"
                value={editing.wageCap ?? ""}
                onChange={(e) =>
                  updateRule(
                    "wageCap",
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
              />
            </Field>
            {editing.method === "ANNUAL_BRACKETS" &&
              [
                ["annualDeduction", "Annual standard deduction ($)"],
                ["allowanceValue", "Annual amount per allowance ($)"],
                ["annualCredit", "Annual tax credit ($)"],
              ].map(([k, t]) => (
                <Field key={k} label={t}>
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    step="0.01"
                    value={editing[k]}
                    onChange={(e) => updateRule(k, Number(e.target.value))}
                  />
                </Field>
              ))}
            {editing.method === "ANNUAL_BRACKETS" && (
              <Field label="Allowances reduce">
                <select
                  className={inputClass}
                  value={editing.allowanceMethod || "DEDUCTION"}
                  onChange={(e) =>
                    updateRule("allowanceMethod", e.target.value)
                  }
                >
                  <option value="DEDUCTION">Annual taxable wages</option>
                  <option value="CREDIT">Annual tax (allowance credit)</option>
                </select>
              </Field>
            )}
            {editing.method === "ANNUAL_BRACKETS" &&
              editing.basis === "WORK" && (
                <label className="flex gap-2 text-sm items-center">
                  <input
                    type="checkbox"
                    checked={editing.annualizeTotalWages || false}
                    onChange={(e) =>
                      updateRule("annualizeTotalWages", e.target.checked)
                    }
                  />
                  Use total wages for brackets, then allocate tax to the work
                  location.
                </label>
              )}
            {["LOCAL", "STATE_PAYROLL"].includes(editing.category) && (
              <Field label="Jurisdiction / levy ID">
                <input
                  className={inputClass}
                  value={editing.jurisdictionId || ""}
                  onChange={(e) => updateRule("jurisdictionId", e.target.value)}
                  placeholder="Use the same ID in employee address profiles"
                />
              </Field>
            )}
            {editing.category === "STATE_INCOME" && (
              <Field label="Reciprocal residence states (comma separated)">
                <input
                  className={inputClass}
                  value={
                    editing.reciprocityStatesText ??
                    editing.reciprocityStates.join(", ")
                  }
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      reciprocityStatesText: e.target.value,
                      reciprocityStates: e.target.value
                        .toUpperCase()
                        .split(",")
                        .map((v) => v.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </Field>
            )}
            {editing.category === "STATE_INCOME" &&
              editing.basis === "RESIDENCE" && (
                <Field label="Credit for withholding in work states (comma separated)">
                  <input
                    className={inputClass}
                    value={
                      editing.creditForWorkStatesText ??
                      (editing.creditForWorkStates || []).join(", ")
                    }
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        creditForWorkStatesText: e.target.value,
                        creditForWorkStates: e.target.value
                          .toUpperCase()
                          .split(",")
                          .map((v) => v.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </Field>
              )}
            <Field label="Official guidance link">
              <input
                className={inputClass}
                type="url"
                value={editing.sourceUrl || ""}
                onChange={(e) => updateRule("sourceUrl", e.target.value)}
                placeholder="https://..."
              />
            </Field>
          </div>
          {editing.method === "ANNUAL_BRACKETS" && (
            <div className="space-y-3">
              <h4 className="font-semibold">Annual withholding brackets</h4>
              <p className="text-sm text-slate-500">
                Enter each bracket’s lower threshold and marginal percentage.
                Start at $0. Payroll annualizes wages, subtracts deductions and
                allowances, applies the brackets and credit, then divides by pay
                periods.
              </p>
              {editing.brackets.map((b: any, i: number) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end"
                >
                  <Field label={`Bracket ${i + 1}: starts at ($)`}>
                    <input
                      type="number"
                      min="0"
                      className={inputClass}
                      value={b.threshold}
                      onChange={(e) =>
                        updateRule(
                          "brackets",
                          editing.brackets.map((x: any, j: number) =>
                            j === i
                              ? { ...x, threshold: Number(e.target.value) }
                              : x,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Marginal rate (%)">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.0001"
                      className={inputClass}
                      value={b.ratePercent}
                      onChange={(e) =>
                        updateRule(
                          "brackets",
                          editing.brackets.map((x: any, j: number) =>
                            j === i
                              ? { ...x, ratePercent: Number(e.target.value) }
                              : x,
                          ),
                        )
                      }
                    />
                  </Field>
                  <button
                    aria-label={`Remove bracket ${i + 1}`}
                    className="p-2.5"
                    onClick={() =>
                      updateRule(
                        "brackets",
                        editing.brackets.filter((_: any, j: number) => j !== i),
                      )
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
              <button
                className="text-teal-700 text-sm font-medium"
                onClick={() =>
                  updateRule("brackets", [
                    ...editing.brackets,
                    { threshold: 0, ratePercent: 0 },
                  ])
                }
              >
                + Add bracket
              </button>
            </div>
          )}
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-900 dark:text-amber-200">
            Reciprocity requires a signed employee election. Resident credit
            uses the configured work-state income withholding, capped at the
            resident tax; only enable it where this method is permitted. Use
            employer-specific unemployment rates and any applicable FUTA credit
            reductions.
          </div>
          <button
            onClick={() => {
              if (!editing.label.trim() || !editing.state) {
                toast.error("Enter a rule name and state.");
                return;
              }
              setConfig({
                ...config,
                rules: [
                  ...config.rules.filter((r: any) => r.id !== editing.id),
                  editing,
                ],
              });
              setEditing(null);
              toast.info(
                "Rule added to your changes. Select Save rules to apply.",
              );
            }}
            className="rounded-lg bg-teal-700 px-5 py-2.5 text-white"
          >
            Add to configuration
          </button>
        </div>
      )}
      {section === "employees" && !person && !employeeId && (
        <div className={`${card} space-y-2`}>
          <h3 className="font-semibold mb-4">
            Residence, work locations & tax elections
          </h3>
          <p className="text-sm text-slate-500 mb-5">
            Copy elections from signed withholding forms. Federal filing status
            and W-4 amounts remain in People → payroll settings.
          </p>
          {people
            .filter((p) => p.workerType !== "CONTRACTOR_1099")
            .map((p) => (
              <button
                key={p.id}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-700"
                onClick={() => openPerson(p)}
              >
                <div>
                  <p className="font-medium">
                    {p.firstName} {p.lastName}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {p.payrollTaxProfile?.version
                      ? `${p.payrollTaxProfile.residence.state} residence · ${p.payrollTaxProfile.workLocations.length} work locations`
                      : "Tax profile needed"}
                  </p>
                </div>
                <ChevronRight size={18} />
              </button>
            ))}
          {!people.some((p) => p.workerType !== "CONTRACTOR_1099") && (
            <p className="text-sm text-slate-500">No active W-2 employees.</p>
          )}
        </div>
      )}
      {employeeId && !person && (
        <p role="alert" className="text-sm text-amber-700">
          The employee tax profile could not be loaded. Close and reopen the
          employee profile to retry.
        </p>
      )}
      {section === "employees" && person && (
        <div className={`${card} space-y-5`}>
          <div className="flex justify-between">
            <h3 className="text-lg font-semibold">
              {person.firstName} {person.lastName}
            </h3>
            {!employeeId && (
              <button
                onClick={() => setPerson(null)}
                className="text-sm text-slate-500"
              >
                Back to employees
              </button>
            )}
          </div>
          <AddressFields
            value={profile.residence}
            title="Residence"
            onChange={(v: any) => setProfile({ ...profile, residence: v })}
          />
          {profile.workLocations.map((w: any, i: number) => (
            <div key={i} className="space-y-2">
              <AddressFields
                title={`Work location ${i + 1}`}
                value={w}
                onChange={(v: any) =>
                  setProfile({
                    ...profile,
                    workLocations: profile.workLocations.map(
                      (x: any, j: number) => (j === i ? v : x),
                    ),
                  })
                }
              />
              {profile.workLocations.length > 1 && (
                <button
                  className="text-sm text-red-700"
                  onClick={() =>
                    setProfile({
                      ...profile,
                      workLocations: profile.workLocations.filter(
                        (_: any, j: number) => j !== i,
                      ),
                    })
                  }
                >
                  Remove work location {i + 1}
                </button>
              )}
            </div>
          ))}
          <button
            className="text-sm text-teal-700 font-medium"
            onClick={() =>
              setProfile({
                ...profile,
                workLocations: [
                  ...profile.workLocations,
                  { ...emptyAddress(), wagePercent: 0 },
                ],
              })
            }
          >
            + Add work location
          </button>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Signed W-4 form year">
              <select
                className={inputClass}
                value={profile.w4FormYear}
                onChange={(e) =>
                  setProfile({ ...profile, w4FormYear: Number(e.target.value) })
                }
              >
                {[2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>
                    {y === 2019 ? "2019 or earlier (legacy)" : y}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={profile.nonresidentAlien}
                onChange={(e) =>
                  setProfile({ ...profile, nonresidentAlien: e.target.checked })
                }
              />
              Nonresident alien for federal tax purposes
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={profile.federalExempt}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    federalExempt: e.target.checked,
                    federalExemptYear: new Date().getFullYear(),
                  })
                }
              />
              Federal income withholding exempt (signed W-4)
            </label>
            {profile.federalExempt && (
              <Field label="Exemption tax year">
                <input
                  className={inputClass}
                  type="number"
                  value={profile.federalExemptYear || 2026}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      federalExemptYear: Number(e.target.value),
                    })
                  }
                />
              </Field>
            )}
          </div>
          <div className="space-y-4">
            <h4 className="font-semibold">
              State & local withholding elections
            </h4>
            {profile.elections.map((e: any, i: number) => {
              const change = (k: string, v: any) =>
                setProfile({
                  ...profile,
                  elections: profile.elections.map((x: any, j: number) =>
                    j === i ? { ...x, [k]: v } : x,
                  ),
                });
              return (
                <div
                  key={i}
                  className="border rounded-xl border-slate-200 dark:border-slate-700 p-4 space-y-3"
                >
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Field label="State code or local jurisdiction ID">
                      <input
                        className={inputClass}
                        value={e.jurisdiction}
                        onChange={(v) => change("jurisdiction", v.target.value)}
                      />
                    </Field>
                    <Field label="Signed form / certificate reference">
                      <input
                        className={inputClass}
                        value={e.form}
                        onChange={(v) => change("form", v.target.value)}
                      />
                    </Field>
                    <Field label="Effective date">
                      <input
                        type="date"
                        className={inputClass}
                        value={e.effectiveDate}
                        onChange={(v) =>
                          change("effectiveDate", v.target.value)
                        }
                      />
                    </Field>
                    <Field label="Expires on (optional)">
                      <input
                        type="date"
                        className={inputClass}
                        value={e.expiresOn || ""}
                        onChange={(v) => change("expiresOn", v.target.value)}
                      />
                    </Field>
                    <Field label="State filing status">
                      <select
                        className={inputClass}
                        value={e.parameters.filingStatus || ""}
                        onChange={(v) =>
                          change("parameters", {
                            ...e.parameters,
                            filingStatus: v.target.value,
                          })
                        }
                      >
                        {statuses.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.value ? s.label : "Use employee filing status"}
                          </option>
                        ))}
                      </select>
                    </Field>
                    {[
                      ["allowances", "Allowances"],
                      [
                        "additionalWithholding",
                        "Extra withholding per paycheck ($)",
                      ],
                    ].map(([k, t]) => (
                      <Field key={k} label={t}>
                        <input
                          type="number"
                          min="0"
                          step={k === "allowances" ? "1" : "0.01"}
                          className={inputClass}
                          value={e.parameters[k] ?? ""}
                          onChange={(v) =>
                            change("parameters", {
                              ...e.parameters,
                              [k]:
                                v.target.value === ""
                                  ? undefined
                                  : Number(v.target.value),
                            })
                          }
                        />
                      </Field>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <label className="flex gap-2">
                      <input
                        type="checkbox"
                        checked={e.exemption}
                        onChange={(v) => change("exemption", v.target.checked)}
                      />
                      Withholding exempt
                    </label>
                    <label className="flex gap-2">
                      <input
                        type="checkbox"
                        checked={e.reciprocity}
                        onChange={(v) =>
                          change("reciprocity", v.target.checked)
                        }
                      />
                      Reciprocity certificate on file
                    </label>
                    <button
                      className="text-red-700"
                      onClick={() =>
                        setProfile({
                          ...profile,
                          elections: profile.elections.filter(
                            (_: any, j: number) => j !== i,
                          ),
                        })
                      }
                    >
                      Remove election
                    </button>
                  </div>
                </div>
              );
            })}
            <button
              className="text-sm font-medium text-teal-700"
              onClick={() =>
                setProfile({
                  ...profile,
                  elections: [
                    ...profile.elections,
                    {
                      jurisdiction: "",
                      form: "",
                      effectiveDate: new Date().toISOString().slice(0, 10),
                      exemption: false,
                      reciprocity: false,
                      parameters: {},
                    },
                  ],
                })
              }
            >
              + Add withholding election
            </button>
          </div>
          <p className="text-xs text-slate-500">
            This records payroll settings from signed forms; it does not replace
            a signed W-4 or state withholding certificate. Wage allocations must
            total 100%. Update allocations when work locations change.
          </p>
          <button
            disabled={saving}
            onClick={saveProfile}
            className="rounded-lg bg-teal-700 text-white px-5 py-2.5 inline-flex gap-2 items-center disabled:opacity-50"
          >
            {saving && <Loader2 className="animate-spin" size={16} />}Save
            employee tax profile
          </button>
        </div>
      )}
    </div>
  );
}
