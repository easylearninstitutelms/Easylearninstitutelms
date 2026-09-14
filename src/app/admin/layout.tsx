"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

interface SessionUser { userId: string; name: string; role: string }

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "🏠" },
  { href: "/admin/institutes", label: "Institutes", icon: "🏛️" },
  { href: "/admin/payments", label: "Payments", icon: "💳" },
  { href: "/admin/plans", label: "Plans", icon: "📋" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchUser = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    if (!res.ok) { router.push("/"); return; }
    const data = await res.json();
    if (!data.user || data.user.role !== "SUPER_ADMIN") { router.push("/dashboard"); return; }
    setUser(data.user);
  }, [router]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  const Sidebar = () => (
    <aside className="flex flex-col h-full bg-slate-900">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700">
        <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-bold text-white">Super Admin</p>
          <p className="text-xs text-slate-400">Easylearn Platform</p>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => {
          const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? "bg-orange-500 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-700">
        <div className="flex items-center justify-between px-3 py-2">
          <div>
            <p className="text-xs font-semibold text-slate-300">{user?.name}</p>
            <p className="text-xs text-slate-500">Super Admin</p>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="hidden md:flex md:flex-col md:w-56 flex-shrink-0">
        <Sidebar />
      </div>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-56 flex flex-col">
            <Sidebar />
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex-1">
            <span className="text-sm font-medium text-orange-600">🛡️ Super Admin Panel</span>
          </div>
          <Link href="/dashboard" className="btn btn-outline btn-sm">Switch to Institute View</Link>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
