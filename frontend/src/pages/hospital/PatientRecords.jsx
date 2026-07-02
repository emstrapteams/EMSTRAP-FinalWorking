import { useState, useEffect, useMemo, useCallback } from "react";
import EvidenceImageViewer from "../../components/common/EvidenceImageViewer";
// ── Chart.js via CDN is loaded externally; we use a simple canvas-based mini approach
// ── For real projects, install: npm install chart.js react-chartjs-2

const API_BASE = "/api"; // adjust to your backend base URL

// ─── Palette tokens ────────────────────────────────────────────────
const C = {
  blue: "#3B82F6",
  blueLight: "#EFF6FF",
  blueMid: "#BFDBFE",
  blueDark: "#1D4ED8",
  indigo: "#6366F1",
  indigoLight: "#EEF2FF",
  indigoMid: "#C7D2FE",
  indigoDark: "#4338CA",
  violet: "#8B5CF6",
  violetLight: "#F5F3FF",
  violetMid: "#DDD6FE",
  violetDark: "#6D28D9",
  gray50: "#F8FAFC",
  gray100: "#F1F5F9",
  gray200: "#E2E8F0",
  gray400: "#94A3B8",
  gray500: "#64748B",
  gray700: "#334155",
  gray900: "#0F172A",
  white: "#FFFFFF",
  green: "#10B981",
  greenLight: "#ECFDF5",
  amber: "#F59E0B",
  amberLight: "#FFFBEB",
  red: "#EF4444",
  redLight: "#FEF2F2",
};

// ─── Global styles (injected once) ────────────────────────────────
const injectStyles = () => {
  if (document.getElementById("pr-styles")) return;
  const el = document.createElement("style");
  el.id = "pr-styles";
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    .pr-root * { box-sizing: border-box; }
    .pr-root { font-family: 'Inter', sans-serif; background: ${C.gray50}; min-height: 100vh; color: ${C.gray900}; }
    .pr-btn { display:inline-flex; align-items:center; gap:6px; padding:9px 18px; border-radius:10px; font-size:14px; font-weight:500; cursor:pointer; border:none; transition:all .18s; }
    .pr-btn-primary { background: linear-gradient(135deg,${C.blue},${C.indigo}); color:#fff; box-shadow:0 2px 8px rgba(99,102,241,.25); }
    .pr-btn-primary:hover { transform:translateY(-1px); box-shadow:0 4px 14px rgba(99,102,241,.35); }
    .pr-btn-secondary { background:${C.white}; color:${C.gray700}; border:1.5px solid ${C.gray200}; }
    .pr-btn-secondary:hover { background:${C.gray100}; border-color:${C.gray300}; }
    .pr-btn-ghost { background:transparent; color:${C.indigo}; padding:6px 10px; border-radius:8px; border:none; }
    .pr-btn-ghost:hover { background:${C.indigoLight}; }
    .pr-input { width:100%; padding:9px 12px; border:1.5px solid ${C.gray200}; border-radius:10px; font-size:14px; font-family:'Inter',sans-serif; color:${C.gray900}; background:${C.white}; outline:none; transition:border-color .15s, box-shadow .15s; }
    .pr-input:focus { border-color:${C.indigo}; box-shadow:0 0 0 3px ${C.indigoMid}40; }
    .pr-select { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748B' d='M6 8L1 3h10z'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 10px center; padding-right:30px; }
    .pr-card { background:${C.white}; border-radius:16px; box-shadow:0 1px 3px rgba(0,0,0,.06),0 4px 16px rgba(0,0,0,.04); border:1px solid ${C.gray100}; }
    .pr-badge { display:inline-flex; align-items:center; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:500; }
    .pr-tbl { width:100%; border-collapse:collapse; }
    .pr-tbl th { padding:12px 16px; text-align:left; font-size:12px; font-weight:600; color:${C.gray500}; text-transform:uppercase; letter-spacing:.04em; background:${C.gray50}; border-bottom:1px solid ${C.gray200}; white-space:nowrap; }
    .pr-tbl td { padding:14px 16px; font-size:14px; color:${C.gray700}; border-bottom:1px solid ${C.gray100}; vertical-align:middle; }
    .pr-tbl tr:hover td { background:${C.gray50}; }
    .pr-tbl tr:last-child td { border-bottom:none; }
    .pr-modal-backdrop { position:fixed; inset:0; background:rgba(15,23,42,.5); display:flex; align-items:center; justify-content:center; z-index:1000; padding:16px; backdrop-filter:blur(4px); }
    .pr-modal { background:${C.white}; border-radius:20px; width:100%; max-width:620px; max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,.2); }
    .pr-stat-icon { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
    .pr-tab { padding:8px 20px; border-radius:8px; font-size:14px; font-weight:500; cursor:pointer; border:none; background:transparent; color:${C.gray500}; transition:all .15s; }
    .pr-tab.active { background:${C.white}; color:${C.indigo}; box-shadow:0 1px 4px rgba(0,0,0,.1); }
    .pr-spinner { width:36px; height:36px; border:3px solid ${C.indigoMid}; border-top-color:${C.indigo}; border-radius:50%; animation:pr-spin .7s linear infinite; }
    @keyframes pr-spin { to { transform:rotate(360deg); } }
    .pr-gradient-text { background:linear-gradient(135deg,${C.blue},${C.violet}); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
    .pr-chart-bar { border-radius:6px 6px 0 0; transition:opacity .15s; }
    .pr-chart-bar:hover { opacity:.8; }
    .pr-empty-state { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:64px 24px; color:${C.gray400}; }
    @media (max-width:768px) {
      .pr-stats-grid { grid-template-columns:repeat(2,1fr) !important; }
      .pr-filter-grid { grid-template-columns:1fr !important; }
      .pr-header-row { flex-direction:column !important; align-items:flex-start !important; gap:12px !important; }
      .pr-tbl-wrap { overflow-x:auto; }
    }
  `;
  document.head.appendChild(el);
};

// ─── Helpers ──────────────────────────────────────────────────────
const statusColors = {
  Active:    { bg: C.greenLight, color: C.green, dot: C.green },
  Pending:   { bg: C.amberLight, color: C.amber, dot: C.amber },
  Completed: { bg: C.blueLight,  color: C.blue,  dot: C.blue },
  Discharged:{ bg: C.violetLight,color: C.violet,dot: C.violet },
};

const StatusBadge = ({ status }) => {
  const s = statusColors[status] || { bg: C.gray100, color: C.gray500, dot: C.gray400 };
  return (
    <span className="pr-badge" style={{ background: s.bg, color: s.color }}>
      <span style={{ width:6, height:6, borderRadius:"50%", background:s.dot, display:"inline-block", marginRight:6 }} />
      {status || "—"}
    </span>
  );
};

const fmtDate = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt) ? d : dt.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }) + " " + dt.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });
};

const fmtDateShort = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt) ? d : dt.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" });
};

// ─── Simple SVG bar/line charts (no external lib needed) ──────────
const BarChart = ({ data, color, label }) => {
  if (!data || !data.length) return <div className="pr-empty-state" style={{padding:32}}><span style={{fontSize:13,color:C.gray400}}>No data</span></div>;
  const max = Math.max(...data.map(d => d.value), 1);
  const w = 580, h = 160, pad = { l:40, r:12, t:12, b:40 };
  const chartW = w - pad.l - pad.r, chartH = h - pad.t - pad.b;
  const bw = Math.max(8, Math.min(40, chartW / data.length - 4));
  const gap = chartW / data.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width:"100%", height:"auto" }} aria-label={`${label} bar chart`}>
      {[0,0.25,0.5,0.75,1].map(pct => {
        const y = pad.t + chartH * (1 - pct);
        return <g key={pct}>
          <line x1={pad.l} x2={w-pad.r} y1={y} y2={y} stroke={C.gray200} strokeWidth={1} />
          <text x={pad.l-6} y={y+4} fontSize={9} fill={C.gray400} textAnchor="end">{Math.round(max*pct)}</text>
        </g>;
      })}
      {data.map((d, i) => {
        const barH = (d.value / max) * chartH;
        const x = pad.l + gap * i + gap / 2 - bw / 2;
        const y = pad.t + chartH - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={barH} rx={4} fill={color} opacity={.85} className="pr-chart-bar">
              <title>{d.label}: {d.value}</title>
            </rect>
            <text x={x + bw/2} y={h-8} fontSize={9} fill={C.gray500} textAnchor="middle">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
};

const LineChart = ({ data, color }) => {
  if (!data || !data.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const w = 580, h = 160, pad = { l:40, r:12, t:16, b:32 };
  const chartW = w - pad.l - pad.r, chartH = h - pad.t - pad.b;
  const pts = data.map((d, i) => {
    const x = pad.l + (i / Math.max(data.length-1, 1)) * chartW;
    const y = pad.t + chartH - (d.value / max) * chartH;
    return [x, y];
  });
  const path = pts.map((p, i) => `${i===0?"M":"L"}${p[0]},${p[1]}`).join(" ");
  const area = [...pts, [pts[pts.length-1][0], pad.t+chartH], [pts[0][0], pad.t+chartH]].map((p,i)=>`${i===0?"M":"L"}${p[0]},${p[1]}`).join(" ")+"Z";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width:"100%", height:"auto" }}>
      <defs>
        <linearGradient id="lg-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0,0.25,0.5,0.75,1].map(pct => {
        const y = pad.t + chartH * (1-pct);
        return <g key={pct}>
          <line x1={pad.l} x2={w-pad.r} y1={y} y2={y} stroke={C.gray200} strokeWidth={1} />
          <text x={pad.l-6} y={y+4} fontSize={9} fill={C.gray400} textAnchor="end">{Math.round(max*pct)}</text>
        </g>;
      })}
      <path d={area} fill="url(#lg-area)" />
      <path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r={3.5} fill={color} stroke="#fff" strokeWidth={1.5}>
          <title>{data[i].label}: {data[i].value}</title>
        </circle>
      ))}
      {data.map((d, i) => {
        const x = pad.l + (i / Math.max(data.length-1,1)) * chartW;
        return <text key={i} x={x} y={h-6} fontSize={9} fill={C.gray500} textAnchor="middle">{d.label}</text>;
      })}
    </svg>
  );
};

const DonutChart = ({ data }) => {
  if (!data || !data.length) return null;
  const total = data.reduce((a,b)=>a+b.value,0) || 1;
  const r = 60, cx = 80, cy = 80;
  let cumAngle = -Math.PI/2;
  const arcs = data.map(d => {
    const angle = (d.value/total)*2*Math.PI;
    const x1 = cx + r*Math.cos(cumAngle), y1 = cy + r*Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r*Math.cos(cumAngle), y2 = cy + r*Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`;
    return { ...d, path, pct: Math.round(d.value/total*100) };
  });
  return (
    <div style={{ display:"flex", alignItems:"center", gap:24, flexWrap:"wrap" }}>
      <svg viewBox="0 0 160 160" style={{ width:160, height:160, flexShrink:0 }}>
        {arcs.map((a,i)=><path key={i} d={a.path} fill={a.color} opacity={.9}><title>{a.label}: {a.value} ({a.pct}%)</title></path>)}
        <circle cx={cx} cy={cy} r={36} fill="#fff" />
        <text x={cx} y={cy+5} textAnchor="middle" fontSize={20} fontWeight={600} fill={C.gray900}>{total}</text>
        <text x={cx} y={cy+20} textAnchor="middle" fontSize={9} fill={C.gray400}>total</text>
      </svg>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {arcs.map((a,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ width:10, height:10, borderRadius:3, background:a.color, flexShrink:0 }} />
            <span style={{ fontSize:13, color:C.gray600 }}>{a.label}</span>
            <span style={{ fontSize:13, fontWeight:600, color:C.gray900, marginLeft:"auto" }}>{a.value} <span style={{color:C.gray400,fontWeight:400}}>({a.pct}%)</span></span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Patient Detail Modal ──────────────────────────────────────────
const PatientModal = ({ patient, onClose }) => {
  if (!patient) return null;
  const field = (label, val) => (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:11, fontWeight:600, color:C.gray400, textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:14, color:C.gray900 }}>{val || "—"}</div>
    </div>
  );
  return (
    <div className="pr-modal-backdrop" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="pr-modal">
        <div style={{ padding:"24px 28px", borderBottom:`1px solid ${C.gray100}`, display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:6 }}>
              <div style={{ width:44, height:44, borderRadius:12, background:`linear-gradient(135deg,${C.blue},${C.indigo})`, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:18, fontWeight:600 }}>
                {(patient.name||patient.patientName||"P")[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize:18, fontWeight:700, color:C.gray900 }}>{patient.name || patient.patientName || "Patient"}</div>
                <div style={{ fontSize:13, color:C.gray500 }}>ID: {patient._id || patient.patientId || "—"}</div>
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <StatusBadge status={patient.status} />
            <button className="pr-btn pr-btn-ghost" onClick={onClose} style={{ fontSize:20, padding:"4px 8px" }}>×</button>
          </div>
        </div>
        <div style={{ padding: "24px 28px" }}>

          {patient.imageUrl && (
            <div style={{ marginBottom: 24 }}>
              <EvidenceImageViewer
                mainImage={patient.imageUrl}
                evidence={patient.evidence || []}
              />
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 24px" }}>
            {field("Age", patient.age)}
            {field("Gender", patient.gender)}
            {field("Accident Type", patient.accidentType || patient.accident_type)}
            {field("Doctor Assigned", patient.doctorName || patient.doctor)}
            {field("Ward", patient.ward)}
            {field("Admission Date", fmtDate(patient.createdAt || patient.admissionDate))}
          </div>
          {(patient.description || patient.notes || patient.treatmentNotes) && (
            <div style={{ marginTop:4 }}>
              <div style={{ fontSize:11, fontWeight:600, color:C.gray400, textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 }}>Treatment Notes</div>
              <div style={{ fontSize:14, color:C.gray700, lineHeight:1.7, background:C.gray50, borderRadius:10, padding:"12px 14px", border:`1px solid ${C.gray200}` }}>
                {patient.description || patient.notes || patient.treatmentNotes}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Analytics View ────────────────────────────────────────────────
const AnalyticsView = ({ patients, onBack }) => {
  const dailyData = useMemo(() => {
    const map = {};
    patients.forEach(p => {
      const d = new Date(p.createdAt || p.admissionDate);
      if (isNaN(d)) return;
      const key = d.toLocaleDateString("en-IN", { day:"2-digit", month:"short" });
      map[key] = (map[key]||0)+1;
    });
    return Object.entries(map).slice(-14).map(([label,value])=>({label,value}));
  }, [patients]);

  const monthlyData = useMemo(() => {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const map = {};
    patients.forEach(p => {
      const d = new Date(p.createdAt || p.admissionDate);
      if (isNaN(d)) return;
      const key = months[d.getMonth()];
      map[key] = (map[key]||0)+1;
    });
    return months.filter(m => map[m]).map(m=>({label:m,value:map[m]}));
  }, [patients]);

  const yearlyData = useMemo(() => {
    const map = {};
    patients.forEach(p => {
      const d = new Date(p.createdAt || p.admissionDate);
      if (isNaN(d)) return;
      const key = String(d.getFullYear());
      map[key] = (map[key]||0)+1;
    });
    return Object.entries(map).sort().map(([label,value])=>({label,value}));
  }, [patients]);

  const statusDist = useMemo(() => {
    const map = {};
    patients.forEach(p => { map[p.status||"Unknown"] = (map[p.status||"Unknown"]||0)+1; });
    const colors = [C.blue, C.indigo, C.violet, C.green, C.amber];
    return Object.entries(map).map(([label,value],i)=>({label,value,color:colors[i%colors.length]}));
  }, [patients]);

  const accidentDist = useMemo(() => {
    const map = {};
    patients.forEach(p => {
      const k = p.accidentType || p.accident_type || "Unknown";
      map[k] = (map[k]||0)+1;
    });
    const colors = [C.blue, C.indigo, C.violet, C.green, C.amber, C.red];
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([label,value],i)=>({label,value,color:colors[i]}));
  }, [patients]);

  const section = (title, subtitle, content) => (
    <div className="pr-card" style={{ padding:"24px", marginBottom:20 }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:16, fontWeight:600, color:C.gray900 }}>{title}</div>
        {subtitle && <div style={{ fontSize:13, color:C.gray500, marginTop:2 }}>{subtitle}</div>}
      </div>
      {content}
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:24 }}>
        <button className="pr-btn pr-btn-secondary" onClick={onBack} style={{ padding:"8px 14px" }}>
          ← Back to Records
        </button>
        <div>
          <div style={{ fontSize:22, fontWeight:700, color:C.gray900 }}>Analytics</div>
          <div style={{ fontSize:14, color:C.gray500 }}>Insights from {patients.length} patient records</div>
        </div>
      </div>

      {section("Daily Admissions", "Last 14 days", <LineChart data={dailyData} color={C.blue} />)}
      {section("Monthly Admissions", "Admissions per month", <BarChart data={monthlyData} color={C.indigo} label="Monthly" />)}
      {section("Yearly Admissions", "Year-over-year trend", <LineChart data={yearlyData} color={C.violet} />)}


    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────
export default function PatientRecords() {
  useEffect(() => { injectStyles(); }, []);

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("records"); // "records" | "analytics"
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAccident, setFilterAccident] = useState("");

  // Fetch patients
  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/patients`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();
      // Support both { data: [...] } and [...]
      setPatients(Array.isArray(json) ? json : json.data || json.patients || []);
    } catch (err) {
      setError(err.message || "Failed to load patient records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  // Derived stats
  const stats = useMemo(() => ({
    total: patients.length,
    active: patients.filter(p => p.status === "Active").length,
    pending: patients.filter(p => p.status === "Pending").length,
    completed: patients.filter(p => p.status === "Completed").length,
  }), [patients]);

  // Unique filter options
  const accidentTypes = useMemo(() => [...new Set(patients.map(p => p.accidentType || p.accident_type).filter(Boolean))], [patients]);

  // Years available in the "Year" filter: a fixed list from 2025 to 2035,
  // shown top to bottom in ascending order, independent of loaded records.
  const years = useMemo(() => {
    const startYear = 2025;
    const endYear = 2035;
    const list = [];
    for (let y = startYear; y <= endYear; y++) list.push(String(y));
    return list;
  }, []);

  // Filtered records
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return patients.filter(p => {
      const name = (p.name || p.patientName || "").toLowerCase();
      const id = String(p._id || p.patientId || "").toLowerCase();
      if (q && !name.includes(q) && !id.includes(q)) return false;
      const d = new Date(p.createdAt || p.admissionDate);
      if (filterDate) { const fd = new Date(filterDate); if (isNaN(d)||d.toDateString()!==fd.toDateString()) return false; }
      if (filterMonth) { if (isNaN(d)||String(d.getMonth()+1).padStart(2,"0")!==filterMonth) return false; }
      if (filterYear) { if (isNaN(d)||String(d.getFullYear())!==filterYear) return false; }
      if (filterStatus && p.status !== filterStatus) return false;
      if (filterAccident && (p.accidentType||p.accident_type) !== filterAccident) return false;
      return true;
    });
  }, [patients, search, filterDate, filterMonth, filterYear, filterStatus, filterAccident]);

  const clearFilters = () => { setSearch(""); setFilterDate(""); setFilterMonth(""); setFilterYear(""); setFilterStatus(""); setFilterAccident(""); };
  const hasFilters = search||filterDate||filterMonth||filterYear||filterStatus||filterAccident;

  const MONTHS = ["01","02","03","04","05","06","07","08","09","10","11","12"];
  const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  const statCards = [
    { label:"Total Patients", value:stats.total, icon:"👥", grad:`linear-gradient(135deg,${C.blue},${C.indigo})`, bg:C.blueLight },
    { label:"Active", value:stats.active, icon:"💚", grad:`linear-gradient(135deg,${C.green},#059669)`, bg:C.greenLight },
    { label:"Pending", value:stats.pending, icon:"⏳", grad:`linear-gradient(135deg,${C.amber},#D97706)`, bg:C.amberLight },
    { label:"Completed", value:stats.completed, icon:"✅", grad:`linear-gradient(135deg,${C.indigo},${C.violet})`, bg:C.indigoLight },
  ];

  return (
    <div className="pr-root">
      <div style={{ maxWidth:1280, margin:"0 auto", padding:"28px 24px" }}>

        {/* Header */}
        <div className="pr-header-row" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28 }}>
          <div>
            <h1 style={{ fontSize:28, fontWeight:700, margin:0 }}>
              <span className="pr-gradient-text">Patient Records</span>
            </h1>
            <p style={{ fontSize:14, color:C.gray500, marginTop:6, marginBottom:0 }}>Manage and view historical patient records and analytics</p>
          </div>
          <button
            className="pr-btn pr-btn-primary"
            onClick={() => setView(v => v==="analytics"?"records":"analytics")}
          >
            {view==="analytics" ? "← Records" : "📊 View Analytics"}
          </button>
        </div>



        {/* Main content */}
        {view === "analytics" ? (
          <AnalyticsView patients={patients} onBack={() => setView("records")} />
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-wrap items-end gap-3 px-6 py-4 mb-5 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl">

              {/* Search */}
              <div className="flex flex-col gap-1.5 min-w-[200px] flex-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Search</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                  <input
                    type="text"
                    placeholder="Name or Patient ID..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 transition-all"
                  />
                </div>
              </div>

              {/* Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Date</label>
                <input
                  type="date"
                  value={filterDate}
                  onChange={e => setFilterDate(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 transition-all"
                />
              </div>

              {/* Month */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Month</label>
                <select
                  value={filterMonth}
                  onChange={e => setFilterMonth(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 transition-all"
                >
                  <option value="">Months</option>
                  {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                    <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Year</label>
                <select
                  value={filterYear}
                  onChange={e => setFilterYear(e.target.value)}
                  className="px-3 py-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-400 transition-all"
                >
                  <option value="">Years</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {/* Clear */}
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100/90 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 px-3.5 py-2.5 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                >
                  ✕ Clear
                </button>
              )}

            </div>

            {/* Table */}
            <div className="pr-card" style={{ overflow:"hidden" }}>
              <div style={{ padding:"18px 24px", borderBottom:`1px solid ${C.gray100}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:15, fontWeight:600, color:C.gray900 }}>
                  Patient Records <span style={{ fontSize:13, fontWeight:400, color:C.gray400, marginLeft:6 }}>({filtered.length})</span>
                </div>
                <button className="pr-btn pr-btn-secondary" onClick={fetchPatients} style={{ padding:"7px 14px", fontSize:13 }}>
                  ↻ Refresh
                </button>
              </div>

              {loading ? (
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:64, gap:16 }}>
                  <div className="pr-spinner" />
                  <span style={{ fontSize:14, color:C.gray500 }}>Loading patient records…</span>
                </div>
              ) : error ? (
                <div className="pr-empty-state">
                  <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
                  <div style={{ fontSize:15, fontWeight:600, color:C.gray700, marginBottom:6 }}>Unable to load records</div>
                  <div style={{ fontSize:13, color:C.gray500, marginBottom:20 }}>{error}</div>
                  <button className="pr-btn pr-btn-primary" onClick={fetchPatients}>Try again</button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="pr-empty-state">
                  <div style={{ fontSize:48, marginBottom:12 }}>🔍</div>
                  <div style={{ fontSize:15, fontWeight:600, color:C.gray700, marginBottom:6 }}>No records found</div>
                  <div style={{ fontSize:13, color:C.gray500, marginBottom:20 }}>
                    {hasFilters ? "Try adjusting your filters." : "No patient records available yet."}
                  </div>
                  {hasFilters && <button className="pr-btn pr-btn-secondary" onClick={clearFilters}>Clear all filters</button>}
                </div>
              ) : (
                <div className="pr-tbl-wrap" style={{ overflowX:"auto" }}>
                  <table className="pr-tbl">
                    <thead>
                      <tr>
                        {["Patient ID","Name","Age","Gender","Accident Type","Admission Date","Doctor","Ward","Status","Action"].map(h => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p, i) => (
                        <tr key={p._id || i}>
                          <td style={{ fontFamily:"monospace", fontSize:12, color:C.indigo }}>{String(p._id||p.patientId||"").slice(-8)||"—"}</td>
                          <td>
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <div style={{ width:34, height:34, borderRadius:10, background:`linear-gradient(135deg,${C.blue}30,${C.indigo}40)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:600, color:C.indigo, flexShrink:0 }}>
                                {(p.name||p.patientName||"?")[0].toUpperCase()}
                              </div>
                              <span style={{ fontWeight:500, color:C.gray900, whiteSpace:"nowrap" }}>{p.name||p.patientName||"—"}</span>
                            </div>
                          </td>
                          <td>{p.age||"—"}</td>
                          <td>{p.gender||"—"}</td>
                          <td>
                            {(p.accidentType||p.accident_type) ? (
                              <span className="pr-badge" style={{ background:C.violetLight, color:C.violetDark }}>
                                {p.accidentType||p.accident_type}
                              </span>
                            ) : "—"}
                          </td>
                          <td style={{ whiteSpace:"nowrap", fontSize:13 }}>{fmtDateShort(p.createdAt||p.admissionDate)}</td>
                          <td style={{ whiteSpace:"nowrap" }}>{p.doctorName||p.doctor||"—"}</td>
                          <td>{p.ward||"—"}</td>
                          <td><StatusBadge status={p.status} /></td>
                          <td>
                            <button
                              className="pr-btn"
                              onClick={() => setSelectedPatient(p)}
                              style={{ background:`linear-gradient(135deg,${C.blue},${C.indigo})`, color:"#fff", fontSize:12, padding:"6px 14px", boxShadow:"0 1px 4px rgba(99,102,241,.2)", borderRadius:8 }}
                            >
                              View details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {selectedPatient && <PatientModal patient={selectedPatient} onClose={() => setSelectedPatient(null)} />}
    </div>
  );
}