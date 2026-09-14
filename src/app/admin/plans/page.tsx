"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";

interface Plan {
  id: string;
  name: string;
  description: string;
  price: string;
  billingPeriod: string;
  status: string;
  limitsJson: Record<string, unknown>;
  featuresJson: string[];
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/plans").then(r => r.json()).then(d => {
      setPlans(d.plans || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Subscription Plans</h1>
          <p className="text-sm text-slate-500">Manage platform subscription plans</p>
        </div>
      </div>

      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-2xl text-sm text-yellow-700">
        ⚠️ Plan pricing and limits are not final. Configure them carefully before launch.
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : plans.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-slate-500">No plans configured yet</p>
          <p className="text-sm text-slate-400 mt-1">Load demo data to see sample plans</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map(plan => (
            <div key={plan.id} className="card border-2 border-blue-100">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{plan.name}</h3>
                  <p className="text-sm text-slate-500">{plan.description}</p>
                </div>
                <span className={`badge ${plan.status === "ACTIVE" ? "badge-green" : "badge-gray"}`}>{plan.status}</span>
              </div>
              <div className="text-3xl font-black text-blue-600 mb-1">{formatCurrency(plan.price)}</div>
              <p className="text-sm text-slate-500 mb-4">per {plan.billingPeriod?.toLowerCase()}</p>
              {plan.limitsJson && (
                <div className="space-y-1 text-sm mb-3">
                  {Object.entries(plan.limitsJson).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-slate-500 capitalize">{k}</span>
                      <span className="font-medium text-slate-700">Up to {String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
              {Array.isArray(plan.featuresJson) && (
                <div className="space-y-1">
                  {plan.featuresJson.map((f: string) => (
                    <div key={f} className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="text-green-500">✓</span> {f}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
