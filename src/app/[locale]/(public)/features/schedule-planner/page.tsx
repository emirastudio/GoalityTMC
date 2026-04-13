"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ThemeProvider, ThemeToggle } from "@/components/ui/theme-provider";
import { PublicNavHeader } from "@/components/ui/public-nav-header";
import {
  Zap, Calendar, BarChart3, Users, Building2, Layers,
  ArrowRight, CheckCircle, Sparkles, Clock, Shield,
  Activity, RotateCcw, X, ChevronRight,
} from "lucide-react";

// ── Inline keyframes (injected once) ────────────────────────────────────────

const CSS = `
  @keyframes sp-pop {
    0%   { opacity:0; transform:scale(0.35) translateY(6px); }
    65%  { transform:scale(1.07) translateY(-2px); }
    100% { opacity:1; transform:scale(1) translateY(0); }
  }
  @keyframes sp-fade-up {
    from { opacity:0; transform:translateY(20px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes sp-glow-pulse {
    0%,100% { box-shadow:0 0 24px rgba(43,254,186,0.25); }
    50%      { box-shadow:0 0 48px rgba(43,254,186,0.55); }
  }
  @keyframes sp-shimmer {
    0%   { background-position:-200% center; }
    100% { background-position:200% center; }
  }
  @keyframes sp-float {
    0%,100% { transform:translateY(0); }
    50%      { transform:translateY(-10px); }
  }
  @keyframes sp-float2 {
    0%,100% { transform:translateY(0) rotate(3deg); }
    50%      { transform:translateY(-14px) rotate(-3deg); }
  }
  @keyframes sp-float3 {
    0%,100% { transform:translateY(0) rotate(-2deg); }
    50%      { transform:translateY(-8px) rotate(4deg); }
  }
  @keyframes sp-spin {
    to { transform:rotate(360deg); }
  }
  @keyframes sp-blink {
    0%,100% { opacity:1; } 50% { opacity:0.4; }
  }
  @keyframes sp-result-in {
    from { opacity:0; transform:translateX(-12px); }
    to   { opacity:1; transform:translateX(0); }
  }
  .sp-hero-t1 { animation:sp-fade-up 0.6s ease both; }
  .sp-hero-t2 { animation:sp-fade-up 0.6s 0.12s ease both; }
  .sp-hero-t3 { animation:sp-fade-up 0.6s 0.24s ease both; }
  .sp-hero-t4 { animation:sp-fade-up 0.6s 0.36s ease both; }
  .sp-glow-btn { animation:sp-glow-pulse 2.5s ease-in-out infinite; }
  .sp-float1 { animation:sp-float 4s ease-in-out infinite; }
  .sp-float2 { animation:sp-float2 5s ease-in-out infinite 0.5s; }
  .sp-float3 { animation:sp-float3 3.5s ease-in-out infinite 1s; }
  .sp-float4 { animation:sp-float 4.5s ease-in-out infinite 1.5s; }
  .sp-shimmer-text {
    background:linear-gradient(90deg,#2BFEBA,#00E5FF,#6366f1,#2BFEBA);
    background-size:300%;
    -webkit-background-clip:text;
    -webkit-text-fill-color:transparent;
    background-clip:text;
    animation:sp-shimmer 4s ease-in-out infinite;
  }
`;

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK_FIELDS = ["Field A", "Field B", "Field C", "Field D"];
const MOCK_TIMES  = ["09:00", "09:55", "10:50", "11:45", "12:40", "13:35"];
const MOCK_MATCHES = [
  { f:0,t:0,n:1,  h:"Baku Flames",  a:"Helsinki",    c:"#2BFEBA" },
  { f:1,t:0,n:2,  h:"Milan AC",     a:"Ajax Youth",  c:"#6366f1" },
  { f:2,t:0,n:3,  h:"Madrid XI",    a:"Paris FC",    c:"#f59e0b" },
  { f:3,t:0,n:4,  h:"City FC",      a:"Liverpool",   c:"#ec4899" },
  { f:0,t:1,n:5,  h:"Warsaw Utd",   a:"Berlin",      c:"#6366f1" },
  { f:1,t:1,n:6,  h:"Zagreb FC",    a:"Belgrade",    c:"#2BFEBA" },
  { f:2,t:1,n:7,  h:"Oslo Vikings", a:"Athens",      c:"#f59e0b" },
  { f:3,t:1,n:8,  h:"Tokyo FC",     a:"Seoul Stars", c:"#2BFEBA" },
  { f:0,t:2,n:9,  h:"London City",  a:"Munich",      c:"#f59e0b" },
  { f:1,t:2,n:10, h:"Riga FC",      a:"Tallinn FC",  c:"#ec4899" },
  { f:2,t:2,n:11, h:"Porto Youth",  a:"Benfica",     c:"#2BFEBA" },
  { f:3,t:2,n:12, h:"Roma Wolves",  a:"Juventus",    c:"#6366f1" },
  { f:0,t:3,n:13, h:"Shanghai",     a:"Beijing",     c:"#2BFEBA" },
  { f:1,t:3,n:14, h:"Sydney SC",    a:"Melbourne",   c:"#f59e0b" },
  { f:2,t:3,n:15, h:"Toronto FC",   a:"Vancouver",   c:"#6366f1" },
  { f:3,t:3,n:16, h:"Cairo",        a:"Tunis FC",    c:"#2BFEBA" },
  { f:0,t:4,n:17, h:"Istanbul SC",  a:"Ankara FC",   c:"#6366f1" },
  { f:1,t:4,n:18, h:"Prague FC",    a:"Vienna",      c:"#2BFEBA" },
  { f:2,t:4,n:19, h:"Tbilisi",      a:"Yerevan",     c:"#f59e0b" },
  { f:3,t:4,n:20, h:"Dubai Hawks",  a:"Abu Dhabi",   c:"#ec4899" },
  { f:0,t:5,n:21, h:"Copenhagen",   a:"Stockholm",   c:"#2BFEBA" },
  { f:1,t:5,n:22, h:"Helsinki II",  a:"Riga Utd",    c:"#6366f1" },
  { f:2,t:5,n:23, h:"Lviv Eagles",  a:"Odessa",      c:"#f59e0b" },
  { f:3,t:5,n:24, h:"Kyiv FC",      a:"Moscow Utd",  c:"#2BFEBA" },
] as const;

// ── Animated counter ─────────────────────────────────────────────────────────

function Counter({ to, suffix="", prefix="" }: { to:number; suffix?:string; prefix?:string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let n=0; const step=Math.ceil(to/50);
      const id = setInterval(() => {
        n = Math.min(n+step, to); setVal(n);
        if (n>=to) clearInterval(id);
      }, 20);
    }, { threshold:0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [to]);
  return <span ref={ref}>{prefix}{val.toLocaleString()}{suffix}</span>;
}

// ── Scheduler mockup ─────────────────────────────────────────────────────────

function SchedulerMockup() {
  const [phase, setPhase] = useState<"idle"|"running"|"done">("idle");
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setPhase("running"), 600);
    return () => clearTimeout(t);
  }, [animKey]);

  useEffect(() => {
    if (phase !== "running") return;
    const t = setTimeout(() => setPhase("done"), MOCK_MATCHES.length * 125 + 700);
    return () => clearTimeout(t);
  }, [phase]);

  function replay() {
    setPhase("idle");
    setAnimKey(k => k+1);
  }

  const grid = MOCK_TIMES.map((_,ti) =>
    MOCK_FIELDS.map((_,fi) => MOCK_MATCHES.find(m => m.t===ti && m.f===fi) ?? null)
  );

  return (
    <div style={{ background:"#05080F", borderRadius:16, border:"1px solid rgba(43,254,186,0.18)", overflow:"hidden", boxShadow:"0 0 80px rgba(43,254,186,0.07), 0 40px 80px rgba(0,0,0,0.6)" }}>

      {/* ── Top bar ── */}
      <div style={{ background:"rgba(43,254,186,0.04)", borderBottom:"1px solid rgba(255,255,255,0.06)", padding:"12px 20px", display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
        <Zap style={{ color:"#2BFEBA", width:15, height:15 }} />
        <span style={{ color:"#2BFEBA", fontWeight:800, fontSize:13, letterSpacing:-0.3 }}>Auto-schedule</span>
        <span style={{ fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:20, background:"rgba(245,158,11,0.2)", color:"#f59e0b" }}>PRO</span>
        <div style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:7, padding:"3px 10px", fontSize:11, color:"rgba(255,255,255,0.45)" }}>
          U14 · 4 fields · 3 days
        </div>
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8 }}>
          {/* Generate button — clickable always except while running */}
          <button
            onClick={phase !== "running" ? replay : undefined}
            disabled={phase === "running"}
            style={{
              padding:"7px 18px", borderRadius:8, fontSize:12, fontWeight:800,
              cursor: phase==="running" ? "default" : "pointer",
              display:"flex", alignItems:"center", gap:6, border:"none", outline:"none",
              background: phase==="running" ? "rgba(43,254,186,0.12)" : "linear-gradient(90deg,#2BFEBA,#00D98F)",
              color: phase==="running" ? "#2BFEBA" : "#050C0A",
              transition:"opacity 0.15s",
            }}
            onMouseEnter={e => { if (phase !== "running") (e.currentTarget as HTMLElement).style.opacity = "0.85"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
          >
            {phase==="running"
              ? <><span style={{ display:"inline-block", animation:"sp-spin 0.9s linear infinite" }}>⟳</span> Building…</>
              : <><span>⚡</span> Generate All</>
            }
          </button>
          {phase==="done" && (
            <button onClick={replay} style={{ padding:"7px 12px", borderRadius:8, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.45)", fontSize:11, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
              <RotateCcw style={{ width:11,height:11 }} /> Replay
            </button>
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      <div style={{ overflowX:"auto" }}>
        <div style={{ minWidth:580 }}>
          {/* Header */}
          <div style={{ display:"grid", gridTemplateColumns:"68px repeat(4,1fr)", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ padding:"9px 8px", fontSize:9, color:"rgba(255,255,255,0.18)", fontWeight:700, textAlign:"center", letterSpacing:1 }}>TIME</div>
            {MOCK_FIELDS.map((f,i) => (
              <div key={i} style={{ padding:"9px 8px", fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.35)", textAlign:"center", borderLeft:"1px solid rgba(255,255,255,0.05)" }}>{f}</div>
            ))}
          </div>

          {/* Rows */}
          {grid.map((row,ti) => (
            <div key={ti} style={{ display:"grid", gridTemplateColumns:"68px repeat(4,1fr)", borderBottom: ti<grid.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <div style={{ padding:"6px 8px", fontSize:11, color:"rgba(255,255,255,0.25)", fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center" }}>
                {MOCK_TIMES[ti]}
              </div>
              {row.map((match,fi) => (
                <div key={fi} style={{ padding:"4px 4px", borderLeft:"1px solid rgba(255,255,255,0.04)", minHeight:70, display:"flex", alignItems:"stretch" }}>
                  {match && phase!=="idle" && (
                    <div
                      key={`${animKey}-${match.n}`}
                      style={{
                        flex:1,
                        borderLeft:`3px solid ${match.c}`,
                        background:`${match.c}12`,
                        borderRadius:"0 6px 6px 0",
                        padding:"5px 7px",
                        animation:"sp-pop 0.38s cubic-bezier(0.34,1.56,0.64,1) both",
                        animationDelay:`${MOCK_MATCHES.findIndex(m=>m.n===match.n)*125}ms`,
                      }}
                    >
                      <div style={{ fontSize:9, color:match.c, fontWeight:800, marginBottom:1, opacity:0.9 }}>#{match.n}</div>
                      <div style={{ fontSize:10, color:"#fff", fontWeight:700, lineHeight:1.25 }}>{match.h}</div>
                      <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)", lineHeight:1.25, marginTop:2 }}>{match.a}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Result bar ── */}
      <div style={{ padding:"11px 20px", borderTop:"1px solid rgba(255,255,255,0.06)", minHeight:44, display:"flex", alignItems:"center", gap:12 }}>
        {phase==="idle" && <span style={{ fontSize:12, color:"rgba(255,255,255,0.18)" }}>Awaiting generation…</span>}
        {phase==="running" && <span style={{ fontSize:12, color:"#2BFEBA", animation:"sp-blink 1s ease-in-out infinite" }}>⚡ Generating schedule…</span>}
        {phase==="done" && (
          <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", animation:"sp-result-in 0.4s ease both" }}>
            <span style={{ background:"rgba(43,254,186,0.15)", border:"1px solid rgba(43,254,186,0.3)", borderRadius:7, padding:"3px 12px", fontSize:12, fontWeight:800, color:"#2BFEBA" }}>
              ✓ 24 matches generated
            </span>
            <span style={{ fontSize:13, color:"rgba(255,255,255,0.2)" }}>·</span>
            <span style={{ fontSize:12, fontWeight:700, color:"#2BFEBA" }}>0 conflicts</span>
            <span style={{ fontSize:13, color:"rgba(255,255,255,0.2)" }}>·</span>
            <span style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>2.3 sec</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Floating match card decoration ──────────────────────────────────────────

function FloatCard({ num, home, away, time, color, className, style }: {
  num:number; home:string; away:string; time:string; color:string;
  className:string; style?:React.CSSProperties;
}) {
  return (
    <div className={className} style={{ position:"absolute", borderRadius:10, overflow:"hidden", width:160, pointerEvents:"none", userSelect:"none", opacity:0.85, ...style }}>
      <div style={{ borderLeft:`3px solid ${color}`, background:`rgba(5,8,15,0.9)`, border:`1px solid ${color}30`, borderLeftWidth:3, borderLeftColor:color, backdropFilter:"blur(10px)", padding:"9px 11px", borderRadius:10 }}>
        <div style={{ fontSize:9, color:color, fontWeight:800, marginBottom:3 }}>#{num} · {time}</div>
        <div style={{ fontSize:11, color:"#fff", fontWeight:700 }}>{home}</div>
        <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{away}</div>
      </div>
    </div>
  );
}

// ── Audit mock panel ─────────────────────────────────────────────────────────

function AuditMockPanel() {
  const rows = [
    { team:"Baku Flames",    matches:4, rest:"2h 10m", streak:"1×", ok:true  },
    { team:"Helsinki Stars", matches:4, rest:"1h 55m", streak:"2×", ok:true  },
    { team:"Madrid XI",      matches:4, rest:"55m",    streak:"3×", ok:false },
    { team:"Paris FC",       matches:4, rest:"2h 05m", streak:"1×", ok:true  },
    { team:"Warsaw Utd",     matches:3, rest:"2h 40m", streak:"1×", ok:true  },
    { team:"Berlin Eagles",  matches:4, rest:"45m",    streak:"2×", ok:false },
  ];
  return (
    <div style={{ background:"#05080F", borderRadius:12, border:"1px solid rgba(255,255,255,0.08)", overflow:"hidden", fontSize:12 }}>
      <div style={{ padding:"10px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", gap:8 }}>
        <Activity style={{ width:13,height:13,color:"#2BFEBA" }} />
        <span style={{ color:"#fff", fontWeight:700, fontSize:12 }}>Schedule Audit</span>
        <span style={{ marginLeft:"auto", background:"rgba(43,254,186,0.15)", color:"#2BFEBA", fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:20 }}>A+</span>
      </div>
      <div style={{ padding:"6px 0" }}>
        {rows.map((r,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 16px", borderBottom: i<rows.length-1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
            <span style={{ width:110, color:"#fff", fontWeight:600, fontSize:11, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.team}</span>
            <span style={{ color:"rgba(255,255,255,0.3)", fontSize:10, width:16, textAlign:"center" }}>{r.matches}</span>
            <span style={{
              fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:5, whiteSpace:"nowrap",
              background: r.ok ? "rgba(43,254,186,0.12)" : "rgba(239,68,68,0.12)",
              color: r.ok ? "#2BFEBA" : "#ef4444",
            }}>{r.rest}</span>
            <span style={{
              fontSize:10, fontWeight:600, padding:"1px 6px", borderRadius:5, marginLeft:"auto",
              background: r.streak==="3×" ? "rgba(239,68,68,0.12)" : r.streak==="2×" ? "rgba(245,158,11,0.1)" : "rgba(43,254,186,0.08)",
              color: r.streak==="3×" ? "#ef4444" : r.streak==="2×" ? "#f59e0b" : "#2BFEBA",
            }}>{r.streak}</span>
            <span>{r.ok ? "✓" : "⚠"}</span>
          </div>
        ))}
      </div>
      <div style={{ padding:"10px 16px", borderTop:"1px solid rgba(255,255,255,0.06)", display:"flex", gap:12 }}>
        {[["4","fields 100%"], ["0","conflicts"], ["2","warnings"]].map(([v,l]) => (
          <div key={l} style={{ textAlign:"center" }}>
            <div style={{ fontSize:16, fontWeight:900, color:"#2BFEBA" }}>{v}</div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", whiteSpace:"nowrap" }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function SchedulePlannerPage() {
  const t = useTranslations("schedulePlanner");

  const features = [
    {
      icon: Zap, color:"#2BFEBA",
      title: t("f1Title"), desc: t("f1Desc"),
    },
    {
      icon: Calendar, color:"#6366f1",
      title: t("f2Title"), desc: t("f2Desc"),
    },
    {
      icon: Building2, color:"#f59e0b",
      title: t("f3Title"), desc: t("f3Desc"),
    },
    {
      icon: BarChart3, color:"#2BFEBA",
      title: t("f4Title"), desc: t("f4Desc"),
    },
    {
      icon: Users, color:"#6366f1",
      title: t("f5Title"), desc: t("f5Desc"),
    },
    {
      icon: Layers, color:"#f59e0b",
      title: t("f6Title"), desc: t("f6Desc"),
    },
  ];

  const stats = [
    { value:200, suffix:"+", label: t("stat1Label"), sub: t("stat1Sub") },
    { value:10,  suffix:"+", label: t("stat2Label"), sub: t("stat2Sub") },
    { value:0,   suffix:"",  label: t("stat3Label"), sub: t("stat3Sub") },
    { value:5,   suffix:"s", label: t("stat4Label"), sub: t("stat4Sub") },
  ];

  return (
    <ThemeProvider defaultTheme="dark">
      <style>{CSS}</style>
      <div className="min-h-screen overflow-x-hidden" style={{ background:"var(--cat-bg)" }}>
        <PublicNavHeader />

        {/* ═══════════ HERO ═══════════════════════════════════════════════ */}
        <section className="relative overflow-hidden" style={{ background:"linear-gradient(160deg,#030710 0%,#070D18 40%,#040910 100%)", paddingTop:100, paddingBottom:80 }}>

          {/* Glow orbs */}
          <div style={{ position:"absolute", inset:0, pointerEvents:"none", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:"-15%", left:"5%", width:700, height:700, borderRadius:"50%", background:"radial-gradient(circle,rgba(43,254,186,0.08),transparent 65%)" }} />
            <div style={{ position:"absolute", bottom:"-20%", right:"-5%", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,0.07),transparent 65%)" }} />
            <div style={{ position:"absolute", top:"40%", right:"20%", width:300, height:300, borderRadius:"50%", background:"radial-gradient(circle,rgba(245,158,11,0.04),transparent 70%)" }} />
          </div>

          {/* Floating match cards (decorative) */}
          <FloatCard num={7}  home="Oslo Vikings" away="Athens Titans" time="09:55" color="#2BFEBA" className="sp-float1" style={{ top:"12%", right:"6%",  transform:"rotate(4deg)"  }} />
          <FloatCard num={12} home="Roma Wolves"  away="Juventus U14"  time="11:45" color="#6366f1" className="sp-float2" style={{ top:"45%", right:"2%",  transform:"rotate(-3deg)" }} />
          <FloatCard num={3}  home="Madrid XI"    away="Paris FC"      time="09:00" color="#f59e0b" className="sp-float3" style={{ top:"20%", left:"2%",   transform:"rotate(-5deg)" }} />
          <FloatCard num={18} home="Prague FC"    away="Vienna Royals" time="12:40" color="#ec4899" className="sp-float4" style={{ top:"65%", left:"3%",   transform:"rotate(3deg)"  }} />

          {/* Content */}
          <div className="relative z-10 max-w-[900px] mx-auto px-6 text-center">

            {/* Badge */}
            <div className="sp-hero-t1 inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 border" style={{ background:"rgba(43,254,186,0.08)", borderColor:"rgba(43,254,186,0.25)" }}>
              <Zap className="w-3.5 h-3.5" style={{ color:"#2BFEBA" }} />
              <span className="text-[11px] font-black uppercase tracking-widest" style={{ color:"#2BFEBA" }}>
                {t("badge")}
              </span>
            </div>

            {/* Headline */}
            <h1 className="sp-hero-t2 font-black tracking-tight leading-[0.92] mb-6" style={{ fontSize:"clamp(42px,8vw,80px)" }}>
              <span style={{ color:"#fff" }}>{t("heroTitle1")}</span>
              <br />
              <span className="sp-shimmer-text">{t("heroTitle2")}</span>
            </h1>

            {/* Subtitle */}
            <p className="sp-hero-t3 text-[17px] md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto" style={{ color:"rgba(255,255,255,0.55)" }}>
              {t("heroSubtitle")}
            </p>

            {/* CTAs */}
            <div className="sp-hero-t4 flex flex-wrap items-center justify-center gap-4 mb-14">
              <Link
                href="/onboarding"
                className="sp-glow-btn inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-[15px] font-black transition-opacity hover:opacity-90"
                style={{ background:"linear-gradient(90deg,#2BFEBA,#00D98F)", color:"#030A07", boxShadow:"0 8px 32px rgba(43,254,186,0.3)" }}
              >
                {t("heroCta")} <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#demo"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-[15px] font-semibold border transition-all hover:border-[rgba(43,254,186,0.3)]"
                style={{ background:"rgba(255,255,255,0.04)", borderColor:"rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.7)" }}
              >
                {t("heroCtaDemo")} ↓
              </a>
            </div>

            {/* Mini trust pills */}
            <div className="flex flex-wrap justify-center gap-3">
              {[t("pill1"), t("pill2"), t("pill3")].map(pill => (
                <span key={pill} className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full" style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", color:"rgba(255,255,255,0.4)" }}>
                  <CheckCircle className="w-3 h-3" style={{ color:"#2BFEBA" }} /> {pill}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ BEFORE / AFTER ══════════════════════════════════════ */}
        <section className="max-w-[1100px] mx-auto px-6 py-20">
          <div className="grid md:grid-cols-2 gap-6">

            {/* Before */}
            <div className="rounded-2xl p-7 border relative overflow-hidden" style={{ background:"rgba(239,68,68,0.04)", borderColor:"rgba(239,68,68,0.18)" }}>
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-[0.04]" style={{ background:"radial-gradient(circle,#ef4444,transparent)", transform:"translate(30%,-30%)" }} />
              <p className="text-[11px] font-black uppercase tracking-widest mb-4" style={{ color:"rgba(239,68,68,0.7)" }}>{t("beforeTitle")}</p>
              <ul className="space-y-3">
                {(t.raw("beforeItems") as string[]).map((item:string) => (
                  <li key={item} className="flex items-start gap-3">
                    <X className="w-4 h-4 mt-0.5 shrink-0" style={{ color:"rgba(239,68,68,0.6)" }} />
                    <span className="text-[14px] leading-snug" style={{ color:"rgba(255,255,255,0.4)" }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* After */}
            <div className="rounded-2xl p-7 border relative overflow-hidden" style={{ background:"rgba(43,254,186,0.05)", borderColor:"rgba(43,254,186,0.2)" }}>
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-[0.06]" style={{ background:"radial-gradient(circle,#2BFEBA,transparent)", transform:"translate(30%,-30%)" }} />
              <p className="text-[11px] font-black uppercase tracking-widest mb-4" style={{ color:"#2BFEBA" }}>{t("afterTitle")}</p>
              <ul className="space-y-3">
                {(t.raw("afterItems") as string[]).map((item:string) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color:"#2BFEBA" }} />
                    <span className="text-[14px] leading-snug" style={{ color:"rgba(255,255,255,0.75)" }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ═══════════ THE MOCKUP ══════════════════════════════════════════ */}
        <section id="demo" style={{ background:"#030710", padding:"80px 0" }}>
          <div className="max-w-[1000px] mx-auto px-6">

            {/* Section header */}
            <div className="text-center mb-10">
              <p className="text-[11px] font-black uppercase tracking-widest mb-3" style={{ color:"#2BFEBA" }}>{t("mockupEyebrow")}</p>
              <h2 className="font-black tracking-tight mb-4" style={{ fontSize:"clamp(28px,5vw,52px)", color:"#fff" }}>
                {t("mockupTitle")}{" "}
                <span className="sp-shimmer-text">{t("mockupTitleHighlight")}</span>
              </h2>
              <p className="text-[15px] max-w-xl mx-auto" style={{ color:"rgba(255,255,255,0.4)" }}>
                {t("mockupSubtitle")}
              </p>
            </div>

            <SchedulerMockup />

            {/* Steps below mockup */}
            <div className="grid grid-cols-3 gap-6 mt-10">
              {[
                { n:"01", icon: Sparkles, color:"#2BFEBA", title: t("step1Title"), desc: t("step1Desc") },
                { n:"02", icon: Zap,      color:"#6366f1", title: t("step2Title"), desc: t("step2Desc") },
                { n:"03", icon: Shield,   color:"#f59e0b", title: t("step3Title"), desc: t("step3Desc") },
              ].map(s => (
                <div key={s.n} className="text-center">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background:`${s.color}15`, border:`1px solid ${s.color}30` }}>
                    <s.icon className="w-4 h-4" style={{ color:s.color }} />
                  </div>
                  <p className="text-[11px] font-black mb-1" style={{ color:s.color }}>{s.n}</p>
                  <p className="text-[13px] font-bold mb-1" style={{ color:"rgba(255,255,255,0.8)" }}>{s.title}</p>
                  <p className="text-[12px] leading-relaxed" style={{ color:"rgba(255,255,255,0.35)" }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════ FEATURES ════════════════════════════════════════════ */}
        <section className="max-w-[1100px] mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <p className="text-[11px] font-black uppercase tracking-widest mb-3" style={{ color:"var(--cat-accent)" }}>{t("featuresEyebrow")}</p>
            <h2 className="font-black tracking-tight mb-4" style={{ fontSize:"clamp(26px,4.5vw,48px)", color:"var(--cat-text)" }}>
              {t("featuresTitle")}{" "}
              <span style={{ background:"linear-gradient(90deg,#2BFEBA,#6366f1)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text" }}>
                {t("featuresTitleHighlight")}
              </span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div key={i} className="cat-card rounded-2xl p-6 border transition-all group" style={{ background:"var(--cat-card-bg)", borderColor:"var(--cat-card-border)", boxShadow:"var(--cat-card-shadow)", animationDelay:`${i*60}ms` }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110" style={{ background:`${f.color}15` }}>
                  <f.icon className="w-5 h-5" style={{ color:f.color }} />
                </div>
                <h3 className="text-[14px] font-bold mb-2" style={{ color:"var(--cat-text)" }}>{f.title}</h3>
                <p className="text-[13px] leading-relaxed" style={{ color:"var(--cat-text-secondary)" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════ AUDIT SPOTLIGHT ═════════════════════════════════════ */}
        <section style={{ background:"linear-gradient(160deg,#040A14,#070D1C,#040A14)", padding:"80px 0" }}>
          <div className="max-w-[1100px] mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">

              {/* Left: text */}
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest mb-4" style={{ color:"#2BFEBA" }}>{t("auditEyebrow")}</p>
                <h2 className="font-black tracking-tight mb-5 leading-tight" style={{ fontSize:"clamp(26px,4vw,44px)", color:"#fff" }}>
                  {t("auditTitle")}{" "}
                  <span className="sp-shimmer-text">{t("auditTitleHighlight")}</span>
                </h2>
                <p className="text-[15px] leading-relaxed mb-8" style={{ color:"rgba(255,255,255,0.5)" }}>
                  {t("auditDesc")}
                </p>
                <ul className="space-y-3">
                  {(t.raw("auditItems") as string[]).map((item:string) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color:"#2BFEBA" }} />
                      <span className="text-[14px]" style={{ color:"rgba(255,255,255,0.6)" }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right: audit mockup */}
              <div>
                <AuditMockPanel />
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════ STATS ═══════════════════════════════════════════════ */}
        <section className="max-w-[1100px] mx-auto px-6 py-20">
          <div className="text-center mb-14">
            <p className="text-[11px] font-black uppercase tracking-widest mb-3" style={{ color:"var(--cat-accent)" }}>{t("statsEyebrow")}</p>
            <h2 className="font-black tracking-tight" style={{ fontSize:"clamp(26px,4.5vw,48px)", color:"var(--cat-text)" }}>
              {t("statsTitle")}
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s,i) => (
              <div key={i} className="cat-card rounded-2xl p-6 text-center border" style={{ background:"var(--cat-card-bg)", borderColor:"var(--cat-card-border)", animationDelay:`${i*80}ms` }}>
                <div className="font-black mb-2" style={{ fontSize:"clamp(36px,5vw,56px)", color:"var(--cat-accent)", lineHeight:1 }}>
                  <Counter to={s.value} suffix={s.suffix} />
                </div>
                <p className="text-[14px] font-bold mb-1" style={{ color:"var(--cat-text)" }}>{s.label}</p>
                <p className="text-[12px]" style={{ color:"var(--cat-text-muted)" }}>{s.sub}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════ CTA ═════════════════════════════════════════════════ */}
        <section className="max-w-[1100px] mx-auto px-6 pb-24">
          <div className="relative rounded-3xl overflow-hidden text-center p-12 md:p-16" style={{ background:"linear-gradient(135deg,rgba(43,254,186,0.1),rgba(99,102,241,0.12),rgba(43,254,186,0.08))", border:"1px solid rgba(43,254,186,0.2)" }}>
            {/* Glow */}
            <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 50% 0%,rgba(43,254,186,0.12),transparent 70%)", pointerEvents:"none" }} />

            <div className="relative z-10">
              <h2 className="font-black tracking-tight mb-4" style={{ fontSize:"clamp(28px,5vw,54px)", color:"var(--cat-text)" }}>
                {t("ctaTitle")}{" "}
                <span className="sp-shimmer-text">{t("ctaTitleHighlight")}</span>
              </h2>
              <p className="text-[16px] mb-10 max-w-lg mx-auto" style={{ color:"rgba(255,255,255,0.5)" }}>
                {t("ctaSubtitle")}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/onboarding"
                  className="sp-glow-btn inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-[15px] font-black transition-opacity hover:opacity-90"
                  style={{ background:"linear-gradient(90deg,#2BFEBA,#00D98F)", color:"#030A07", boxShadow:"0 8px 32px rgba(43,254,186,0.3)" }}
                >
                  {t("ctaBtn")} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/features"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-[15px] font-semibold border transition-all hover:opacity-80"
                  style={{ background:"rgba(255,255,255,0.04)", borderColor:"rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.6)" }}
                >
                  <ChevronRight className="w-4 h-4" /> {t("ctaBtnSecondary")}
                </Link>
              </div>
              <p className="mt-5 text-[12px]" style={{ color:"rgba(255,255,255,0.25)" }}>{t("ctaNote")}</p>
            </div>
          </div>
        </section>

        {/* ═══════════ FOOTER ══════════════════════════════════════════════ */}
        <footer className="border-t py-8" style={{ borderColor:"var(--cat-card-border)" }}>
          <div className="max-w-[1100px] mx-auto px-6 flex flex-wrap items-center justify-between gap-4">
            <div className="text-[13px]" style={{ color:"var(--cat-text-muted)" }}>
              © {new Date().getFullYear()} Goality TMC
            </div>
            <div className="flex items-center gap-6">
              <Link href="/features" className="text-[13px] hover:opacity-80" style={{ color:"var(--cat-text-muted)" }}>{t("navFeatures")}</Link>
              <Link href="/pricing" className="text-[13px] hover:opacity-80" style={{ color:"var(--cat-text-muted)" }}>{t("navPricing")}</Link>
              <Link href="/onboarding" className="text-[13px] hover:opacity-80" style={{ color:"var(--cat-accent)" }}>{t("navStart")}</Link>
              <ThemeToggle />
            </div>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}
