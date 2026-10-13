"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "../../lib/api";
import { UserRole } from "@unitedlinkgroup/types";
import {
  ArrowUpRight,
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Link2,
  CalendarDays,
  Clock3,
  Users,
  Check,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import styles from "./login.module.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const submittingRef = useRef(false);
  const router = useRouter();
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError("");
    setIsSubmitting(true);
    try {
      const response = await api.post("/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });
      const token = response.data.access_token;
      if (typeof token !== "string" || !token)
        throw new Error("Sign-in could not be completed. Please try again.");
      localStorage.setItem("token", token);
      localStorage.removeItem("selectedBusiness");
      try {
        const employeeType = response?.data?.employeeType;
        if (employeeType) {
          localStorage.setItem("employee_type", String(employeeType));
        } else {
          localStorage.removeItem("employee_type");
        }
      } catch {}
      const role = (() => {
        try {
          const base64 = String(token || "").split(".")[1] || "";
          const padded = base64
            .replace(/-/g, "+")
            .replace(/_/g, "/")
            .padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
          const payload = JSON.parse(atob(padded));
          return payload?.role || null;
        } catch {
          return null;
        }
      })();

      if (role === UserRole.SUPER_ADMIN) {
        localStorage.removeItem("selectedBusiness");
        localStorage.removeItem("superadminBusinessContext");
      } else {
        const businessObj = response.data.business;
        const businessId = response.data.businessId;
        if (businessObj && businessObj.id) {
          localStorage.setItem("selectedBusiness", JSON.stringify(businessObj));
        } else if (businessId) {
          localStorage.setItem(
            "selectedBusiness",
            JSON.stringify({ id: businessId, name: "Business" }),
          );
        }
      }
      try {
        window.dispatchEvent(new Event("auth:changed"));
      } catch {}
      router.replace("/dashboard");
    } catch (err: any) {
      if (err.response?.status === 401) {
        const message = err.response?.data?.message;
        if (
          typeof message === "string" &&
          message.toLowerCase().includes("bootstrap")
        ) {
          setError(message);
        } else {
          setError(
            "The email or password is incorrect. Please check your details and try again.",
          );
        }
      } else if (err.response) {
        const message = err.response.data?.message;
        setError(
          err.response.status === 429
            ? "Too many sign-in attempts. Please wait a moment and try again."
            : typeof message === "string"
              ? message
              : Array.isArray(message)
                ? message.join(". ")
                : "Sign-in could not be completed. Please try again.",
        );
      } else {
        setError("Unable to connect to server. Please try again later.");
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <a className={styles.skipLink} href="#sign-in">
        Skip to sign in
      </a>
      <section
        className={styles.story}
        aria-label="United Link Group workspace"
      >
        <Link
          href="/"
          className={styles.brand}
          aria-label="United Link Group home"
        >
          <span className={styles.brandIcon}>
            <Link2 size={25} strokeWidth={2.5} />
          </span>
          <span>
            United Link<span className={styles.brandSecond}>Group</span>
          </span>
        </Link>
        <div className={styles.storyContent}>
          <div className={styles.eyebrow}>
            <span /> ONE CONNECTED WORKSPACE
          </div>
          <h1>
            Your people.
            <br />
            Your operations.
            <br />
            <span>In sync.</span>
          </h1>
          <p className={styles.storyDescription}>
            Bring your team, schedules and everyday
            <br className={styles.desktopBreak} /> operations together. Make
            room for what’s next.
          </p>
          <div className={styles.visual} aria-hidden="true">
            <div className={styles.orbitOne} />
            <div className={styles.orbitTwo} />
            <div className={styles.sparkOne} />
            <div className={styles.sparkTwo} />
            <div className={styles.workspaceCard}>
              <div className={styles.cardHeader}>
                <span className={styles.cardBrand}>
                  <Link2 size={15} /> Your workspace
                </span>
                <span className={styles.cardMenu}>•••</span>
              </div>
              <div className={styles.cardTitle}>
                A clearer view of your day.
              </div>
              <div className={styles.workspaceTabs}>
                <span>Overview</span>
                <span>Team</span>
                <span>Schedule</span>
              </div>
              <div className={styles.timeline}>
                <div className={styles.timelineLabel}>
                  <span>YOUR TEAM</span>
                  <span>MON</span>
                  <span>TUE</span>
                  <span>WED</span>
                  <span>THU</span>
                </div>
                {[
                  ["AJ", "mint"],
                  ["BW", "violet"],
                  ["CM", "blue"],
                ].map(([initials, color], index) => (
                  <div className={styles.timelineRow} key={initials}>
                    <span className={`${styles.avatar} ${styles[color]}`}>
                      {initials}
                    </span>
                    <div className={styles.track}>
                      <span
                        className={`${styles.shift} ${styles[color]}`}
                        style={{
                          marginLeft: `${index * 17}%`,
                          width: `${63 - index * 8}%`,
                        }}
                      >
                        <span />{" "}
                        {index === 1
                          ? "Team handover"
                          : index === 2
                            ? "Afternoon shift"
                            : "Morning shift"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.cardFooter}>
                <span>
                  <span className={styles.smallDot} /> People. Time. Places.
                </span>
                <ArrowUpRight size={15} />
              </div>
            </div>
            <div className={styles.floatingCard}>
              <span className={styles.checkIcon}>
                <Check size={16} />
              </span>
              <div>
                <strong>Everything, connected.</strong>
                <span>From the first shift to the final handover.</span>
              </div>
            </div>
          </div>
          <div className={styles.features}>
            <span>
              <CalendarDays size={16} /> Smarter schedules
            </span>
            <span>
              <Users size={16} /> Connected teams
            </span>
            <span>
              <Clock3 size={16} /> Time that counts
            </span>
          </div>
        </div>
        <div className={styles.storyFooter}>
          <span>Built around the way you work.</span>
          <span className={styles.footerMark}>ULG / WORKFORCE</span>
        </div>
      </section>

      <section className={styles.signInPanel} aria-labelledby="sign-in-heading">
        <div className={styles.panelTop}>
          <span>YOUR WORKSPACE AWAITS</span>
          <Link href="/" aria-label="Visit United Link Group home">
            <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className={styles.formArea} id="sign-in" tabIndex={-1}>
          <div className={styles.welcomeMark}>
            <Link2 size={26} />
          </div>
          <p className={styles.formEyebrow}>GOOD TO SEE YOU AGAIN</p>
          <h2 id="sign-in-heading">Welcome back.</h2>
          <p className={styles.formDescription}>
            Sign in to your United Link Group workspace.
          </p>
          <form
            onSubmit={handleLogin}
            className={styles.form}
            aria-busy={isSubmitting}
          >
            {error && (
              <div className={styles.error} role="alert" id="login-error">
                <AlertCircle size={18} />
                <div>
                  {error}
                  {error.toLowerCase().includes("bootstrap") && (
                    <Link href="/register">
                      Create the first admin account <ArrowUpRight size={14} />
                    </Link>
                  )}
                </div>
              </div>
            )}
            <div className={styles.field}>
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                required
                autoComplete="username"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="you@company.com"
                disabled={isSubmitting}
                aria-describedby={error ? "login-error" : undefined}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="login-password">Password</label>
              <div className={styles.passwordInput}>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  onKeyDown={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                  onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                  onBlur={() => setCapsLock(false)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  disabled={isSubmitting}
                  aria-describedby={
                    capsLock ? "caps-lock" : error ? "login-error" : undefined
                  }
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-controls="login-password"
                  aria-pressed={showPassword}
                  disabled={isSubmitting}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
              {capsLock && (
                <p id="caps-lock" className={styles.capsLock} role="status">
                  Caps Lock is on.
                </p>
              )}
            </div>
            <button
              className={styles.submit}
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className={styles.spinner} /> Signing in…
                </>
              ) : (
                <>
                  Sign in <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
          <div className={styles.helpArea}>
            <button
              type="button"
              className={styles.helpButton}
              aria-expanded={showHelp}
              aria-controls="login-help"
              onClick={() => setShowHelp((v) => !v)}
            >
              Need help signing in?
              <ChevronDown
                size={15}
                className={showHelp ? styles.chevronOpen : ""}
              />
            </button>
            {showHelp && (
              <p className={styles.helpText} id="login-help">
                Use the email address connected to your account. If you’ve
                forgotten your password or need access, contact your business
                administrator.
              </p>
            )}
          </div>
          <div className={styles.formRule} />
          <p className={styles.accessNote}>
            One account. Your whole workday.
            <br />
            <span>For team members, managers and administrators.</span>
          </p>
        </div>
        <footer className={styles.panelFooter}>
          <span>© {new Date().getFullYear()} United Link Group</span>
          <Link href="/privacy-policy">
            Privacy policy <ArrowUpRight size={12} />
          </Link>
        </footer>
      </section>
    </main>
  );
}
