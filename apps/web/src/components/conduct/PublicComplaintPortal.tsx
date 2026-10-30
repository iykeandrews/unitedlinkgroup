"use client";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";

const field =
  "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
async function request(path: string, body?: any) {
  const response = await fetch(`/api/public/complaints/${path}`, {
    method: body ? "POST" : "GET",
    credentials: "omit",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json();
  if (!response.ok)
    throw Error(
      Array.isArray(data.message)
        ? data.message.join(", ")
        : data.message || "Unable to complete your request.",
    );
  return data;
}
const stamp = (value: string) =>
  new Date(value).toLocaleString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
export default function PublicComplaintPortal({
  portalKey,
  trackingToken,
}: {
  portalKey?: string;
  trackingToken?: string;
}) {
  const [info, setInfo] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<any>(null),
    [token, setToken] = useState(""),
    [scriptReady, setScriptReady] = useState(false);
  const [form, setForm] = useState<any>({ subject: "EMPLOYEE", website: "" });
  const challenge = useRef<HTMLDivElement>(null),
    widget = useRef<string>(),
    submissionId = useRef(""),
    lock = useRef(false);
  useEffect(() => {
    let active = true;
    setInfo(null);
    setError("");
    submissionId.current = crypto.randomUUID();
    request(
      trackingToken
        ? `track/${encodeURIComponent(trackingToken)}`
        : encodeURIComponent(portalKey || ""),
    )
      .then((data) => {
        if (active) setInfo(data);
      })
      .catch((error) => {
        if (active) setError(error.message);
      });
    return () => {
      active = false;
    };
  }, [portalKey, trackingToken]);
  useEffect(() => {
    if (!scriptReady || !info?.siteKey || !challenge.current || trackingToken)
      return;
    const turnstile = (window as any).turnstile;
    if (!turnstile) return;
    widget.current = turnstile.render(challenge.current, {
      sitekey: info.siteKey,
      action: "complaint",
      callback: (value: string) => {
        setToken(value);
        setError("");
      },
      "expired-callback": () => setToken(""),
      "error-callback": () => {
        setToken("");
        setError(
          "Human verification could not load. Refresh the page or try again.",
        );
      },
    });
    return () => {
      if (widget.current) turnstile.remove(widget.current);
    };
  }, [scriptReady, info?.siteKey, trackingToken]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (lock.current || !token) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const data = await request(encodeURIComponent(portalKey || ""), {
        ...form,
        submissionId: submissionId.current,
        verificationToken: token,
      });
      setResult(data);
    } catch (error: any) {
      setError(error.message);
      setToken("");
      if (widget.current) (window as any).turnstile?.reset(widget.current);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const input = (
    key: string,
    label: string,
    required = false,
    type = "text",
  ) => (
    <label className="block text-sm font-semibold" key={key}>
      {label}
      <input
        type={type}
        required={required}
        maxLength={key === "email" ? 254 : 200}
        autoComplete={
          key === "email" ? "email" : key === "name" ? "name" : "off"
        }
        className={field}
        value={form[key] || ""}
        onChange={(e) =>
          setForm((prev: any) => ({ ...prev, [key]: e.target.value }))
        }
      />
    </label>
  );
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 font-sans text-slate-900">
      <div className="mx-auto max-w-2xl">
        <header className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-indigo-600">
            Customer care · Confidential reporting
          </p>
          <h1 className="mt-3 text-3xl font-bold">
            {trackingToken ? "Track your complaint" : "Tell us what happened"}
          </h1>
          <p className="mt-2 text-slate-500">
            {info?.businessName || info?.name || "Customer Complaint Centre"}
          </p>
        </header>
        {error && (
          <p
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        {!info && !error ? (
          <p>Loading secure complaint centre…</p>
        ) : trackingToken && info ? (
          <section className="space-y-6 rounded-2xl border bg-white p-7 shadow-sm">
            <div>
              <p className="font-mono text-indigo-600">{info.ticketNumber}</p>
              <h2 className="mt-2 text-xl font-bold">{info.title}</h2>
              <span className="mt-3 inline-block rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
                {info.status.replaceAll("_", " ")}
              </span>
              <p className="mt-3 text-xs text-slate-500">
                Received {stamp(info.createdAt)}
              </p>
            </div>
            {info.resolution && (
              <div className="rounded-xl bg-emerald-50 p-5">
                <h3 className="font-bold">Company resolution</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                  {info.resolution}
                </p>
              </div>
            )}
            <h3 className="font-semibold">Your case updates</h3>
            <ol className="space-y-5 border-l-2 border-indigo-100 pl-5">
              {info.events.map((event: any) => (
                <li key={event.id}>
                  <p className="text-xs text-slate-500">
                    {stamp(event.createdAt)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                    {event.message}
                  </p>
                </li>
              ))}
            </ol>
            <p className="border-t pt-4 text-xs leading-5 text-slate-500">
              Quote {info.ticketNumber} when contacting the company. Keep this
              tracking link private. Internal investigations and personnel
              records are not displayed here.
            </p>
          </section>
        ) : result ? (
          <section className="space-y-5 rounded-2xl border bg-white p-7 shadow-sm">
            <div className="text-emerald-700 text-3xl">✓</div>
            <h2 className="text-2xl font-bold">
              Your complaint has been received
            </h2>
            <p className="text-sm text-slate-500">Your ticket number</p>
            <p className="rounded-xl bg-indigo-50 p-4 font-mono text-xl font-bold text-indigo-800">
              {result.ticketNumber}
            </p>
            <p className="text-sm leading-6">
              {result.receipt === "SENT"
                ? "A confirmation email with your ticket number and private tracking link has been sent. Please check your inbox and spam folder."
                : result.receipt === "FAILED"
                  ? "Your complaint is saved, but the confirmation email could not be delivered. Save the ticket number and tracking link below."
                  : "Your complaint is saved. Email confirmation is being processed. Save your ticket number and tracking link."}
            </p>
            <a
              className="block rounded-xl bg-indigo-600 px-5 py-3 text-center font-semibold text-white"
              href={result.trackingUrl}
            >
              Follow my case
            </a>
            <p className="text-xs text-slate-500">
              Keep your tracking link private. Thank you for giving us an
              opportunity to address your concern.
            </p>
          </section>
        ) : info && !trackingToken ? (
          <section className="rounded-2xl border bg-white p-7 shadow-sm">
            {!info.available ? (
              <div className="space-y-3">
                <h2 className="font-bold text-xl">
                  Online submissions are not yet available
                </h2>
                <p className="text-sm leading-6 text-slate-600">
                  The company is completing its secure human-verification setup.
                  Please contact the company directly to report your concern.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <p className="text-sm leading-6 text-slate-600">
                  Please provide accurate details so we can review your concern
                  fairly. A ticket number and private tracking link will be
                  emailed to you.
                </p>
                {input("name", "Your name", true)}
                {input(
                  "email",
                  "Email for your ticket and follow-up",
                  true,
                  "email",
                )}
                <label className="block text-sm font-semibold">
                  Your concern relates to
                  <select
                    className={field}
                    value={form.subject}
                    onChange={(e) =>
                      setForm((prev: any) => ({
                        ...prev,
                        subject: e.target.value,
                      }))
                    }
                  >
                    <option value="EMPLOYEE">An employee</option>
                    <option value="OPERATIONS">Operations / service</option>
                    <option value="ACTIVITIES">Company activities</option>
                  </select>
                </label>
                {form.subject === "EMPLOYEE" &&
                  input(
                    "employeeName",
                    "Employee name / identifying details (if known)",
                  )}
                {input("locationName", "Location / site (if known)")}
                {input("title", "Brief subject", true)}
                <label className="block text-sm font-semibold">
                  What happened?
                  <textarea
                    required
                    minLength={15}
                    maxLength={12000}
                    rows={7}
                    className={field}
                    value={form.description || ""}
                    placeholder="Include relevant dates, the service or conduct involved, and the outcome you are seeking."
                    onChange={(e) =>
                      setForm((prev: any) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />
                </label>
                <div
                  aria-hidden="true"
                  style={{ position: "absolute", left: "-10000px" }}
                >
                  <label>
                    Website
                    <input
                      name="website"
                      autoComplete="off"
                      tabIndex={-1}
                      value={form.website}
                      onChange={(e) =>
                        setForm((prev: any) => ({
                          ...prev,
                          website: e.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
                <Script
                  id="complaint-human-verification"
                  src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                  strategy="afterInteractive"
                  onReady={() => setScriptReady(true)}
                />
                <div ref={challenge} />
                <p className="text-xs leading-5 text-slate-500">
                  We use your contact details to acknowledge and follow up on
                  this complaint. Human verification helps prevent automated
                  submissions. This form is not an emergency service.
                </p>
                <button
                  disabled={busy || !token}
                  className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-40"
                >
                  {busy ? "Submitting securely…" : "Submit complaint"}
                </button>
              </form>
            )}
          </section>
        ) : null}
        <footer className="mt-8 text-center text-xs text-slate-400">
          Accountability · Fair review · Clear resolution
        </footer>
      </div>
    </main>
  );
}
