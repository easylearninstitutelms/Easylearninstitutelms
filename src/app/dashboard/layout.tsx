"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  allowedRoles?: string[];
}

function NavIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-5 w-5 items-center justify-center">
      {children}
    </span>
  );
}

const ALL_ROLES = ["SUPER_ADMIN", "INSTITUTE_ADMIN"];

const TEACHER_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "TEACHER",
];

const RECEPTIONIST_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "RECEPTIONIST",
];

const ACCOUNTANT_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "ACCOUNTANT",
];

const STAFF_ADMIN_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "STAFF",
  "MANAGER",
];

const DIGITAL_MARKETER_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "DIGITAL_MARKETER",
];

const STUDENT_MANAGEMENT_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "STAFF",
  "MANAGER",
  "TEACHER",
  "RECEPTIONIST",
];

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    allowedRoles: [
      ...ALL_ROLES,
      "TEACHER",
      "RECEPTIONIST",
      "ACCOUNTANT",
      "STAFF",
      "MANAGER",
    ],
    icon: (
      <NavIcon>
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      </NavIcon>
    ),
  },

  {
    href: "/dashboard/students",
    label: "Students",
    allowedRoles: STUDENT_MANAGEMENT_ROLES,
    icon: (
      <NavIcon>
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </NavIcon>
    ),
  },

  {
    href: "/dashboard/staff",
    label: "Staff",
    allowedRoles: STAFF_ADMIN_ROLES,
    icon: (
      <NavIcon>
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </NavIcon>
    ),
  },

  {
    href: "/dashboard/digital-marketer",
    label: "Digital Marketing",
    allowedRoles: DIGITAL_MARKETER_ROLES,
    icon: (
      <NavIcon>
        <span className="text-base">📣</span>
      </NavIcon>
    ),
  },

  {
    href: "/dashboard/staff/bin",
    label: "Staff Bin",
    allowedRoles: STAFF_ADMIN_ROLES,
    icon: (
      <NavIcon>
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 6h18M8 6V4h8v2m-9 0l1 14h8l1-14M10 10v7m4-7v7"
          />
        </svg>
      </NavIcon>
    ),
  },

  {
    href: "/dashboard/courses",
    label: "Courses",
    allowedRoles: [
      ...ALL_ROLES,
      "TEACHER",
      "STAFF",
      "MANAGER",
    ],
    icon: (
      <NavIcon>
        <svg
          className="h-5 w-5"
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
      </NavIcon>
    ),
  },

  {
    href: "/dashboard/programmes",
    label: "Programmes",
    allowedRoles: [
      ...ALL_ROLES,
      "STAFF",
      "MANAGER",
      "TEACHER",
    ],
    icon: (
      <NavIcon>
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 5.5A2.5 2.5 0 016.5 3H20v18H6.5A2.5 2.5 0 014 18.5v-13z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7h8M8 11h8M8 15h5"
          />
        </svg>
      </NavIcon>
    ),
  },

  {
    href: "/dashboard/batches",
    label: "Batches",
    allowedRoles: [
      ...ALL_ROLES,
      ...TEACHER_ROLES,
      "STAFF",
      "MANAGER",
    ],
    icon: (
      <NavIcon>
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      </NavIcon>
    ),
  },

  {
    href: "/dashboard/attendance",
    label: "Attendance",
    allowedRoles: [
      ...ALL_ROLES,
      "TEACHER",
      "STAFF",
      "MANAGER",
    ],
    icon: (
      <NavIcon>
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
      </NavIcon>
    ),
  },

  {
    href: "/dashboard/fees",
    label: "Fees & Payments",
    allowedRoles: [
      ...ALL_ROLES,
      ...RECEPTIONIST_ROLES,
      ...ACCOUNTANT_ROLES,
      "STAFF",
      "MANAGER",
    ],
    icon: (
      <NavIcon>
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </NavIcon>
    ),
  },

  {
    href: "/dashboard/expenses",
    label: "Expenses",
    allowedRoles: [
      ...ALL_ROLES,
      ...ACCOUNTANT_ROLES,
      "STAFF",
      "MANAGER",
    ],
    icon: (
      <NavIcon>
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z"
          />
        </svg>
      </NavIcon>
    ),
  },

  {
    href: "/dashboard/salary",
    label: "Salary",
    allowedRoles: [
      ...ALL_ROLES,
      ...ACCOUNTANT_ROLES,
      "STAFF",
      "MANAGER",
    ],
    icon: (
      <NavIcon>
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </NavIcon>
    ),
  },

  {
    href: "/dashboard/enquiries",
    label: "Enquiries",
    allowedRoles: [
      ...ALL_ROLES,
      ...RECEPTIONIST_ROLES,
      "STAFF",
      "MANAGER",
    ],
    icon: (
      <NavIcon>
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </NavIcon>
    ),
  },

  {
    href: "/dashboard/homework",
    label: "Homework",
    allowedRoles: [
      ...ALL_ROLES,
      "TEACHER",
      "STAFF",
      "MANAGER",
    ],
    icon: (
      <NavIcon>
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      </NavIcon>
    ),
  },

  {
    href: "/dashboard/exams",
    label: "Exams & Results",
    allowedRoles: [
      ...ALL_ROLES,
      "TEACHER",
      "STAFF",
      "MANAGER",
    ],
    icon: (
      <NavIcon>
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </NavIcon>
    ),
  },

  {
    href: "/dashboard/reports",
    label: "Reports",
    allowedRoles: [
      ...ALL_ROLES,
      ...ACCOUNTANT_ROLES,
      "STAFF",
      "MANAGER",
      "RECEPTIONIST",
    ],
    icon: (
      <NavIcon>
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </NavIcon>
    ),
  },

  {
    href: "/dashboard/notifications",
    label: "Notifications",
    allowedRoles: [
      ...ALL_ROLES,
      "TEACHER",
      "RECEPTIONIST",
      "ACCOUNTANT",
      "STAFF",
      "MANAGER",
    ],
    icon: (
      <NavIcon>
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      </NavIcon>
    ),
  },
];

interface SessionUser {
  userId: string;
  name: string;
  role: string;
  instituteName?: string;
  instituteStatus?: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [user, setUser] =
    useState<SessionUser | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");

      if (!res.ok) {
        router.push("/");
        return;
      }

      const data = await res.json();

      if (!data.user) {
        router.push("/");
        return;
      }

      setUser(data.user);
    } catch {
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    router.push("/");
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  }

  const statusColor: Record<string, string> = {
    ACTIVE: "bg-green-500",
    TRIAL: "bg-blue-500",
    EXPIRED: "bg-red-500",
    SUSPENDED: "bg-yellow-500",
  };

  const visibleNavItems = user
    ? navItems.filter((item) => {
        if (!item.allowedRoles) {
          return true;
        }

        return item.allowedRoles.includes(user.role);
      })
    : [];

  const Sidebar = () => (
    <aside className="flex h-full flex-col border-r border-slate-100 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600">
          <svg
            className="h-5 w-5 text-white"
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

        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-blue-700">
            Easylearn
          </p>

          <p className="truncate text-xs text-slate-400">
            {user?.instituteName || "Institute"}
          </p>
        </div>
      </div>

      {user?.instituteStatus && (
        <div className="border-b border-slate-100 px-5 py-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
            <span
              className={`h-2 w-2 rounded-full ${
                statusColor[user.instituteStatus] ||
                "bg-gray-400"
              }`}
            />

            {user.instituteStatus} Account
          </span>
        </div>
      )}

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {visibleNavItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() =>
                setSidebarOpen(false)
              }
              className={`sidebar-link ${
                isActive
                  ? "active"
                  : "text-slate-600"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-slate-50">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
            {user
              ? getInitials(user.name)
              : "?"}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-700">
              {user?.name}
            </p>

            <p className="truncate text-xs text-slate-400">
              {user?.role?.replace("_", " ")}
            </p>
          </div>

          <button
            onClick={handleLogout}
            title="Logout"
            className="text-slate-400 transition hover:text-red-500"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="hidden w-60 flex-shrink-0 md:flex md:flex-col">
        <Sidebar />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() =>
              setSidebarOpen(false)
            }
          />

          <div className="absolute bottom-0 left-0 top-0 flex w-64 flex-col">
            <Sidebar />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-3">
          <button
            onClick={() =>
              setSidebarOpen(true)
            }
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 md:hidden"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <div className="flex-1" />

          <span className="hidden text-sm text-slate-500 sm:block">
            {new Date().toLocaleDateString(
              "en-BD",
              {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              }
            )}
          </span>

          <Link
            href="/dashboard/notifications"
            className="relative rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}