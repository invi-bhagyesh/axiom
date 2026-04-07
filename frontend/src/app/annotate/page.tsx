"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { ChevronRight, History, LogOut, Activity } from "lucide-react";

interface ProjectGroup {
  project_id: string;
  title: string;
  description: string | null;
  project_status: string;
  total_tasks: number;
  completed_tasks: number;
  remaining_tasks: number;
}

export default function AnnotateQueue() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectGroup[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (user) apiFetch("/api/tasks/projects").then(setProjects).catch(console.error);
  }, [user, loading, router]);

  if (loading || !user) return null;

  const totalRemaining = projects.reduce((s, p) => s + p.remaining_tasks, 0);

  return (
    <div className="ax-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight" style={{ color: '#edf2f7' }}>
            My Assignments
          </h1>
          <p className="text-[13px] mt-1.5" style={{ color: '#7a95ae' }}>
            {projects.length} project{projects.length !== 1 ? "s" : ""} · <span style={{ color: '#00d4ff' }}>{totalRemaining}</span> tasks remaining
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/annotate/history" className="ax-btn ax-btn-secondary"><History size={13} /> History</a>
          <button onClick={logout} className="ax-btn ax-btn-ghost"><LogOut size={13} /> Sign out</button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="ax-card p-14 text-center ax-enter ax-d1">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
            style={{ background: '#253350' }}>
            <Activity className="w-7 h-7" style={{ color: '#00d4ff' }} />
          </div>
          <p className="text-[16px] font-semibold mb-2" style={{ color: '#dfe7ef' }}>
            No assignments yet
          </p>
          <p className="text-[14px]" style={{ color: '#7a95ae' }}>
            Ask a requester to enroll you in a project.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p, i) => {
            const pct = p.total_tasks > 0 ? Math.round((p.completed_tasks / p.total_tasks) * 100) : 0;
            const isPaused = p.project_status === "paused";

            return (
              <a key={p.project_id} href={`/annotate/project/${p.project_id}`}
                className={`block group ax-card transition-all ax-enter ax-d${Math.min(i + 1, 5)}`}
                style={{ opacity: isPaused ? 0.6 : 1, textDecoration: 'none' }}>
                <div className="p-5">
                  {/* Title row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Activity size={16} style={{ color: isPaused ? '#fbbf24' : '#00d4ff' }} />
                      <h2 className="text-[14px] font-semibold truncate" style={{ color: '#dfe7ef' }}>
                        {p.title}
                      </h2>
                      {isPaused && (
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                          style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.08)' }}>
                          Paused
                        </span>
                      )}
                    </div>
                    <ChevronRight size={16} className="shrink-0 opacity-0 group-hover:opacity-70 transition-all"
                      style={{ color: '#00d4ff' }} />
                  </div>

                  {/* Progress row */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(100,140,190,0.1)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: '#00d4ff' }} />
                    </div>
                    <span className="text-[13px] font-medium shrink-0" style={{ color: '#a3b8cc' }}>
                      {p.completed_tasks}<span style={{ color: '#4a6480' }}>/</span>{p.total_tasks}
                    </span>
                    {!isPaused && p.remaining_tasks > 0 && (
                      <span className="text-[12px] shrink-0" style={{ color: '#7a95ae' }}>
                        {p.remaining_tasks} left
                      </span>
                    )}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
