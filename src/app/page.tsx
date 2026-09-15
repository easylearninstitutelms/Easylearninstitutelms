"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [instituteName, setInstituteName] = useState("");
  const [institutePhone, setInstitutePhone] = useState("");
  const [instituteAddress, setInstituteAddress] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      if (data.user.role === "SUPER_ADMIN") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          phone: regPhone,
          instituteName,
          institutePhone,
          instituteAddress,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSeed() {
    setLoading(true);

    try {
      const res = await fetch("/api/seed", {
        method: "POST",
      });

      const data = await res.json();

      alert(
        data.message ||
          `Seeded! Credentials:\nSuper Admin: admin@easylearn.io / admin123\nInstitute Admin: karim@dhakamodel.edu.bd / admin123`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-orange-50 p-4">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-3">
          <svg
            className="w-9 h-9 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-blue-700">
          Easylearn Institute
        </h1>

        <p className="text-sm text-slate-500 mt-1">
          Institute Management Platform
        </p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => {
              setTab("login");
              setError("");
            }}
            className={`flex-1 py-4 text-sm font-semibold transition-all ${
              tab === "login"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Login
          </button>

          <button
            onClick={() => {
              setTab("register");
              setError("");
            }}
            className={`flex-1 py-4 text-sm font-semibold transition-all ${
              tab === "register"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Register Institute
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
              {error}
            </div>
          )}

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="form-label">Email</label>

                <input
                  type="email"
                  className="form-input"
                  placeholder="your@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label">Password</label>

                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full justify-center py-3"
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700 font-medium">
                🎉 Free 30-day trial — no payment required
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Your Name</label>

                  <input
                    className="form-input"
                    placeholder="Full name"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Phone</label>

                  <input
                    className="form-input"
                    placeholder="01XXXXXXXXX"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Email</label>

                <input
                  type="email"
                  className="form-input"
                  placeholder="your@email.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label">Password</label>

                <input
                  type="password"
                  className="form-input"
                  placeholder="Min 8 characters"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
              </div>

              <hr className="border-slate-100" />

              <div>
                <label className="form-label">Institute Name</label>

                <input
                  className="form-input"
                  placeholder="e.g. Dhaka Science Academy"
                  value={instituteName}
                  onChange={(e) => setInstituteName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Institute Phone</label>

                  <input
                    className="form-input"
                    placeholder="01XXXXXXXXX"
                    value={institutePhone}
                    onChange={(e) => setInstitutePhone(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label">Address</label>

                  <input
                    className="form-input"
                    placeholder="City, Area"
                    value={instituteAddress}
                    onChange={(e) => setInstituteAddress(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full justify-center py-3"
              >
                {loading
                  ? "Creating..."
                  : "Create Institute & Start Trial"}
              </button>
            </form>
          )}

          {/* Demo seed */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 mb-2">
              Demo Access
            </p>

            <button
              onClick={handleSeed}
              disabled={loading}
              className="btn btn-outline btn-sm text-xs"
            >
              {loading ? "Setting up..." : "Load Demo Data"}
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="text-xs text-slate-400 mt-6">
        © {new Date().getFullYear()} Easylearn Institute. All rights reserved.
      </p>
    </div>
  );
}