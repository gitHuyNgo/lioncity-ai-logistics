import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Lock, Mail, User, ArrowLeft, Eye, EyeOff, AlertCircle, Route, Truck, MapPinned } from "lucide-react";
import ParticleNetwork from "@/components/ParticleNetwork";
import { useAuth } from "@/context/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Import assets
import authBackground from "@/assets/auth/background.jpg";
import logoImage from "@/assets/logos/logo_image.png";
import logoText from "@/assets/logos/logo_text.png";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Shared token-driven class strings so brand color/shadow come from the
// Design_System tokens (Requirement 1.2) rather than literal hex values.
const inputClass =
  "h-12 rounded-lg border-white/50 bg-white/75 pl-11 text-base font-medium text-[hsl(220_73%_20%)] shadow-sm transition-colors duration-200 placeholder:text-[hsl(220_40%_45%/0.55)] focus:border-[hsl(221_83%_53%)] focus:bg-white focus:ring-2 focus:ring-[hsl(221_83%_53%/0.18)]";
const submitClass =
  "h-12 w-full cursor-pointer rounded-lg bg-[hsl(24_95%_53%)] text-base font-semibold tracking-[0.12em] text-white shadow-[0_14px_32px_hsl(24_95%_53%/0.32)] transition-colors duration-200 hover:bg-[hsl(24_95%_48%)] focus-visible:ring-[hsl(24_95%_53%)] disabled:cursor-not-allowed disabled:opacity-60";
// Field-level validation message styling (Requirement 9.2) — destructive token.
const fieldErrorClass =
  "text-[11px] font-bold uppercase tracking-wider text-destructive ml-1";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState("login"); // "login" or "reset"
  const [showPassword, setShowPassword] = useState(false);

  // Login form state (retained across validation/submission failures — Req 9.2/9.3)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Reset form state (controlled so values are retained on validation failure)
  const [fullName, setFullName] = useState("");
  const [resetEmail, setResetEmail] = useState("");

  // Field-level validation messages keyed by input id (Requirement 9.2)
  const [fieldErrors, setFieldErrors] = useState({});

  const clearFieldError = (key) =>
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const validateLogin = () => {
    const errors = {};
    if (!email.trim()) errors.email = "Email is required.";
    else if (!EMAIL_RE.test(email.trim())) errors.email = "Enter a valid email address.";
    if (!password) errors.password = "Password is required.";
    return errors;
  };

  const validateReset = () => {
    const errors = {};
    if (!fullName.trim()) errors["full-name"] = "Full name is required.";
    if (!resetEmail.trim()) errors["reset-email"] = "Email is required.";
    else if (!EMAIL_RE.test(resetEmail.trim())) errors["reset-email"] = "Enter a valid email address.";
    return errors;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    // Withhold submission while retaining entered values when validation fails (Req 9.2)
    const errors = validateLogin();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsLoading(true);
    try {
      await login(email, password);
      // Return to the originally requested page when redirected here by
      // ProtectedRoute (Requirement 11.7). If the authenticated role is not
      // permitted for that path, the role-gated routes redirect to "/".
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
      // Server/network error: show message, retain entered values (Req 9.3)
      setError(err.response?.data?.detail || "Authentication failed. Please check your credentials.");
    } finally {
      // Re-enable submit after all processing for the failed submission finishes (Req 9.3)
      setIsLoading(false);
    }
  };

  const handleReset = (e) => {
    e.preventDefault();
    setError(null);

    const errors = validateReset();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setView("login");
      setFullName("");
      setResetEmail("");
      alert("Password reset request submitted successfully.");
    }, 1500);
  };

  // Reset transient state when switching views so stale messages don't carry over.
  const switchView = (next) => {
    setError(null);
    setFieldErrors({});
    setView(next);
  };

  return (
    <main
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[hsl(214_100%_97%)] p-4 text-[hsl(220_73%_20%)] sm:p-6"
      style={{
        backgroundImage: `url(${authBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <ParticleNetwork />
      <div className="absolute inset-0 z-0 bg-[linear-gradient(135deg,hsl(214_100%_97%/0.92),hsl(221_83%_53%/0.58)_52%,hsl(24_95%_53%/0.48))]" />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_20%,hsl(0_0%_100%/0.55),transparent_34%),radial-gradient(circle_at_82%_72%,hsl(24_95%_53%/0.28),transparent_32%)]" />

      <div className="relative z-10 grid w-full max-w-[1200px] items-center gap-6 lg:grid-cols-[1fr_470px]">
        <section className="hidden min-h-[620px] flex-col justify-between rounded-2xl border border-white/30 bg-white/18 p-8 shadow-[0_20px_25px_hsl(220_73%_20%/0.15)] backdrop-blur-[18px] lg:flex">
          <div>
            <div className="mb-10 flex items-center gap-4">
              <img
                src={logoImage}
                alt="LionCity Logo"
                className="h-20 w-20 drop-shadow-[0_16px_32px_hsl(220_73%_20%/0.22)]"
              />
              <img
                src={logoText}
                alt="LionCity"
                className="h-16 drop-shadow-[0_10px_24px_hsl(220_73%_20%/0.18)]"
              />
            </div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-[hsl(24_95%_43%)]">
              AI-Logistics Management System
            </p>
            <h1 className="max-w-[620px] text-5xl font-semibold leading-tight tracking-tight text-[hsl(220_73%_20%)]">
              Secure access for real-time dispatch control.
            </h1>
            <p className="mt-5 max-w-[560px] text-base leading-7 text-[hsl(220_40%_28%)]">
              Track routing, fleet status, and hub operations through one clean operations console.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Route, label: "Route intelligence" },
              { icon: Truck, label: "Fleet visibility" },
              { icon: MapPinned, label: "Hub coverage" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="rounded-lg border border-white/35 bg-white/35 p-4 shadow-[0_4px_6px_hsl(220_73%_20%/0.10)] backdrop-blur-[14px]"
              >
                <Icon className="mb-3 h-5 w-5 text-[hsl(221_83%_53%)]" aria-hidden="true" />
                <div className="text-sm font-semibold text-[hsl(220_73%_20%)]">{label}</div>
              </div>
            ))}
          </div>
        </section>

        <div className="mx-auto flex w-full max-w-[470px] flex-col gap-5">
          <div className="flex flex-col items-center gap-3 text-center lg:hidden">
            <img
              src={logoImage}
              alt="LionCity Logo"
              className="h-24 w-24 drop-shadow-[0_16px_32px_hsl(220_73%_20%/0.22)]"
            />
            <img
              src={logoText}
              alt="LionCity"
              className="h-16 drop-shadow-[0_10px_24px_hsl(220_73%_20%/0.18)]"
            />
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[hsl(220_73%_20%)]">
              AI-Logistics Management System
            </p>
          </div>

        {/* Fixed Height Card with Identical Internal Spacing */}
        <Card className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-white/35 bg-white/32 shadow-[0_20px_25px_hsl(220_73%_20%/0.15)] backdrop-blur-[18px]">

          {view === "login" ? (
            <div className="flex-1 flex flex-col animate-in fade-in zoom-in-95 duration-300">
              <CardHeader className="px-8 pb-4 pt-8 text-center sm:px-10">
                <CardTitle className="mb-2 text-4xl font-semibold tracking-tight text-[hsl(220_73%_20%)]">
                  Welcome
                </CardTitle>
                <CardDescription className="mx-auto max-w-[320px] text-[15px] font-medium leading-relaxed text-[hsl(220_40%_28%)]">
                  Please enter your authorized credentials
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleLogin} noValidate className="flex-1 flex flex-col justify-between">
                <CardContent className="space-y-5 px-8 sm:px-10">
                  {error && (
                    <Alert variant="destructive" className="border-destructive/40 bg-white/75 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs font-bold uppercase tracking-wider ml-2">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-3">
                    <Label htmlFor="email" className="ml-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[hsl(220_73%_20%)]">
                      EMAIL
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-4 h-4.5 w-4.5 text-[hsl(221_83%_53%/0.55)] transition-colors group-focus-within:text-[hsl(221_83%_53%)]" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }}
                        aria-invalid={fieldErrors.email ? "true" : undefined}
                        aria-describedby={fieldErrors.email ? "email-error" : undefined}
                        className={inputClass}
                      />
                    </div>
                    {fieldErrors.email && (
                      <p id="email-error" role="alert" className={fieldErrorClass}>
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between ml-1">
                      <Label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[hsl(220_73%_20%)]">
                        PASSWORD
                      </Label>
                      <button
                        type="button"
                        onClick={() => switchView("reset")}
                        className="cursor-pointer text-[10px] font-semibold uppercase tracking-widest text-[hsl(221_83%_53%)] transition-colors duration-200 hover:text-[hsl(24_95%_43%)]"
                      >
                        RESET PASSWORD
                      </button>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-4 h-4.5 w-4.5 text-[hsl(221_83%_53%/0.55)] transition-colors group-focus-within:text-[hsl(221_83%_53%)]" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); clearFieldError("password"); }}
                        aria-invalid={fieldErrors.password ? "true" : undefined}
                        aria-describedby={fieldErrors.password ? "password-error" : undefined}
                        className={`${inputClass} pr-12`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-4 top-4 cursor-pointer text-[hsl(220_40%_45%)] transition-colors duration-200 hover:text-[hsl(221_83%_53%)]"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    {fieldErrors.password && (
                      <p id="password-error" role="alert" className={fieldErrorClass}>
                        {fieldErrors.password}
                      </p>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="px-8 pb-8 pt-4 sm:px-10">
                  <Button type="submit" className={submitClass} disabled={isLoading}>
                    {isLoading ? "Authenticating..." : "LOGIN"}
                  </Button>
                </CardFooter>
              </form>
            </div>
          ) : (
            <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-8 duration-300">
              <CardHeader className="relative px-8 pb-4 pt-8 text-center sm:px-10">
                <button
                  onClick={() => switchView("login")}
                  aria-label="Back to login"
                  className="absolute left-8 top-9 cursor-pointer text-[hsl(220_40%_45%)] transition-colors duration-200 hover:text-[hsl(221_83%_53%)]"
                >
                  <ArrowLeft size={24} />
                </button>
                <CardTitle className="mb-2 text-4xl font-semibold tracking-tight text-[hsl(220_73%_20%)]">
                  Reset
                </CardTitle>
                <CardDescription className="mx-auto max-w-[320px] text-[15px] font-medium leading-relaxed text-[hsl(220_40%_28%)]">
                  Provide your details to recover access
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleReset} noValidate className="flex-1 flex flex-col justify-between">
                <CardContent className="space-y-5 px-8 sm:px-10">
                  {error && (
                    <Alert variant="destructive" className="border-destructive/40 bg-white/75 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs font-bold uppercase tracking-wider ml-2">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-3">
                    <Label htmlFor="full-name" className="ml-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[hsl(220_73%_20%)]">
                      FULL NAME
                    </Label>
                    <div className="relative group">
                      <User className="absolute left-4 top-4 h-4.5 w-4.5 text-[hsl(221_83%_53%/0.55)] transition-colors group-focus-within:text-[hsl(221_83%_53%)]" />
                      <Input
                        id="full-name"
                        placeholder="Enter your full name"
                        value={fullName}
                        onChange={(e) => { setFullName(e.target.value); clearFieldError("full-name"); }}
                        aria-invalid={fieldErrors["full-name"] ? "true" : undefined}
                        aria-describedby={fieldErrors["full-name"] ? "full-name-error" : undefined}
                        className={inputClass}
                      />
                    </div>
                    {fieldErrors["full-name"] && (
                      <p id="full-name-error" role="alert" className={fieldErrorClass}>
                        {fieldErrors["full-name"]}
                      </p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="reset-email" className="ml-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-[hsl(220_73%_20%)]">
                      EMAIL
                    </Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-4 h-4.5 w-4.5 text-[hsl(221_83%_53%/0.55)] transition-colors group-focus-within:text-[hsl(221_83%_53%)]" />
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="Enter your email"
                        value={resetEmail}
                        onChange={(e) => { setResetEmail(e.target.value); clearFieldError("reset-email"); }}
                        aria-invalid={fieldErrors["reset-email"] ? "true" : undefined}
                        aria-describedby={fieldErrors["reset-email"] ? "reset-email-error" : undefined}
                        className={inputClass}
                      />
                    </div>
                    {fieldErrors["reset-email"] && (
                      <p id="reset-email-error" role="alert" className={fieldErrorClass}>
                        {fieldErrors["reset-email"]}
                      </p>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="px-8 pb-8 pt-4 sm:px-10">
                  <Button type="submit" className={submitClass} disabled={isLoading}>
                    {isLoading ? "Processing..." : "RESET PASSWORD"}
                  </Button>
                </CardFooter>
              </form>
            </div>
          )}
        </Card>

        <div className="text-center">
          <p className="flex items-center justify-center gap-2.5 text-[12px] font-semibold uppercase tracking-[0.22em] text-[hsl(220_73%_20%)]">
            <ShieldCheck className="w-4.5 h-4.5" /> SECURE ENCRYPTED ACCESS
          </p>
        </div>
      </div>
      </div>
    </main>
  );
}
