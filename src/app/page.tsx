"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [tab, setTab] =
    useState<"login" | "register">(
      "login"
    );

  const [forgotPasswordMode, setForgotPasswordMode] =
    useState(false);

  const [forgotEmail, setForgotEmail] =
    useState("");

  const [forgotMessage, setForgotMessage] =
    useState("");

  const [forgotError, setForgotError] =
    useState("");

  const [forgotLoading, setForgotLoading] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  // Login form
  const [loginEmail, setLoginEmail] =
    useState("");

  const [
    loginPassword,
    setLoginPassword,
  ] = useState("");

  // Register form
  const [regName, setRegName] =
    useState("");

  const [regEmail, setRegEmail] =
    useState("");

  const [
    regPassword,
    setRegPassword,
  ] = useState("");

  const [regPhone, setRegPhone] =
    useState("");

  const [
    instituteName,
    setInstituteName,
  ] = useState("");

  const [
    institutePhone,
    setInstitutePhone,
  ] = useState("");

  const [
    instituteAddress,
    setInstituteAddress,
  ] = useState("");

  function redirectByRole(
    role: string
  ) {
    if (role === "SUPER_ADMIN") {
      router.push("/admin");
      return;
    }

    if (role === "STUDENT") {
      router.push("/student");
      return;
    }

    if (role === "GUARDIAN") {
      router.push("/guardian");
      return;
    }

    if (role === "DIGITAL_MARKETER") {
      router.push("/dashboard/digital-marketer");
      return;
    }

    router.push("/dashboard");
  }

  async function handleLogin(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        "/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email: loginEmail,
            password:
              loginPassword,
          }),
        }
      );

      const data =
        await res.json();

      if (!res.ok) {
        setError(
          data.error ||
            "Login failed"
        );
        return;
      }

      redirectByRole(
        data.user?.role
      );
    } catch {
      setError(
        "Network error. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setForgotLoading(true);
    setForgotMessage("");
    setForgotError("");

    try {
      const res = await fetch(
        "/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email: forgotEmail,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setForgotError(
          data.error ||
            "Unable to process your request."
        );
        return;
      }

      setForgotMessage(
        data.message ||
          "If this email is registered, a password reset link has been sent."
      );
    } catch {
      setForgotError(
        "Network error. Please try again."
      );
    } finally {
      setForgotLoading(false);
    }
  }
  async function handleRegister(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        "/api/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name: regName,
            email: regEmail,
            password:
              regPassword,
            phone: regPhone,
            instituteName,
            institutePhone,
            instituteAddress,
          }),
        }
      );

      const data =
        await res.json();

      if (!res.ok) {
        setError(
          data.error ||
            "Registration failed"
        );
        return;
      }

      redirectByRole(
        data.user?.role
      );
    } catch {
      setError(
        "Network error. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-orange-50 p-4">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg mb-3 bg-white flex items-center justify-center">
          <img
            src="/easylearn-logo.jpg"
            alt="Easylearn Institute Logo"
            className="w-full h-full object-contain"
          />
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
  forgotPasswordMode ? (
    <form
      onSubmit={handleForgotPassword}
      className="space-y-4"
    >
      <div>
        <h2 className="text-lg font-semibold text-slate-800">
          Forgot Password
        </h2>

        <p className="text-sm text-slate-500 mt-1">
          Enter your registered email address.
          If it is registered, you will receive a
          password reset link.
        </p>
      </div>

      {forgotError && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
          {forgotError}
        </div>
      )}

      {forgotMessage && (
        <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">
          {forgotMessage}
        </div>
      )}

      <div>
        <label className="form-label">
          Email
        </label>

        <input
          type="email"
          className="form-input"
          placeholder="your@email.com"
          value={forgotEmail}
          onChange={(e) =>
            setForgotEmail(e.target.value)
          }
          required
        />
      </div>

      <button
        type="submit"
        disabled={forgotLoading}
        className="btn btn-primary w-full justify-center py-3"
      >
        {forgotLoading
          ? "Sending..."
          : "Send Reset Link"}
      </button>

      <button
        type="button"
        onClick={() => {
          setForgotPasswordMode(false);
          setForgotMessage("");
          setForgotError("");
        }}
        className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        ← Back to Login
      </button>
    </form>
  ) : (
    <form
      onSubmit={handleLogin}
      className="space-y-4"
    >
      <div>
        <label className="form-label">
          Email
        </label>

        <input
          type="email"
          className="form-input"
          placeholder="your@email.com"
          value={loginEmail}
          onChange={(e) =>
            setLoginEmail(e.target.value)
          }
          required
        />
      </div>

      <div>
        <label className="form-label">
          Password
        </label>

        <input
          type="password"
          className="form-input"
          placeholder="••••••••"
          value={loginPassword}
          onChange={(e) =>
            setLoginPassword(e.target.value)
          }
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn btn-primary w-full justify-center py-3"
      >
        {loading
          ? "Logging in..."
          : "Login"}
      </button>

      <button
        type="button"
        onClick={() => {
          setForgotPasswordMode(true);
          setForgotMessage("");
          setForgotError("");
        }}
        className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        Forgot password?
      </button>
    </form>
  )
) : (
            <form
              onSubmit={
                handleRegister
              }
              className="space-y-4"
            >
              <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700 font-medium">
                ðŸŽ‰ Free 30-day trial â€” no payment required
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">
                    Your Name
                  </label>

                  <input
                    className="form-input"
                    placeholder="Full name"
                    value={regName}
                    onChange={(e) =>
                      setRegName(
                        e.target.value
                      )
                    }
                    required
                  />
                </div>

                <div>
                  <label className="form-label">
                    Phone
                  </label>

                  <input
                    className="form-input"
                    placeholder="01XXXXXXXXX"
                    value={regPhone}
                    onChange={(e) =>
                      setRegPhone(
                        e.target.value
                      )
                    }
                  />
                </div>
              </div>

              <div>
                <label className="form-label">
                  Email
                </label>

                <input
                  type="email"
                  className="form-input"
                  placeholder="your@email.com"
                  value={regEmail}
                  onChange={(e) =>
                    setRegEmail(
                      e.target.value
                    )
                  }
                  required
                />
              </div>

              <div>
                <label className="form-label">
                  Password
                </label>

                <input
                  type="password"
                  className="form-input"
                  placeholder="Min 8 characters"
                  value={regPassword}
                  onChange={(e) =>
                    setRegPassword(
                      e.target.value
                    )
                  }
                  required
                />
              </div>

              <hr className="border-slate-100" />

              <div>
                <label className="form-label">
                  Institute Name
                </label>

                <input
                  className="form-input"
                  placeholder="e.g. Dhaka Science Academy"
                  value={
                    instituteName
                  }
                  onChange={(e) =>
                    setInstituteName(
                      e.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">
                    Institute Phone
                  </label>

                  <input
                    className="form-input"
                    placeholder="01XXXXXXXXX"
                    value={
                      institutePhone
                    }
                    onChange={(e) =>
                      setInstitutePhone(
                        e.target.value
                      )
                    }
                  />
                </div>

                <div>
                  <label className="form-label">
                    Address
                  </label>

                  <input
                    className="form-input"
                    placeholder="City, Area"
                    value={
                      instituteAddress
                    }
                    onChange={(e) =>
                      setInstituteAddress(
                        e.target.value
                      )
                    }
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
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-6">
        Â© {new Date().getFullYear()} Easylearn Institute.
        All rights reserved.
      </p>
    </div>
  );
}

