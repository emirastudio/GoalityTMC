"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { PublicNavHeader } from "@/components/ui/public-nav-header";
import {
  Trophy, Zap, CheckCircle, ArrowRight, Sparkles, Play,
  Calendar, Users, BarChart3, Shield, Hotel, CreditCard,
  Mail, FileText, Clock, Activity, Star, Layers, Settings,
  Radio, Eye, Target, Package, MapPin, ChevronRight,
} from "lucide-react";

/* ─── Section header ─── */
function SectionHeader({ eyebrow, title, highlight, desc }: {
  eyebrow: string; title: string; highlight?: string; desc?: string;
}) {
  return (
    <div className="text-center mb-14">
      <p className="text-[11px] font-black uppercase tracking-widest mb-3"
        style={{ color: "var(--cat-accent)" }}>
        {eyebrow}
      </p>
      <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4"
        style={{ color: "var(--cat-text)" }}>
        {title}{" "}
        {highlight && (
          <span style={{
            background: "linear-gradient(90deg, #2BFEBA, #00E5FF)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>{highlight}</span>
        )}
      </h2>
      {desc && (
        <p className="text-[15px] max-w-2xl mx-auto leading-relaxed"
          style={{ color: "var(--cat-text-secondary)" }}>
          {desc}
        </p>
      )}
    </div>
  );
}

/* ─── Feature card ─── */
function FeatureCard({ icon: Icon, color, title, desc }: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string; title: string; desc: string;
}) {
  return (
    <div className="rounded-2xl p-6 border transition-all hover:-translate-y-0.5"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
        style={{ background: color + "18" }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <h3 className="text-[14px] font-bold mb-2" style={{ color: "var(--cat-text)" }}>{title}</h3>
      <p className="text-[13px] leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>{desc}</p>
    </div>
  );
}

/* ─── Check item ─── */
function CheckItem({ children, color = "var(--cat-accent)" }: { children: React.ReactNode; color?: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color }} />
      <span className="text-[13px] leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>{children}</span>
    </li>
  );
}

/* ─── Format mockup ─── */
function FormatMockup({ t }: { t: ReturnType<typeof useTranslations<"features">> }) {
  const formats = [
    { name: t("mockFormat1Name"), tags: t.raw("mockFormat1Tags") as string[], color: "#2BFEBA", desc: t("mockFormat1Desc") },
    { name: t("mockFormat2Name"), tags: t.raw("mockFormat2Tags") as string[], color: "#8B5CF6", desc: t("mockFormat2Desc") },
    { name: t("mockFormat3Name"), tags: t.raw("mockFormat3Tags") as string[], color: "#F59E0B", desc: t("mockFormat3Desc") },
    { name: t("mockFormat4Name"), tags: t.raw("mockFormat4Tags") as string[], color: "#EF4444", desc: t("mockFormat4Desc") },
    { name: t("mockFormat5Name"), tags: t.raw("mockFormat5Tags") as string[], color: "#FBBF24", badge: "Elite", desc: t("mockFormat5Desc") },
    { name: t("mockFormat6Name"), tags: t.raw("mockFormat6Tags") as string[], color: "#2BFEBA", badge: t("mockFormatBadgeNew"), desc: t("mockFormat6Desc") },
  ];

  const mockPlayoffName = t("mockFormat1Name");
  const mockRoundRobinName = t("mockFormat2Name");
  const mockGroupsOnlyName = t("mockFormat3Name");
  const mockPlayoffOnlyName = t("mockFormat4Name");
  const mockEliteName = t("mockFormat5Name");
  const mockCustomName = t("mockFormat6Name");

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
      {/* Mockup header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b"
        style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-divider)" }}>
        <div className="w-3 h-3 rounded-full bg-red-500 opacity-60" />
        <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-60" />
        <div className="w-3 h-3 rounded-full bg-green-500 opacity-60" />
        <span className="ml-3 text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
          {t("mockFormatBuilder")}
        </span>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {formats.map(f => (
            <div key={f.name}
              className="relative rounded-xl p-4 border"
              style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)" }}>
              {f.badge && (
                <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[9px] font-black"
                  style={{
                    background: f.badge === "Elite"
                      ? "linear-gradient(90deg, #FBBF24, #F59E0B)"
                      : "linear-gradient(90deg, #2BFEBA, #00D98F)",
                    color: "#0A0E14",
                  }}>
                  {f.badge === "Elite" ? "⭐ Elite" : f.badge}
                </div>
              )}
              {/* Schematic graph */}
              <div className="h-16 flex items-center justify-center mb-3 opacity-60">
                <svg viewBox="0 0 80 50" className="w-20 h-12" fill="none">
                  {f.name === mockPlayoffName && (
                    <>
                      <rect x="2" y="4" width="18" height="6" rx="2" fill={f.color} opacity="0.5"/>
                      <rect x="2" y="14" width="18" height="6" rx="2" fill={f.color} opacity="0.4"/>
                      <rect x="2" y="24" width="18" height="6" rx="2" fill="#F59E0B" opacity="0.5"/>
                      <rect x="2" y="34" width="18" height="6" rx="2" fill="#F59E0B" opacity="0.4"/>
                      <line x1="20" y1="10" x2="32" y2="17" stroke={f.color} strokeWidth="1" opacity="0.5"/>
                      <line x1="20" y1="27" x2="32" y2="22" stroke="#F59E0B" strokeWidth="1" opacity="0.5"/>
                      <rect x="32" y="14" width="16" height="8" rx="2" fill={f.color} opacity="0.6"/>
                      <line x1="48" y1="18" x2="58" y2="18" stroke={f.color} strokeWidth="1" opacity="0.5"/>
                      <rect x="58" y="13" width="18" height="10" rx="3" fill={f.color} opacity="0.8" stroke={f.color} strokeWidth="0.5"/>
                      <text x="67" y="20" textAnchor="middle" fill="white" fontSize="4" fontWeight="bold">FINAL</text>
                    </>
                  )}
                  {f.name === mockRoundRobinName && (
                    <>
                      {[0,1,2,3,4,5].map(i => {
                        const angle = (i * 60 - 90) * Math.PI / 180;
                        const x = 40 + 20 * Math.cos(angle);
                        const y = 25 + 20 * Math.sin(angle);
                        return <circle key={i} cx={x} cy={y} r="4" fill={f.color} opacity="0.6"/>;
                      })}
                      {[0,1,2,3,4,5].map(i => [0,1,2,3,4,5].map(j => {
                        if (i >= j) return null;
                        const a1 = (i * 60 - 90) * Math.PI / 180;
                        const a2 = (j * 60 - 90) * Math.PI / 180;
                        return <line key={`${i}-${j}`} x1={40+20*Math.cos(a1)} y1={25+20*Math.sin(a1)} x2={40+20*Math.cos(a2)} y2={25+20*Math.sin(a2)} stroke={f.color} strokeWidth="0.5" opacity="0.25"/>;
                      }))}
                    </>
                  )}
                  {f.name === mockGroupsOnlyName && (
                    <>
                      {["#2BFEBA","#F59E0B","#3B82F6","#EF4444"].map((c, i) => (
                        <g key={i}>
                          <rect x={2 + i * 20} y="5" width="14" height="5" rx="1.5" fill={c} opacity="0.6"/>
                          <rect x={2 + i * 20} y="13" width="14" height="5" rx="1.5" fill={c} opacity="0.5"/>
                          <rect x={2 + i * 20} y="21" width="14" height="5" rx="1.5" fill={c} opacity="0.4"/>
                          <rect x={2 + i * 20} y="29" width="14" height="5" rx="1.5" fill={c} opacity="0.3"/>
                        </g>
                      ))}
                    </>
                  )}
                  {f.name === mockPlayoffOnlyName && (
                    <>
                      {[0,1,2,3].map(i => <rect key={i} x="2" y={5 + i * 12} width="16" height="8" rx="2" fill={f.color} opacity="0.4"/>)}
                      {[0,1].map(i => <rect key={i} x="28" y={11 + i * 24} width="16" height="8" rx="2" fill={f.color} opacity="0.55"/>)}
                      <rect x="52" y="23" width="16" height="8" rx="2" fill={f.color} opacity="0.7"/>
                      {[0,1,2,3].map(i => <line key={i} x1="18" y1={9 + i*12} x2="28" y2={i < 2 ? 15 : 35} stroke={f.color} strokeWidth="0.8" opacity="0.35"/>)}
                      <line x1="44" y1="15" x2="52" y2="27" stroke={f.color} strokeWidth="0.8" opacity="0.4"/>
                      <line x1="44" y1="35" x2="52" y2="27" stroke={f.color} strokeWidth="0.8" opacity="0.4"/>
                      <text x="60" y="29" textAnchor="middle" fill="white" fontSize="3.5" fontWeight="bold">FINAL</text>
                    </>
                  )}
                  {f.name === mockEliteName && (
                    <>
                      <circle cx="40" cy="25" r="14" fill="none" stroke={f.color} strokeWidth="0.8" opacity="0.3"/>
                      <text x="40" y="22" textAnchor="middle" fill={f.color} fontSize="4" opacity="0.6">{t("mockLiga")}</text>
                      {[0,1,2,3,4,5,6].map(i => {
                        const angle = (i * 51.4 - 90) * Math.PI / 180;
                        const x = 40 + 14 * Math.cos(angle);
                        const y = 25 + 14 * Math.sin(angle);
                        return <circle key={i} cx={x} cy={y} r="3" fill={f.color} opacity="0.55"/>;
                      })}
                    </>
                  )}
                  {f.name === mockCustomName && (
                    <>
                      {[0,1,2,3].map(i => <rect key={i} x={2+i*18} y="5" width="12" height="20" rx="2" fill={i===1?"#F59E0B":i===2?"#3B82F6":f.color} opacity="0.5"/>)}
                      <rect x="20" y="30" width="10" height="8" rx="2" fill="#F59E0B" opacity="0.7"/>
                      <rect x="34" y="30" width="10" height="8" rx="2" fill="#3B82F6" opacity="0.7"/>
                      <rect x="48" y="30" width="10" height="8" rx="2" fill={f.color} opacity="0.7"/>
                      <text x="4" y="38" fill="white" fontSize="3" opacity="0.4">G</text>
                      <text x="22" y="38" fill="white" fontSize="3" opacity="0.4">S</text>
                      <text x="36" y="38" fill="white" fontSize="3" opacity="0.4">B</text>
                    </>
                  )}
                </svg>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {f.tags.map(tag => (
                  <span key={tag}
                    className="text-[8px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                    style={{ background: f.color + "20", color: f.color, border: `1px solid ${f.color}30` }}>
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-[11px] font-bold mb-1" style={{ color: "var(--cat-text)" }}>{f.name}</p>
              <p className="text-[10px] leading-snug" style={{ color: "var(--cat-text-muted)" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Match hub mockup ─── */
function MatchHubMockup({ t }: { t: ReturnType<typeof useTranslations<"features">> }) {
  const liveMatches = [
    { home: "FK Valmiera U14", away: "FK Žalgiris U12", score: "2 : 5", time: "49:36", group: `${t("mockHubGroupLabel")} D` },
    { home: "FC Flora U14",    away: "FK Valmiera U14", score: "0 : 2", time: "23:28", group: t("mockFormat1Name").split(" ")[2] ?? "PO" },
  ];
  const upcoming = [
    { time: "17:49", home: "FC Infonet U11", away: "FC Pärnu U11",     stage: t("mockFormat1Name") },
    { time: "17:49", home: "FK Valmiera U14", away: "HJK U12",         stage: t("mockFormat1Name") },
    { time: "18:49", home: "FK RFS U12",     away: "FC Levadia U11",   stage: t("mockFormat1Name") },
  ];

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center gap-3"
        style={{ borderColor: "var(--cat-divider)", background: "var(--cat-tag-bg)" }}>
        <div className="flex items-center gap-1.5">
          <Radio className="w-4 h-4 text-red-400" />
          <span className="text-[13px] font-black" style={{ color: "var(--cat-text)" }}>{t("mockHubTitle")}</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black"
          style={{ background: "rgba(239,68,68,0.15)", color: "#F87171", border: "1px solid rgba(239,68,68,0.3)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> 2 LIVE
        </div>
      </div>

      {/* Stat pills */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto" style={{ borderBottom: "1px solid var(--cat-divider)" }}>
        {[
          { icon: Zap,         label: `2 ${t("mockHubLive")}`,           color: "#EF4444" },
          { icon: Clock,       label: `6 ${t("mockHubSoon")}`,           color: "#F59E0B" },
          { icon: CheckCircle, label: `24/32 ${t("mockHubCompleted")}`,  color: "#2BFEBA" },
          { icon: Target,      label: `0 ${t("mockHubGoals")}`,          color: "var(--cat-text-muted)" },
        ].map(s => (
          <div key={s.label}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold shrink-0"
            style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-card-border)", color: "var(--cat-text-secondary)" }}>
            <s.icon className="w-3 h-3" style={{ color: s.color }} />
            {s.label}
          </div>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {/* Live matches */}
        <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 text-red-400">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> {t("mockHubNowLive")} (2)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {liveMatches.map((m, i) => (
            <div key={i} className="rounded-xl p-3 border"
              style={{ background: "rgba(239,68,68,0.05)", borderColor: "rgba(239,68,68,0.25)" }}>
              <div className="flex items-center justify-between text-[9px] mb-2">
                <div className="flex items-center gap-1 text-red-400 font-black">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> LIVE · {m.group}
                </div>
                <span className="text-red-400 font-mono font-bold">{m.time}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold truncate flex-1" style={{ color: "var(--cat-text)" }}>{m.home}</span>
                <span className="text-[15px] font-black px-2 py-0.5 rounded-lg shrink-0"
                  style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)" }}>{m.score}</span>
                <span className="text-[11px] font-bold truncate flex-1 text-right" style={{ color: "var(--cat-text)" }}>{m.away}</span>
              </div>
              <div className="flex gap-2 mt-2">
                <button className="flex-1 text-[9px] font-bold py-1.5 rounded-lg"
                  style={{ background: "rgba(43,254,186,0.15)", color: "#2BFEBA", border: "1px solid rgba(43,254,186,0.2)" }}>
                  {t("mockHubAddGoal")}
                </button>
                <button className="flex-1 text-[9px] font-bold py-1.5 rounded-lg"
                  style={{ background: "rgba(239,68,68,0.15)", color: "#F87171", border: "1px solid rgba(239,68,68,0.25)" }}>
                  {t("mockHubFinish")}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Upcoming */}
        <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400 mt-1 flex items-center gap-1.5">
          <Clock className="w-3 h-3" /> {t("mockHubUpcoming")} (6)
        </p>
        <div className="space-y-1.5">
          {upcoming.map((m, i) => (
            <div key={i}
              className="flex items-center gap-3 px-3 py-2 rounded-xl"
              style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-card-border)" }}>
              <span className="text-[11px] font-mono shrink-0" style={{ color: "var(--cat-text-muted)" }}>{m.time}</span>
              <span className="text-[11px] font-semibold flex-1 truncate" style={{ color: "var(--cat-text)" }}>{m.home}</span>
              <span className="text-[10px]" style={{ color: "var(--cat-text-faint)" }}>vs</span>
              <span className="text-[11px] font-semibold flex-1 truncate text-right" style={{ color: "var(--cat-text)" }}>{m.away}</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full shrink-0"
                style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)" }}>{m.stage}</span>
              <button className="text-[9px] font-black px-2.5 py-1 rounded-lg shrink-0"
                style={{ background: "var(--cat-pill-active-bg)", color: "var(--cat-accent)" }}>{t("mockHubGoNow")}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Live protocol mockup ─── */
function LiveProtocolMockup({ t }: { t: ReturnType<typeof useTranslations<"features">> }) {
  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
      {/* Match hero */}
      <div className="p-4 border-b" style={{ borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.04)" }}>
        <div className="flex items-center justify-between text-[10px] mb-3">
          <div className="flex items-center gap-1.5 text-red-400 font-black">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> LIVE 0&apos;
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)" }}>{t("mockProtocolGroupStage")}</span>
            <span className="text-[9px]" style={{ color: "var(--cat-text-faint)" }}>Group D · #21</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-center">
            <div className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center text-lg font-black"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>F</div>
            <p className="text-[12px] font-black" style={{ color: "var(--cat-text)" }}>FK Valmiera U14</p>
            <div className="flex justify-center gap-1 mt-1">
              {["W","D","W"].map((r,i) => (
                <span key={i} className="w-4 h-4 rounded text-[7px] font-black flex items-center justify-center"
                  style={{ background: r === "W" ? "rgba(43,254,186,0.25)" : "var(--cat-tag-bg)", color: r === "W" ? "#2BFEBA" : "var(--cat-text-muted)" }}>
                  {r}
                </span>
              ))}
            </div>
          </div>
          <div className="px-4 py-2 rounded-xl text-3xl font-black"
            style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)" }}>
            2 : 5
          </div>
          <div className="flex-1 text-center">
            <div className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center text-lg font-black"
              style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>F</div>
            <p className="text-[12px] font-black" style={{ color: "var(--cat-text)" }}>FK Žalgiris U12</p>
            <div className="flex justify-center gap-1 mt-1">
              <span className="w-4 h-4 rounded text-[7px] font-black flex items-center justify-center"
                style={{ background: "rgba(239,68,68,0.2)", color: "#F87171" }}>L</span>
            </div>
          </div>
        </div>
      </div>

      {/* Match control */}
      <div className="p-4 border-b" style={{ borderColor: "var(--cat-divider)" }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--cat-text-muted)" }}>
            {t("mockProtocolMatchControl")}
          </p>
          <div className="flex items-center gap-1 text-[9px] text-red-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> LIVE
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: t("mockProtocolStartMatch"), color: "rgba(43,254,186,0.08)", text: "var(--cat-text-faint)", disabled: true },
            { label: t("mockProtocolEndMatch"),   color: "rgba(239,68,68,0.15)",  text: "#F87171",              disabled: false },
            { label: t("mockProtocolReopen"),     color: "var(--cat-tag-bg)",      text: "var(--cat-text-faint)", disabled: true },
            { label: t("mockProtocolResetTime"),  color: "var(--cat-tag-bg)",      text: "var(--cat-text-muted)", disabled: false },
          ].map((btn, i) => (
            <div key={i} className="rounded-xl py-3 text-center text-[11px] font-bold cursor-pointer"
              style={{ background: btn.color, color: btn.text, border: `1px solid ${btn.disabled ? "var(--cat-divider)" : "rgba(239,68,68,0.2)"}` }}>
              {btn.label}
            </div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 text-[10px] font-black" style={{ color: "var(--cat-text-muted)" }}>
            <Zap className="w-3 h-3 text-yellow-400" /> {t("mockProtocolTimeline")}
            <span className="ml-1 w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            <span className="text-red-400">LIVE</span>
          </div>
          <span className="text-[10px]" style={{ color: "var(--cat-text-faint)" }}>0 {t("mockProtocolEvents")}</span>
        </div>
        <div className="relative h-10">
          <div className="absolute inset-y-0 left-0 right-0 flex items-center">
            <div className="w-full h-1 rounded-full"
              style={{ background: "linear-gradient(90deg, #10b981, #3b82f6, #8b5cf6, #ef4444)", opacity: 0.4 }} />
          </div>
          {/* Pulsing cursor */}
          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-red-500 flex items-center justify-center"
            style={{ background: "#ef4444", boxShadow: "0 0 12px rgba(239,68,68,0.6)" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          </div>
          {/* Minute markers */}
          {[0, 45, 90, 120].map(min => (
            <div key={min}
              className="absolute top-full mt-1 text-[8px] -translate-x-1/2"
              style={{ left: `${(min / 120) * 100}%`, color: "var(--cat-text-faint)" }}>
              {min}&apos;
            </div>
          ))}
          {/* Separators */}
          {[45, 90].map(min => (
            <div key={min}
              className="absolute top-0 bottom-0 w-px"
              style={{ left: `${(min / 120) * 100}%`, background: "var(--cat-divider)" }} />
          ))}
        </div>
        <div className="flex justify-between mt-6 text-[8px]" style={{ color: "var(--cat-text-faint)" }}>
          <span>{t("mockProtocolHome")}</span>
          <span>{t("mockProtocolAway")}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Main features page ─── */
export default function FeaturesPage() {
  const t = useTranslations("features");

  return (
    <ThemeProvider defaultTheme="dark">
      <div className="min-h-screen overflow-x-hidden" style={{ background: "var(--cat-bg)" }}>
        <PublicNavHeader />

        {/* HERO */}
        <section className="relative overflow-hidden pt-24 pb-16 px-6">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] opacity-[0.07]"
              style={{ background: "radial-gradient(ellipse, #2BFEBA, transparent 65%)" }} />
          </div>
          <div className="relative max-w-[1200px] mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 border"
              style={{ background: "var(--cat-badge-open-bg)", borderColor: "var(--cat-badge-open-border)" }}>
              <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
              <span className="text-[11px] font-black uppercase tracking-widest"
                style={{ color: "var(--cat-accent)" }}>
                {t("badgeLabel")}
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.95] mb-6">
              <span style={{ color: "var(--cat-text)" }}>{t("heroHeading1")}</span><br />
              <span style={{
                background: "linear-gradient(90deg, #2BFEBA, #00E5FF, #8B5CF6)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>{t("heroHeading2")}</span>
            </h1>
            <p className="text-[16px] max-w-2xl mx-auto leading-relaxed mb-10"
              style={{ color: "var(--cat-text-secondary)" }}>
              {t("heroSubtitle")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/onboarding"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-[15px] font-black transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(90deg, #2BFEBA, #00D98F)", color: "#0A0E14", boxShadow: "0 8px 30px rgba(43,254,186,0.3)" }}>
                {t("heroCta")} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/catalog"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-[15px] font-semibold border transition-all hover:opacity-80"
                style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}>
                <Eye className="w-4 h-4" style={{ color: "var(--cat-accent)" }} /> {t("heroViewCatalog")}
              </Link>
            </div>
          </div>
        </section>

        {/* 1. FORMAT BUILDER */}
        <section className="max-w-[1200px] mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6 border"
                style={{ background: "rgba(139,92,246,0.12)", borderColor: "rgba(139,92,246,0.25)" }}>
                <Layers className="w-3.5 h-3.5" style={{ color: "#8B5CF6" }} />
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#8B5CF6" }}>
                  {t("formatsBadge")}
                </span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight" style={{ color: "var(--cat-text)" }}>
                {t("formatsHeading")}<br />
                <span style={{ color: "#8B5CF6" }}>{t("formatsHeadingHighlight")}</span>
              </h2>
              <p className="text-[15px] leading-relaxed mb-6" style={{ color: "var(--cat-text-secondary)" }}>
                {t("formatsDesc")}
              </p>
              <ul className="space-y-3 mb-8">
                <CheckItem>{t("formatsCheck1")}</CheckItem>
                <CheckItem>{t("formatsCheck2")}</CheckItem>
                <CheckItem>{t("formatsCheck3")}</CheckItem>
                <CheckItem>{t("formatsCheck4")}</CheckItem>
                <CheckItem>{t("formatsCheck5")}</CheckItem>
                <CheckItem>{t("formatsCheck6")}</CheckItem>
              </ul>
              <Link href="/pricing"
                className="inline-flex items-center gap-2 text-[13px] font-bold transition-opacity hover:opacity-80"
                style={{ color: "var(--cat-accent)" }}>
                {t("formatsElitePlan")}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <FormatMockup t={t} />
          </div>
        </section>

        {/* 2. MATCH HUB */}
        <section className="py-20 px-6" style={{ background: "var(--cat-card-bg)", borderTop: "1px solid var(--cat-divider)", borderBottom: "1px solid var(--cat-divider)" }}>
          <div className="max-w-[1200px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
              <MatchHubMockup t={t} />
              <div>
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6 border"
                  style={{ background: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.25)" }}>
                  <Radio className="w-3.5 h-3.5" style={{ color: "#EF4444" }} />
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#EF4444" }}>
                    {t("hubBadge")}
                  </span>
                </div>
                <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight" style={{ color: "var(--cat-text)" }}>
                  {t("hubHeading")}<br />
                  <span style={{ color: "#EF4444" }}>{t("hubHeadingHighlight")}</span>
                </h2>
                <p className="text-[15px] leading-relaxed mb-6" style={{ color: "var(--cat-text-secondary)" }}>
                  {t("hubDesc")}
                </p>
                <ul className="space-y-3 mb-8">
                  <CheckItem color="#EF4444">{t("hubCheck1")}</CheckItem>
                  <CheckItem color="#EF4444">{t("hubCheck2")}</CheckItem>
                  <CheckItem color="#EF4444">{t("hubCheck3")}</CheckItem>
                  <CheckItem color="#EF4444">{t("hubCheck4")}</CheckItem>
                  <CheckItem color="#EF4444">{t("hubCheck5")}</CheckItem>
                  <CheckItem color="#EF4444">{t("hubCheck6")}</CheckItem>
                </ul>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
                  style={{ background: "rgba(239,68,68,0.08)", color: "#F87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                  {t("hubPlan")}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. LIVE PROTOCOL */}
        <section className="max-w-[1200px] mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6 border"
                style={{ background: "rgba(43,254,186,0.12)", borderColor: "rgba(43,254,186,0.25)" }}>
                <Activity className="w-3.5 h-3.5" style={{ color: "#2BFEBA" }} />
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#2BFEBA" }}>
                  {t("protocolBadge")}
                </span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight" style={{ color: "var(--cat-text)" }}>
                {t("protocolHeading")}<br />
                <span style={{ color: "#2BFEBA" }}>{t("protocolHeadingHighlight")}</span>
              </h2>
              <p className="text-[15px] leading-relaxed mb-6" style={{ color: "var(--cat-text-secondary)" }}>
                {t("protocolDesc")}
              </p>
              <ul className="space-y-3 mb-8">
                <CheckItem>{t("protocolCheck1")}</CheckItem>
                <CheckItem>{t("protocolCheck2")}</CheckItem>
                <CheckItem>{t("protocolCheck3")}</CheckItem>
                <CheckItem>{t("protocolCheck4")}</CheckItem>
                <CheckItem>{t("protocolCheck5")}</CheckItem>
                <CheckItem>{t("protocolCheck6")}</CheckItem>
              </ul>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold"
                style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)", border: "1px solid var(--cat-badge-open-border)" }}>
                {t("protocolPlan")}
              </div>
            </div>
            <LiveProtocolMockup t={t} />
          </div>
        </section>

        {/* 4. LIFECYCLE */}
        <section className="py-20 px-6" style={{ background: "var(--cat-card-bg)", borderTop: "1px solid var(--cat-divider)", borderBottom: "1px solid var(--cat-divider)" }}>
          <div className="max-w-[1200px] mx-auto">
            <SectionHeader
              eyebrow={t("lifecycleEyebrow")}
              title={t("lifecycleTitle")}
              highlight={t("lifecycleTitleHighlight")}
              desc={t("lifecycleDesc")}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
              {[
                {
                  label: t("phase1Label"),
                  color: "#3B82F6",
                  icon: FileText,
                  items: [t("phase1Item1"), t("phase1Item2"), t("phase1Item3"), t("phase1Item4"), t("phase1Item5")],
                },
                {
                  label: t("phase2Label"),
                  color: "#2BFEBA",
                  icon: Play,
                  items: [t("phase2Item1"), t("phase2Item2"), t("phase2Item3"), t("phase2Item4"), t("phase2Item5")],
                },
                {
                  label: t("phase3Label"),
                  color: "#F59E0B",
                  icon: Trophy,
                  items: [t("phase3Item1"), t("phase3Item2"), t("phase3Item3"), t("phase3Item4"), t("phase3Item5")],
                },
              ].map(phase => (
                <div key={phase.label}
                  className="rounded-2xl p-6 border"
                  style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)" }}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: phase.color + "18" }}>
                      <phase.icon className="w-5 h-5" style={{ color: phase.color }} />
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-wider" style={{ color: phase.color }}>
                      {phase.label}
                    </p>
                  </div>
                  <ul className="space-y-2.5">
                    {phase.items.map(item => (
                      <li key={item} className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: phase.color }} />
                        <span className="text-[12px]" style={{ color: "var(--cat-text-secondary)" }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. SERVICES */}
        <section className="max-w-[1200px] mx-auto px-6 py-20">
          <SectionHeader
            eyebrow={t("servicesEyebrow")}
            title={t("servicesTitle")}
            highlight={t("servicesTitleHighlight")}
            desc={t("servicesDesc")}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {[
              { icon: MapPin,    color: "#3B82F6",  title: t("serviceFieldsTitle"),         desc: t("serviceFieldsDesc") },
              { icon: Hotel,     color: "#8B5CF6",  title: t("serviceAccommodationTitle"),  desc: t("serviceAccommodationDesc") },
              { icon: Package,   color: "#F59E0B",  title: t("serviceServicesTitle"),       desc: t("serviceServicesDesc") },
              { icon: CreditCard,color: "#2BFEBA",  title: t("serviceFinanceTitle"),        desc: t("serviceFinanceDesc") },
            ].map(item => (
              <FeatureCard key={item.title} {...item} />
            ))}
          </div>

          {/* Communication */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: Mail,    color: "#6366F1", title: t("serviceCommunicationTitle"), desc: t("serviceCommunicationDesc") },
              { icon: FileText,color: "#2BFEBA", title: t("serviceDocumentsTitle"),     desc: t("serviceDocumentsDesc") },
              { icon: Shield,  color: "#F59E0B", title: t("serviceRegistrationTitle"),  desc: t("serviceRegistrationDesc") },
            ].map(item => (
              <FeatureCard key={item.title} {...item} />
            ))}
          </div>
        </section>

        {/* 6. UNIQUENESS */}
        <section className="py-20 px-6" style={{ background: "var(--cat-card-bg)", borderTop: "1px solid var(--cat-divider)", borderBottom: "1px solid var(--cat-divider)" }}>
          <div className="max-w-[1200px] mx-auto">
            <SectionHeader
              eyebrow={t("uniqueEyebrow")}
              title={t("uniqueTitle")}
              highlight={t("uniqueTitleHighlight")}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { icon: Star,     color: "#F59E0B", title: t("unique1Title"), desc: t("unique1Desc") },
                { icon: Zap,      color: "#2BFEBA", title: t("unique2Title"), desc: t("unique2Desc") },
                { icon: Users,    color: "#3B82F6", title: t("unique3Title"), desc: t("unique3Desc") },
                { icon: Activity, color: "#EF4444", title: t("unique4Title"), desc: t("unique4Desc") },
                { icon: Settings, color: "#8B5CF6", title: t("unique5Title"), desc: t("unique5Desc") },
                { icon: Target,   color: "#10B981", title: t("unique6Title"), desc: t("unique6Desc") },
              ].map(item => (
                <div key={item.title}
                  className="flex items-start gap-5 p-6 rounded-2xl border"
                  style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)" }}>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: item.color + "18" }}>
                    <item.icon className="w-6 h-6" style={{ color: item.color }} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-black mb-2" style={{ color: "var(--cat-text)" }}>{item.title}</h3>
                    <p className="text-[13px] leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-[1200px] mx-auto px-6 py-24">
          <div className="relative rounded-2xl overflow-hidden p-12 text-center border"
            style={{ background: "linear-gradient(135deg, rgba(43,254,186,0.07), rgba(0,0,0,0), rgba(139,92,246,0.05))", borderColor: "rgba(43,254,186,0.2)" }}>
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] opacity-[0.07]"
                style={{ background: "radial-gradient(ellipse, #2BFEBA, transparent 70%)" }} />
            </div>
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 border"
                style={{ background: "var(--cat-badge-open-bg)", borderColor: "var(--cat-badge-open-border)" }}>
                <Trophy className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
                <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--cat-accent)" }}>
                  {t("ctaBadge")}
                </span>
              </div>
              <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ color: "var(--cat-text)" }}>
                {t("ctaHeading1")}{" "}
                <span style={{ background: "linear-gradient(90deg, #2BFEBA, #00E5FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                  {t("ctaHeadingFree")}
                </span>
              </h2>
              <p className="text-[15px] max-w-xl mx-auto mb-8 leading-relaxed"
                style={{ color: "var(--cat-text-secondary)" }}>
                {t("ctaSubtitle")}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link href="/onboarding"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-[15px] font-black transition-opacity hover:opacity-90"
                  style={{ background: "linear-gradient(90deg, #2BFEBA, #00D98F)", color: "#0A0E14", boxShadow: "0 8px 30px rgba(43,254,186,0.3)" }}>
                  {t("ctaCreate")} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/pricing"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-[15px] font-semibold border transition-all hover:opacity-80"
                  style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text)" }}>
                  {t("ctaPricing")} <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t" style={{ borderColor: "var(--cat-card-border)", background: "var(--cat-card-bg)" }}>
          <div className="max-w-[1200px] mx-auto px-6 py-5 flex items-center justify-between text-xs"
            style={{ color: "var(--cat-text-muted)" }}>
            <span>&copy; {new Date().getFullYear()} Goality TMC</span>
            <div className="flex items-center gap-4">
              <Link href="/" className="hover:opacity-80">{t("footerHome")}</Link>
              <Link href="/features" className="hover:opacity-80" style={{ color: "var(--cat-accent)" }}>{t("footerFeatures")}</Link>
              <Link href="/pricing" className="hover:opacity-80">{t("footerPricing")}</Link>
              <Link href="/catalog" className="hover:opacity-80">{t("footerCatalog")}</Link>
            </div>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}
