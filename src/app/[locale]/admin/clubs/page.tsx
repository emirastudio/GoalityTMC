"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, UserCheck, MapPin, Mail, Phone, Users, ClipboardList, ChevronDown, ChevronUp, Shield } from "lucide-react";

type ClubUser = { email: string; name: string | null; accessLevel: string };

type Club = {
  id: number;
  name: string;
  country: string | null;
  city: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  isVerified: boolean;
  onboardingComplete: boolean;
  createdAt: string;
  teamCount: number;
  regCount: number;
  users: ClubUser[];
};

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "name" | "regs">("date");

  useEffect(() => {
    fetch("/api/admin/platform/clubs")
      .then((r) => r.json())
      .then((d) => setClubs(d.clubs ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return clubs
      .filter((c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.country?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.contactEmail?.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "regs") return b.regCount - a.regCount;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [clubs, search, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold th-text flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-emerald-600" /> Clubs
          </h1>
          <p className="th-text-2 text-sm mt-0.5">{clubs.length} clubs total</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-sm border th-border rounded-lg px-3 py-2 th-card th-text"
          >
            <option value="date">Newest first</option>
            <option value="name">A–Z</option>
            <option value="regs">Most registrations</option>
          </select>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 th-text-2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clubs…"
              className="pl-9 pr-4 py-2 text-sm border th-border rounded-lg th-card th-text w-56"
            />
          </div>
        </div>
      </div>

      {loading && <p className="th-text-2 text-sm text-center py-12">Loading…</p>}

      {!loading && (
        <div className="th-card rounded-xl border th-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b th-border text-left">
                <th className="px-5 py-3 text-xs font-medium th-text-2 uppercase">Club</th>
                <th className="px-5 py-3 text-xs font-medium th-text-2 uppercase">Location</th>
                <th className="px-5 py-3 text-xs font-medium th-text-2 uppercase">Contact</th>
                <th className="px-5 py-3 text-xs font-medium th-text-2 uppercase text-center">Teams</th>
                <th className="px-5 py-3 text-xs font-medium th-text-2 uppercase text-center">Regs</th>
                <th className="px-5 py-3 text-xs font-medium th-text-2 uppercase text-center">Accounts</th>
                <th className="px-5 py-3 text-xs font-medium th-text-2 uppercase">Joined</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-12 text-center th-text-2">No clubs found</td></tr>
              )}
              {filtered.map((club) => (
                <>
                  <tr
                    key={club.id}
                    className="border-b th-border last:border-0 hover:bg-navy/5 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === club.id ? null : club.id)}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <p className="font-medium th-text">{club.name}</p>
                        {club.isVerified && <span title="Verified"><Shield className="w-3.5 h-3.5 text-emerald-500" /></span>}
                      </div>
                      {!club.onboardingComplete && (
                        <span className="text-[10px] text-amber-600 font-medium">onboarding incomplete</span>
                      )}
                    </td>
                    <td className="px-5 py-3 th-text-2">
                      {[club.country, club.city].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td className="px-5 py-3">
                      {club.contactName && <p className="th-text text-xs font-medium">{club.contactName}</p>}
                      {club.contactEmail && (
                        <a href={`mailto:${club.contactEmail}`} className="text-xs text-navy hover:underline flex items-center gap-1">
                          <Mail className="w-3 h-3" />{club.contactEmail}
                        </a>
                      )}
                      {club.contactPhone && (
                        <p className="text-xs th-text-2 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />{club.contactPhone}
                        </p>
                      )}
                      {!club.contactEmail && !club.contactPhone && <span className="th-text-2">—</span>}
                    </td>
                    <td className="px-5 py-3 text-center font-medium th-text">{club.teamCount}</td>
                    <td className="px-5 py-3 text-center font-medium th-text">{club.regCount}</td>
                    <td className="px-5 py-3 text-center">
                      {club.users.length === 0 ? (
                        <span className="text-xs text-red-500 font-medium">No users</span>
                      ) : (
                        <span className="text-xs th-text-2">{club.users.length}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 th-text-2 text-xs">{fmtDate(club.createdAt)}</td>
                    <td className="px-5 py-3">
                      {expandedId === club.id
                        ? <ChevronUp className="w-4 h-4 th-text-2" />
                        : <ChevronDown className="w-4 h-4 th-text-2" />
                      }
                    </td>
                  </tr>
                  {expandedId === club.id && (
                    <tr key={`${club.id}-exp`} className="bg-navy/5 border-b th-border">
                      <td colSpan={8} className="px-8 py-4">
                        <p className="text-xs font-semibold th-text-2 uppercase mb-2">Registered Accounts (club_users)</p>
                        {club.users.length === 0 ? (
                          <p className="text-sm th-text-2 italic">No accounts — club cannot log in</p>
                        ) : (
                          <div className="flex flex-wrap gap-3">
                            {club.users.map((u, i) => (
                              <div key={i} className="bg-white rounded-lg border th-border px-3 py-2 text-xs">
                                <p className="font-medium th-text">{u.name ?? "—"}</p>
                                <p className="th-text-2">{u.email}</p>
                                <p className="text-[10px] text-navy mt-0.5">{u.accessLevel}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
