"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (user) apiFetch("/api/projects").then(setProjects).catch(console.error);
  }, [user, loading, router]);

  if (loading || !user) return null;

  const statusStyles: Record<string, { bg: string; color: string }> = {
    draft: { bg: 'var(--ax-surface-raised)', color: 'var(--ax-text-muted)' },
    active: { bg: 'var(--ax-info-dim)', color: 'var(--ax-info)' },
    paused: { bg: 'var(--ax-warn-dim)', color: 'var(--ax-warn)' },
    completed: { bg: 'var(--ax-success-dim)', color: 'var(--ax-success)' },
    archived: { bg: 'var(--ax-danger-dim)', color: 'var(--ax-danger)' },
  };

  return (
    <div className="ax-animate">
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--ax-text-muted)' }}>Dashboard</p>
          <h1 className="font-display text-3xl">
            Welcome, <span style={{ color: 'var(--ax-accent)' }}>{user.display_name}</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {user.role === "requester" && (
            <a href="/projects/new" className="ax-btn ax-btn-primary">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              New Project
            </a>
          )}
          <button onClick={logout} className="ax-btn ax-btn-ghost">Logout</button>
        </div>
      </div>

      {/* Projects */}
      {projects.length === 0 ? (
        <div className="ax-card p-16 text-center ax-animate ax-stagger-1">
          <div className="ax-dotgrid absolute inset-0 rounded-xl opacity-30" />
          <div className="relative">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto mb-4">
              <rect x="8" y="12" width="32" height="28" rx="4" stroke="var(--ax-text-muted)" strokeWidth="1.5" strokeDasharray="4 3" />
              <path d="M20 24H28M24 20V28" stroke="var(--ax-text-muted)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p style={{ color: 'var(--ax-text-muted)' }} className="mb-3">No projects yet.</p>
            {user.role === "requester" && (
              <a href="/projects/new" className="text-sm font-medium hover:underline" style={{ color: 'var(--ax-accent)' }}>
                Create your first project
              </a>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {projects.map((p: any, i: number) => {
            const st = statusStyles[p.status] || statusStyles.draft;
            return (
              <a
                key={p.project_id || p.id}
                href={`/projects/${p.project_id || p.id}`}
                className={`ax-card ax-card-interactive p-5 block ax-animate ax-stagger-${Math.min(i + 1, 5)} relative overflow-hidden group`}
              >
                {/* Accent line */}
                <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl transition-all group-hover:w-1.5" style={{ background: st.color }} />

                <div className="pl-4">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-base font-semibold group-hover:translate-x-0.5 transition-transform" style={{ color: 'var(--ax-text)' }}>
                      {p.title}
                    </h2>
                    <span className="ax-badge" style={{ background: st.bg, color: st.color }}>
                      {p.status}
                    </span>
                  </div>

                  {p.pct_complete != null && (
                    <div className="ax-progress mt-3 mb-2">
                      <div className="ax-progress-bar" style={{ width: `${p.pct_complete || 0}%` }} />
                    </div>
                  )}

                  <div className="flex gap-5 mt-3 text-xs" style={{ color: 'var(--ax-text-muted)' }}>
                    {p.total_tasks != null && (
                      <span className="font-mono">{p.submitted_tasks}/{p.total_tasks} tasks</span>
                    )}
                    {p.flagged_items != null && p.flagged_items > 0 && (
                      <span style={{ color: 'var(--ax-danger)' }}>
                        {p.flagged_items} flagged
                      </span>
                    )}
                    {p.deadline && (
                      <span>Due {new Date(p.deadline).toLocaleDateString()}</span>
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
