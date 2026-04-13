"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useAdminFetch } from "@/lib/tournament-context";
import {
  ChevronUp,
  ChevronDown,
  Download,
  Plus,
  X,
  Check,
  Minus,
  Filter,
} from "lucide-react";

type OverviewRow = {
  id: number;
  regNumber: number;
  status: string;
  clubName: string | null;
  country: string | null;
  city: string | null;
  badgeUrl: string | null;
  teamName: string;
  division: string | null;
  players: number;
  staff: number;
  accompanying: number;
  arrivalDate: string | null;
  arrivalTime: string | null;
  departureDate: string | null;
  departureTime: string | null;
  accomConfirmed: boolean | null;
  accomDeclined: boolean | null;
  accomPlayers: number | null;
  accomStaff: number | null;
  accomAccompanying: number | null;
  accomCheckIn: string | null;
  accomCheckOut: string | null;
  hasTransfer: boolean;
  packageName: string | null;
  packagePublished: boolean;
  totalOrdered: number;
  accommodationTotal: number;
  transferTotal: number;
  registrationTotal: number;
  mealTotal: number;
  paid: number;
  balance: number;
};

type SortKey = keyof OverviewRow;
type SortDir = "asc" | "desc";

type ExtraColDef = {
  key: string;
  labelKey: string;
};

const EXTRA_COL_DEFS: ExtraColDef[] = [
  { key: "packageName", labelKey: "overviewExtraPackage" },
  { key: "totalOrdered", labelKey: "overviewExtraTotal" },
  { key: "accommodationTotal", labelKey: "overviewExtraAccom" },
  { key: "registrationTotal", labelKey: "overviewExtraRegFee" },
  { key: "transferTotal", labelKey: "overviewExtraTransfer" },
  { key: "mealTotal", labelKey: "overviewExtraMeals" },
  { key: "paid", labelKey: "overviewExtraPaid" },
  { key: "balance", labelKey: "overviewExtraBalance" },
];

type ExtraColKey = string;

function countryToFlag(code: string | null): string {
  if (!code || code.length !== 2) return "🏳";
  return code
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join("");
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    submitted: "bg-blue-100 text-blue-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${map[status] ?? "bg-gray-100 text-gray-500"}`}
    >
      {status}
    </span>
  );
}

function fmt(n: number | null | undefined) {
  if (n == null) return "—";
  return n === 0 ? "—" : `€${n.toLocaleString("en")}`;
}

export default function AdminOverviewPage() {
  const adminFetch = useAdminFetch();
  const t = useTranslations("superAdmin");
  const [rows, setRows] = useState<OverviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterDivision, setFilterDivision] = useState("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAccom, setFilterAccom] = useState("all");

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("regNumber");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Extra columns
  const [extraCols, setExtraCols] = useState<Set<ExtraColKey>>(new Set());
  const [showColPicker, setShowColPicker] = useState(false);

  // Build translated extra columns list
  const EXTRA_COLS = useMemo(
    () =>
      EXTRA_COL_DEFS.map((def) => ({
        key: def.key,
        label: t(def.labelKey),
      })),
    [t]
  );

  function accomStatus(row: OverviewRow): React.ReactNode {
    if (row.accomDeclined)
      return (
        <span className="inline-flex items-center gap-1 text-xs text-error font-medium">
          <X className="w-3 h-3" /> {t("overviewDeclined")}
        </span>
      );
    if (row.accomConfirmed)
      return (
        <span className="inline-flex items-center gap-1 text-xs text-success font-medium">
          <Check className="w-3 h-3" /> {t("overviewConfirmed")}
        </span>
      );
    return <span className="text-xs th-text-2">—</span>;
  }

  useEffect(() => {
    adminFetch("/api/admin/overview")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setRows(data);
        else setError(t("overviewError"));
      })
      .catch(() => setError(t("overviewNetworkError")))
      .finally(() => setLoading(false));
  }, []);

  // Derived filter options
  const divisions = useMemo(() => {
    const s = new Set(rows.map((r) => r.division).filter(Boolean) as string[]);
    return Array.from(s).sort();
  }, [rows]);

  const countries = useMemo(() => {
    const s = new Set(rows.map((r) => r.country).filter(Boolean) as string[]);
    return Array.from(s).sort();
  }, [rows]);

  const statuses = useMemo(() => {
    const s = new Set(rows.map((r) => r.status));
    return Array.from(s).sort();
  }, [rows]);

  // Filtered + sorted rows
  const visible = useMemo(() => {
    let out = rows.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.clubName?.toLowerCase().includes(q) &&
          !r.teamName?.toLowerCase().includes(q) &&
          !String(r.regNumber).includes(q)
        )
          return false;
      }
      if (filterDivision !== "all" && r.division !== filterDivision)
        return false;
      if (filterCountry !== "all" && r.country !== filterCountry) return false;
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (filterAccom === "confirmed" && !r.accomConfirmed) return false;
      if (filterAccom === "declined" && !r.accomDeclined) return false;
      if (
        filterAccom === "pending" &&
        (r.accomConfirmed || r.accomDeclined || (!r.accomPlayers && !r.accomStaff && !r.accomAccompanying))
      )
        return false;
      if (filterAccom === "none" && (r.accomPlayers || r.accomStaff || r.accomAccompanying))
        return false;
      return true;
    });

    out.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return out;
  }, [rows, search, filterDivision, filterCountry, filterStatus, filterAccom, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col)
      return <ChevronUp className="w-3 h-3 opacity-20 inline ml-0.5" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 inline ml-0.5 text-gold" />
    ) : (
      <ChevronDown className="w-3 h-3 inline ml-0.5 text-gold" />
    );
  }

  function toggleExtra(key: ExtraColKey) {
    setExtraCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // CSV Export
  function exportCsv() {
    const extraColList = EXTRA_COLS.filter((c) => extraCols.has(c.key));
    const headers = [
      t("overviewCsvRegNumber"),
      t("overviewCsvCountry"),
      t("overviewCsvClub"),
      t("overviewCsvTeam"),
      t("overviewCsvDivision"),
      t("overviewCsvStatus"),
      t("overviewCsvPlayers"),
      t("overviewCsvStaff"),
      t("overviewCsvAccompanying"),
      t("overviewCsvArrival"),
      t("overviewCsvDeparture"),
      t("overviewCsvAccomStatus"),
      t("overviewCsvAccomPlayers"),
      t("overviewCsvAccomStaff"),
      t("overviewCsvAccomAcc"),
      t("overviewCsvCheckIn"),
      t("overviewCsvCheckOut"),
      t("overviewCsvTransfer"),
      ...extraColList.map((c) => c.label),
    ];

    const csvRows = visible.map((r) => {
      const base = [
        r.regNumber,
        r.country ?? "",
        r.clubName ?? "",
        r.teamName,
        r.division ?? "",
        r.status,
        r.players,
        r.staff,
        r.accompanying,
        r.arrivalDate ? `${r.arrivalDate}${r.arrivalTime ? " " + r.arrivalTime : ""}` : "",
        r.departureDate ? `${r.departureDate}${r.departureTime ? " " + r.departureTime : ""}` : "",
        r.accomDeclined ? t("overviewDeclined") : r.accomConfirmed ? t("overviewConfirmed") : "—",
        r.accomPlayers ?? "",
        r.accomStaff ?? "",
        r.accomAccompanying ?? "",
        r.accomCheckIn ?? "",
        r.accomCheckOut ?? "",
        r.hasTransfer ? t("overviewYes") : t("overviewNo"),
      ];
      const extra = extraColList.map((c) => {
        const v = r[c.key as keyof OverviewRow];
        return v ?? "";
      });
      return [...base, ...extra];
    });

    const csv = [headers, ...csvRows]
      .map((row) =>
        row
          .map((cell) =>
            typeof cell === "string" && cell.includes(",")
              ? `"${cell.replace(/"/g, '""')}"`
              : cell
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `overview-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const Th = ({
    col,
    children,
    className = "",
  }: {
    col?: SortKey;
    children: React.ReactNode;
    className?: string;
  }) => (
    <th
      className={`px-2 py-2 text-left text-[11px] font-semibold text-white/70 uppercase tracking-wide whitespace-nowrap select-none ${col ? "cursor-pointer hover:text-white" : ""} ${className}`}
      onClick={col ? () => toggleSort(col) : undefined}
    >
      {children}
      {col && <SortIcon col={col} />}
    </th>
  );

  const activeExtraCols = EXTRA_COLS.filter((c) => extraCols.has(c.key));

  if (loading)
    return (
      <div className="p-8 text-center th-text-2">{t("overviewLoading")}</div>
    );
  if (error)
    return <div className="p-8 text-center text-error">{error}</div>;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold th-text">{t("overviewTitle")}</h1>
          <p className="text-sm th-text-2">
            {t("overviewTeamsCount", { visible: visible.length, total: rows.length })}
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 rounded-lg border th-border th-card px-3 py-2 text-sm font-medium hover:th-bg transition-colors"
        >
          <Download className="w-4 h-4" />
          {t("overviewExportCsv")}
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center th-card border th-border rounded-xl p-3">
        <Filter className="w-4 h-4 th-text-2 shrink-0" />
        <input
          type="search"
          placeholder={t("overviewSearchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border th-border rounded-lg px-3 py-1.5 text-sm min-w-[160px] focus:outline-none focus:ring-2 focus:ring-navy/30"
        />
        <select
          value={filterDivision}
          onChange={(e) => setFilterDivision(e.target.value)}
          className="border th-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 th-card"
        >
          <option value="all">{t("overviewAllDivisions")}</option>
          {divisions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          value={filterCountry}
          onChange={(e) => setFilterCountry(e.target.value)}
          className="border th-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 th-card"
        >
          <option value="all">{t("overviewAllCountries")}</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {countryToFlag(c)} {c}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border th-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 th-card"
        >
          <option value="all">{t("overviewAllStatuses")}</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={filterAccom}
          onChange={(e) => setFilterAccom(e.target.value)}
          className="border th-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30 th-card"
        >
          <option value="all">{t("overviewAllAccom")}</option>
          <option value="confirmed">{t("overviewAccomConfirmed")}</option>
          <option value="declined">{t("overviewAccomDeclined")}</option>
          <option value="pending">{t("overviewAccomPending")}</option>
          <option value="none">{t("overviewNoAccomRequest")}</option>
        </select>
        {(search || filterDivision !== "all" || filterCountry !== "all" || filterStatus !== "all" || filterAccom !== "all") && (
          <button
            onClick={() => {
              setSearch("");
              setFilterDivision("all");
              setFilterCountry("all");
              setFilterStatus("all");
              setFilterAccom("all");
            }}
            className="text-xs th-text-2 hover:text-error flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" /> {t("overviewClearFilters")}
          </button>
        )}
      </div>

      {/* Table wrapper */}
      <div className="relative rounded-xl overflow-hidden border th-border shadow-sm">
        {/* Column picker button */}
        <div className="absolute right-2 top-1 z-10">
          <div className="relative">
            <button
              onClick={() => setShowColPicker((v) => !v)}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                extraCols.size > 0
                  ? "bg-gold/20 text-gold"
                  : "bg-white/10 text-white/60 hover:text-white"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              {t("overviewColumns")} {extraCols.size > 0 && `(${extraCols.size})`}
            </button>
            {showColPicker && (
              <div className="absolute right-0 top-full mt-1 popup-bg border th-border rounded-xl shadow-lg p-2 z-20 min-w-[180px]">
                {EXTRA_COLS.map((c) => (
                  <label
                    key={c.key}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:th-bg cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={extraCols.has(c.key)}
                      onChange={() => toggleExtra(c.key)}
                      className="rounded"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-navy sticky top-0 z-[5]">
              <tr>
                <Th col="regNumber" className="pl-3">
                  #
                </Th>
                <Th>{t("overviewColFlag")}</Th>
                <Th col="clubName">{t("overviewColClub")}</Th>
                <Th col="teamName">{t("overviewColTeam")}</Th>
                <Th col="division">{t("overviewColDivision")}</Th>
                <Th col="status">{t("overviewColStatus")}</Th>
                <Th col="players">{t("overviewColPlayers")}</Th>
                <Th col="staff">{t("overviewColStaff")}</Th>
                <Th col="accompanying">{t("overviewColAcc")}</Th>
                <Th col="arrivalDate">{t("overviewColArrival")}</Th>
                <Th col="departureDate">{t("overviewColDeparture")}</Th>
                <Th>{t("overviewColAccom")}</Th>
                <Th col="accomPlayers">{t("overviewColAccomPlayers")}</Th>
                <Th col="accomStaff">{t("overviewColAccomStaff")}</Th>
                <Th col="accomAccompanying">{t("overviewColAccomAcc")}</Th>
                <Th col="accomCheckIn">{t("overviewColCheckIn")}</Th>
                <Th col="accomCheckOut">{t("overviewColCheckOut")}</Th>
                <Th col="hasTransfer">{t("overviewColTransfer")}</Th>
                {activeExtraCols.map((c) => (
                  <Th key={c.key} col={c.key as SortKey}>
                    {c.label}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td
                    colSpan={18 + activeExtraCols.length}
                    className="text-center py-12 th-text-2"
                  >
                    {t("overviewNoTeams")}
                  </td>
                </tr>
              )}
              {visible.map((row, i) => (
                <tr
                  key={row.id}
                  className={`border-b th-border last:border-0 hover:bg-navy/3 transition-colors ${
                    i % 2 === 0 ? "th-card" : "th-bg/50"
                  }`}
                >
                  {/* Reg # */}
                  <td className="px-2 py-1.5 pl-3 font-mono text-xs th-text-2 whitespace-nowrap">
                    {row.regNumber}
                  </td>
                  {/* Flag */}
                  <td className="px-2 py-1.5 text-base leading-none">
                    {countryToFlag(row.country)}
                  </td>
                  {/* Club */}
                  <td className="px-2 py-1.5 whitespace-nowrap max-w-[160px] truncate font-medium th-text">
                    {row.clubName ?? "—"}
                  </td>
                  {/* Team */}
                  <td className="px-2 py-1.5 whitespace-nowrap max-w-[140px] truncate th-text">
                    {row.teamName}
                  </td>
                  {/* Division */}
                  <td className="px-2 py-1.5 text-xs th-text-2 whitespace-nowrap">
                    {row.division ?? "—"}
                  </td>
                  {/* Status */}
                  <td className="px-2 py-1.5">
                    <StatusBadge status={row.status} />
                  </td>
                  {/* Players */}
                  <td className="px-2 py-1.5 text-center tabular-nums">
                    {row.players || <span className="th-text-2/40">0</span>}
                  </td>
                  {/* Staff */}
                  <td className="px-2 py-1.5 text-center tabular-nums">
                    {row.staff || <span className="th-text-2/40">0</span>}
                  </td>
                  {/* Accompanying */}
                  <td className="px-2 py-1.5 text-center tabular-nums">
                    {row.accompanying || <span className="th-text-2/40">0</span>}
                  </td>
                  {/* Arrival */}
                  <td className="px-2 py-1.5 text-xs whitespace-nowrap th-text-2">
                    {row.arrivalDate ? (
                      <span>
                        {row.arrivalDate}
                        {row.arrivalTime && (
                          <span className="th-text-2/60 ml-1">{row.arrivalTime}</span>
                        )}
                      </span>
                    ) : (
                      <Minus className="w-3 h-3 th-text-2/30 mx-auto" />
                    )}
                  </td>
                  {/* Departure */}
                  <td className="px-2 py-1.5 text-xs whitespace-nowrap th-text-2">
                    {row.departureDate ? (
                      <span>
                        {row.departureDate}
                        {row.departureTime && (
                          <span className="th-text-2/60 ml-1">{row.departureTime}</span>
                        )}
                      </span>
                    ) : (
                      <Minus className="w-3 h-3 th-text-2/30 mx-auto" />
                    )}
                  </td>
                  {/* Accom status */}
                  <td className="px-2 py-1.5 whitespace-nowrap">{accomStatus(row)}</td>
                  {/* Accom players */}
                  <td className="px-2 py-1.5 text-center tabular-nums text-xs">
                    {row.accomPlayers ?? <span className="th-text-2/30">—</span>}
                  </td>
                  {/* Accom staff */}
                  <td className="px-2 py-1.5 text-center tabular-nums text-xs">
                    {row.accomStaff ?? <span className="th-text-2/30">—</span>}
                  </td>
                  {/* Accom acc */}
                  <td className="px-2 py-1.5 text-center tabular-nums text-xs">
                    {row.accomAccompanying ?? <span className="th-text-2/30">—</span>}
                  </td>
                  {/* Check-in */}
                  <td className="px-2 py-1.5 text-xs th-text-2 whitespace-nowrap">
                    {row.accomCheckIn ?? <span className="th-text-2/30">—</span>}
                  </td>
                  {/* Check-out */}
                  <td className="px-2 py-1.5 text-xs th-text-2 whitespace-nowrap">
                    {row.accomCheckOut ?? <span className="th-text-2/30">—</span>}
                  </td>
                  {/* Transfer */}
                  <td className="px-2 py-1.5 text-center">
                    {row.hasTransfer ? (
                      <Check className="w-4 h-4 text-success mx-auto" />
                    ) : (
                      <X className="w-4 h-4 th-text-2/30 mx-auto" />
                    )}
                  </td>
                  {/* Extra columns */}
                  {activeExtraCols.map((c) => {
                    const val = row[c.key as keyof OverviewRow];
                    return (
                      <td
                        key={c.key}
                        className="px-2 py-1.5 text-xs th-text-2 whitespace-nowrap"
                      >
                        {c.key === "packageName" ? (
                          <span className="font-medium th-text">
                            {(val as string) ?? <span className="th-text-2/40">—</span>}
                            {c.key === "packageName" && row.packagePublished && (
                              <span className="ml-1 text-[9px] bg-success/15 text-success rounded px-1">
                                {t("overviewPub")}
                              </span>
                            )}
                          </span>
                        ) : (
                          fmt(val as number)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary footer */}
        {visible.length > 0 && (
          <div className="bg-navy/5 border-t th-border px-3 py-2 flex flex-wrap gap-4 text-xs th-text-2">
            <span>
              <strong className="th-text">{visible.reduce((s, r) => s + r.players, 0)}</strong> {t("overviewSummaryPlayers")}
            </span>
            <span>
              <strong className="th-text">{visible.reduce((s, r) => s + r.staff, 0)}</strong> {t("overviewSummaryStaff")}
            </span>
            <span>
              <strong className="th-text">{visible.reduce((s, r) => s + r.accompanying, 0)}</strong> {t("overviewSummaryAccompanying")}
            </span>
            <span>
              <strong className="th-text">{visible.filter((r) => r.hasTransfer).length}</strong> {t("overviewSummaryWithTransfer")}
            </span>
            <span>
              <strong className="th-text">{visible.filter((r) => r.accomConfirmed).length}</strong> {t("overviewSummaryAccomConfirmed")}
            </span>
            {extraCols.has("totalOrdered") && (
              <span>
                <strong className="th-text">
                  €{visible.reduce((s, r) => s + r.totalOrdered, 0).toLocaleString("en")}
                </strong>{" "}
                {t("overviewSummaryTotalOrdered")}
              </span>
            )}
            {extraCols.has("paid") && (
              <span>
                <strong className="th-text">
                  €{visible.reduce((s, r) => s + r.paid, 0).toLocaleString("en")}
                </strong>{" "}
                {t("overviewSummaryPaid")}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
