"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Plus, LogOut, ChevronRight, FolderOpen, ListChecks, CheckCircle, AlertTriangle, Activity, TrendingUp } from "lucide-react";

const STAGE_ORDER = ["draft", "active", "paused", "completed", "archived"];
const STAGE_META: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: "Draft",     color: "#94a3b8",  bg: "rgba(148,163,184,0.1)" },
  active:    { label: "Active",    color: "#00d4ff",  bg: "rgba(0,212,255,0.1)" },
  paused:    { label: "Paused",    color: "#fbbf24",  bg: "rgba(251,191,36,0.1)" },
  completed: { label: "Complete",  color: "#34d399",  bg: "rgba(52,211,153,0.1)" },
  archived:  { label: "Archived",  color: "#f87171",  bg: "rgba(248,113,113,0.1)" },
};

function ProgressRing({ pct, size = 90, stroke = 7 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(100,140,190,0.12)" strokeWidth={stroke} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#00d4ff" strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <span className="absolute text-[17px] font-semibold" style={{ color: '#dfe7ef' }}>
        {pct}%
      </span>
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent?: string }) {
  return (
    <div className="ax-card p-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: '#253350' }}>
          {icon}
        </div>
        <div>
          <p className="text-[12px]" style={{ color: '#7a95ae' }}>{label}</p>
          <p className="text-[24px] font-semibold tracking-tight leading-tight" style={{ color: accent || '#dfe7ef' }}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (user) apiFetch("/api/projects").then(setProjects).catch(console.error);
  }, [user, loading, router]);

  if (loading || !user) return null;

  const totalProjects = projects.length;
  const totalTasks = projects.reduce((a, p) => a + (p.total_tasks || 0), 0);
  const completedTasks = projects.reduce((a, p) => a + (p.submitted_tasks || 0), 0);
  const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const flaggedCount = projects.reduce((a, p) => a + (p.flagged_items || 0), 0);
  const activeTasks = totalTasks - completedTasks;

  const pipeline: Record<string, any[]> = {};
  STAGE_ORDER.forEach(s => { pipeline[s] = []; });
  projects.forEach(p => { const s = p.status || "draft"; if (pipeline[s]) pipeline[s].push(p); });
  const activeStages = STAGE_ORDER.filter(s => pipeline[s].length > 0);

  return (
    <div className="ax-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight" style={{ color: '#edf2f7' }}>
            Projects
          </h1>
          <p className="text-[14px] mt-1.5" style={{ color: '#7a95ae' }}>
            Welcome back, <span className="font-medium" style={{ color: '#c0d4e4' }}>{user.display_name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user.role === "requester" && (
            <a href="/projects/new" className="ax-btn ax-btn-primary"><Plus size={14} /> New Project</a>
          )}
          <button onClick={logout} className="ax-btn ax-btn-ghost"><LogOut size={14} /> Sign out</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7 ax-enter ax-d1">
        <StatCard icon={<FolderOpen className="w-4 h-4" style={{ color: '#00d4ff' }} />} label="Projects" value={totalProjects} />
        <StatCard icon={<ListChecks className="w-4 h-4" style={{ color: '#a78bfa' }} />} label="Active tasks" value={activeTasks} accent="#a78bfa" />
        <StatCard icon={<CheckCircle className="w-4 h-4" style={{ color: '#34d399' }} />} label="Completed" value={completedTasks} accent="#34d399" />
        <StatCard icon={<AlertTriangle className="w-4 h-4" style={{ color: flaggedCount > 0 ? '#f87171' : '#7a95ae' }} />}
          label="Flagged" value={flaggedCount} accent={flaggedCount > 0 ? '#f87171' : undefined} />
      </div>

      {projects.length === 0 ? (
        <div className="ax-card p-16 text-center ax-enter ax-d2">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
            style={{ background: '#253350' }}>
            <FolderOpen className="w-7 h-7" style={{ color: '#00d4ff' }} />
          </div>
          <p className="text-[17px] font-semibold mb-2" style={{ color: '#dfe7ef' }}>
            No projects yet
          </p>
          <p className="text-[14px] mb-6" style={{ color: '#7a95ae' }}>
            Create your first annotation project to get started.
          </p>
          {user.role === "requester" && (
            <a href="/projects/new" className="ax-btn ax-btn-primary inline-flex"><Plus size={14} /> New Project</a>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: Pipeline + Table */}
          <div className="lg:col-span-2 space-y-6">

            {/* Pipeline */}
            <div className="ax-enter ax-d2">
              <h2 className="text-[16px] font-semibold mb-4" style={{ color: '#dfe7ef' }}>
                Pipeline
              </h2>
              <div className="ax-card p-4 overflow-x-auto">
                <div className="flex gap-3" style={{ minWidth: activeStages.length > 3 ? `${activeStages.length * 170}px` : undefined }}>
                  {activeStages.map((stage) => {
                    const meta = STAGE_META[stage];
                    return (
                      <div key={stage} className="flex-1" style={{ minWidth: 155 }}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                          <span className="text-[13px] font-medium" style={{ color: meta.color }}>{meta.label}</span>
                          <span className="text-[11px] ml-auto px-2 py-0.5 rounded-md font-medium"
                            style={{ color: meta.color, background: meta.bg }}>
                            {pipeline[stage].length}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {pipeline[stage].map(p => (
                            <a key={p.project_id || p.id} href={`/projects/${p.project_id || p.id}`}
                              className="block rounded-xl p-3 transition-colors"
                              style={{ background: 'rgba(100,140,190,0.06)', border: '1px solid rgba(100,140,190,0.08)', textDecoration: 'none' }}>
                              <p className="text-[13px] font-semibold truncate mb-2" style={{ color: '#dfe7ef' }}>
                                {p.title}
                              </p>
                              <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(100,140,190,0.08)' }}>
                                <div className="h-full rounded-full" style={{
                                  width: `${p.pct_complete || 0}%`, background: meta.color, transition: 'width 0.5s ease',
                                }} />
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[11px]" style={{ color: '#7a95ae' }}>
                                  {p.submitted_tasks ?? 0}/{p.total_tasks ?? 0} tasks
                                </span>
                                {p.flagged_items > 0 && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium" style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)' }}>
                                    {p.flagged_items} flagged
                                  </span>
                                )}
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="ax-enter ax-d3">
              <h2 className="text-[16px] font-semibold mb-4" style={{ color: '#dfe7ef' }}>
                All Projects
              </h2>
              <div className="ax-card overflow-hidden">
                <div className="flex items-center px-5 py-3 text-[12px] font-medium"
                  style={{ color: '#7a95ae', borderBottom: '1px solid rgba(100,140,190,0.08)' }}>
                  <span className="flex-1">Name</span>
                  <span className="w-24 text-center">Status</span>
                  <span className="w-20 text-center">Tasks</span>
                  <span className="w-20 text-right">Progress</span>
                  <span className="w-6" />
                </div>
                {projects.map((p, i) => {
                  const st = STAGE_META[p.status] || STAGE_META.draft;
                  const pct = p.pct_complete != null ? Math.round(p.pct_complete) : 0;
                  return (
                    <a key={p.project_id || p.id} href={`/projects/${p.project_id || p.id}`}
                      className={`flex items-center px-5 py-3.5 group transition-colors hover:bg-[#253350] ax-enter ax-d${Math.min(i + 1, 5)}`}
                      style={{
                        borderBottom: i < projects.length - 1 ? '1px solid rgba(100,140,190,0.06)' : 'none',
                        textDecoration: 'none',
                      }}>
                      <span className="flex-1 min-w-0 flex items-center gap-2.5">
                        <Activity size={14} style={{ color: st.color }} />
                        <span className="text-[13px] font-medium truncate" style={{ color: '#dfe7ef' }}>
                          {p.title}
                        </span>
                      </span>
                      <span className="w-24 flex justify-center">
                        <span className="text-[11px] font-medium px-2.5 py-1 rounded-lg"
                          style={{ color: st.color, background: st.bg }}>
                          {st.label}
                        </span>
                      </span>
                      <span className="w-20 text-center text-[13px]" style={{ color: '#a3b8cc' }}>
                        {p.submitted_tasks ?? 0}<span style={{ color: '#4a6480' }}>/</span>{p.total_tasks ?? 0}
                      </span>
                      <span className="w-20 text-right">
                        {pct > 0 ? (
                          <span className="text-[13px] font-semibold" style={{ color: st.color }}>{pct}%</span>
                        ) : (
                          <span className="text-[13px]" style={{ color: '#4a6480' }}>—</span>
                        )}
                      </span>
                      <ChevronRight size={14} className="ml-1 shrink-0 opacity-0 group-hover:opacity-70 transition-opacity" style={{ color: '#00d4ff' }} />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Ring + Actions */}
          <div className="space-y-4">
            <div className="ax-card p-6 ax-enter ax-d2">
              <h3 className="text-[14px] font-semibold mb-5" style={{ color: '#a3b8cc' }}>
                Completion
              </h3>
              <div className="flex flex-col items-center">
                <ProgressRing pct={completionPct} size={100} stroke={7} />
                <div className="mt-4 text-center">
                  <p className="text-[15px] font-semibold" style={{ color: '#dfe7ef' }}>
                    {completedTasks} <span style={{ color: '#4a6480' }}>/</span> {totalTasks}
                  </p>
                  <p className="text-[12px] mt-1" style={{ color: '#7a95ae' }}>annotations submitted</p>
                </div>
              </div>
              <div className="mt-5 pt-4 space-y-3" style={{ borderTop: '1px solid rgba(100,140,190,0.08)' }}>
                {STAGE_ORDER.filter(s => pipeline[s].length > 0).map(stage => {
                  const meta = STAGE_META[stage];
                  return (
                    <div key={stage} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                        <span className="text-[13px]" style={{ color: '#a3b8cc' }}>{meta.label}</span>
                      </div>
                      <span className="text-[14px] font-semibold" style={{ color: meta.color }}>
                        {pipeline[stage].length}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="ax-card p-5 ax-enter ax-d3">
              <h3 className="text-[14px] font-semibold mb-3" style={{ color: '#a3b8cc' }}>
                Quick Actions
              </h3>
              <div className="space-y-2">
                {user.role === "requester" && (
                  <a href="/projects/new" className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-[#253350]"
                    style={{ border: '1px solid rgba(100,140,190,0.1)', textDecoration: 'none' }}>
                    <Plus size={16} style={{ color: '#00d4ff' }} />
                    <span className="text-[13px] font-medium" style={{ color: '#a3b8cc' }}>Create new project</span>
                  </a>
                )}
                {projects.filter(p => p.status === "active").length > 0 && (
                  <a href={`/projects/${projects.find(p => p.status === "active")?.project_id || projects.find(p => p.status === "active")?.id}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors hover:bg-[#253350]"
                    style={{ border: '1px solid rgba(100,140,190,0.1)', textDecoration: 'none' }}>
                    <TrendingUp size={16} style={{ color: '#34d399' }} />
                    <span className="text-[13px] font-medium" style={{ color: '#a3b8cc' }}>View active project</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
