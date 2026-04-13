"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle, XCircle, RefreshCw, Database, Mail, CreditCard,
  Key, Server, Cpu, HardDrive, Clock, Loader2, Activity, BookOpen,
} from "lucide-react";

type Check = { ok: boolean; detail?: string };
type HealthData = {
  ok: boolean;
  checks: {
    database: Check;
    smtp: Check;
    stripe: Check;
    jwt: Check;
    blogApiKey: Check;
  };
  runtime: {
    uptime: string;
    uptimeSeconds: number;
    nodeVersion: string;
    memoryMB: number;
    heapUsedMB: number;
    heapTotalMB: number;
    platform: string;
    pid: number;
  };
  timestamp: string;
};

function StatusIcon({ ok }: { ok: boolean }) {
  return ok
    ? <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
    : <XCircle className="w-5 h-5 text-red-500 shrink-0" />;
}

function CheckRow({ icon: Icon, label, check, iconColor }: {
  icon: React.ElementType; label: string; check: Check; iconColor: string;
}) {
  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border ${check.ok ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${check.ok ? "bg-green-100" : "bg-red-100"} shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold th-text text-sm">{label}</p>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${check.ok ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"}`}>
            {check.ok ? "OK" : "FAIL"}
          </span>
        </div>
        {check.detail && <p className="text-xs th-text-2 mt-0.5 break-all">{check.detail}</p>}
      </div>
      <StatusIcon ok={check.ok} />
    </div>
  );
}

function MemBar({ used, total }: { used: number; total: number }) {
  const pct = Math.round((used / total) * 100);
  const color = pct > 80 ? "bg-red-400" : pct > 60 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div>
      <div className="flex justify-between text-xs th-text-2 mb-1">
        <span>{used} MB used</span><span>{total} MB total ({pct}%)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function SystemHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/platform/health");
      setData(await res.json());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-6 h-6 animate-spin th-text-2" />
    </div>
  );

  if (!data) return <p className="th-text-2 text-center py-12">Failed to load health data.</p>;

  const { checks, runtime } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold th-text flex items-center gap-2">
            <Activity className="w-6 h-6 text-green-500" /> System Health
          </h1>
          <p className="th-text-2 text-sm mt-0.5">
            Last checked: {new Date(data.timestamp).toLocaleTimeString("en-GB")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${data.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {data.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {data.ok ? "All Systems Operational" : "Issues Detected"}
          </div>
          <button
            onClick={load}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border th-border th-card text-sm th-text hover:opacity-80 transition-opacity"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Service Checks */}
      <div>
        <h2 className="text-sm font-semibold th-text uppercase tracking-wide mb-4">Service Checks</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <CheckRow icon={Database}  label="Database (PostgreSQL)" check={checks.database}  iconColor="text-blue-600" />
          <CheckRow icon={Mail}      label="SMTP Email"            check={checks.smtp}      iconColor="text-purple-600" />
          <CheckRow icon={CreditCard} label="Stripe Payments"      check={checks.stripe}    iconColor="text-indigo-600" />
          <CheckRow icon={Key}       label="JWT Secret"            check={checks.jwt}       iconColor="text-amber-600" />
          <CheckRow icon={BookOpen}  label="Blog API Key"          check={checks.blogApiKey} iconColor="text-pink-600" />
        </div>
      </div>

      {/* Runtime Info */}
      <div>
        <h2 className="text-sm font-semibold th-text uppercase tracking-wide mb-4">Node.js Runtime</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Uptime + info */}
          <div className="th-card rounded-xl border th-border p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold th-text">{runtime.uptime}</p>
                <p className="text-xs th-text-2">Process uptime</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs th-text-2 border-t th-border pt-3">
              <div><span className="font-medium th-text">Node.js</span><br />{runtime.nodeVersion}</div>
              <div><span className="font-medium th-text">Platform</span><br />{runtime.platform}</div>
              <div><span className="font-medium th-text">PID</span><br />{runtime.pid}</div>
              <div><span className="font-medium th-text">RSS Memory</span><br />{runtime.memoryMB} MB</div>
            </div>
          </div>

          {/* Memory */}
          <div className="th-card rounded-xl border th-border p-5 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Cpu className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold th-text">Heap Memory</p>
                <p className="text-xs th-text-2">V8 JavaScript heap</p>
              </div>
            </div>
            <MemBar used={runtime.heapUsedMB} total={runtime.heapTotalMB} />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold th-text">RSS (Total Process)</p>
                <p className="text-xs th-text-2">{runtime.memoryMB} MB allocated by OS</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Checklist summary */}
      <div className="th-card rounded-xl border th-border p-5">
        <h2 className="text-sm font-semibold th-text mb-4">Quick Reference</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {[
            { label: "Check server logs", hint: "pm2 logs goality --lines 50" },
            { label: "Restart server", hint: "pm2 restart goality --update-env" },
            { label: "DB connect", hint: "docker exec goality-postgres psql -U goality -d goality" },
            { label: "Deploy", hint: "Run deploy.sh from local machine" },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-2">
              <Server className="w-4 h-4 th-text-2 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium th-text">{item.label}</p>
                <code className="text-xs th-text-2 font-mono">{item.hint}</code>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
