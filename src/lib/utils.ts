import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  return `৳${num.toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateReceiptNumber(prefix = "RCP"): string {
  const now = new Date();
  const timestamp = now.getTime().toString().slice(-8);
  return `${prefix}-${timestamp}`;
}

export function generateStudentId(prefix = "STD"): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}${year}${random}`;
}

export function getAttendanceColor(status: string): string {
  switch (status) {
    case "PRESENT": return "badge-green";
    case "ABSENT": return "badge-red";
    case "LATE": return "badge-yellow";
    case "LEAVE": return "badge-blue";
    default: return "badge-gray";
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "ACTIVE": return "badge-green";
    case "INACTIVE": return "badge-gray";
    case "ARCHIVED": return "badge-gray";
    case "TRIAL": return "badge-blue";
    case "EXPIRED": return "badge-red";
    case "SUSPENDED": return "badge-red";
    case "CANCELLED": return "badge-gray";
    case "PAID": return "badge-green";
    case "PARTIAL": return "badge-yellow";
    case "DUE": return "badge-red";
    case "WAIVED": return "badge-gray";
    case "PENDING": return "badge-yellow";
    case "APPROVED": return "badge-green";
    case "REJECTED": return "badge-red";
    case "NEW": return "badge-blue";
    case "CONTACTED": return "badge-purple";
    case "INTERESTED": return "badge-orange";
    case "ADMITTED": return "badge-green";
    case "NOT_INTERESTED": return "badge-gray";
    case "LOST": return "badge-red";
    default: return "badge-gray";
  }
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function daysUntil(date: string | Date): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
