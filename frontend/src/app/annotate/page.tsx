"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function AnnotateQueue() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (user) apiFetch("/api/tasks").then(setTasks).catch(console.error);
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div className="ax-animate">
      <div className="flex items-start justify-between mb-10">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: 'var(--ax-text-muted)' }}>Task Queue</p>
          <h1 className="font-display text-3xl">
            <span style={{ color: 'var(--ax-accent)' }}>{tasks.length}</span>{" "}
            pending task{tasks.length !== 1 ? "s" : ""}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <a href="/annotate/history" className="ax-btn ax-btn-ghost text-xs">History</a>
          <button onClick={logout} className="ax-btn ax-btn-ghost text-xs">Logout</button>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="ax-card p-16 text-center relative overflow-hidden">
          <div className="ax-dotgrid absolute inset-0 rounded-xl opacity-20" />
          <div className="relative">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mx-auto mb-4">
              <circle cx="24" cy="24" r="18" stroke="var(--ax-text-muted)" strokeWidth="1.5" strokeDasharray="4 3" />
              <path d="M24 18V30M18 24H30" stroke="var(--ax-text-muted)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="mb-1" style={{ color: 'var(--ax-text-secondary)' }}>No tasks in your queue.</p>
            <p className="text-sm" style={{ color: 'var(--ax-text-muted)' }}>Ask a requester to assign you to a project.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((t, i) => {
            const itemPreview = typeof t.item_data === "string" ? t.item_data : JSON.stringify(t.item_data || {});
            return (
              <a
                key={t.id}
                href={`/annotate/${t.id}`}
                className={`ax-card ax-card-interactive p-5 block group ax-animate ax-stagger-${Math.min(i + 1, 5)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold group-hover:translate-x-0.5 transition-transform">
                    {t.project_title}
                  </h2>
                  <span className="ax-badge" style={{
                    background: t.status === "in_progress" ? 'var(--ax-info-dim)' : 'var(--ax-surface-raised)',
                    color: t.status === "in_progress" ? 'var(--ax-info)' : 'var(--ax-text-muted)',
                  }}>
                    {t.status === "in_progress" ? "In Progress" : "Pending"}
                  </span>
                </div>
                <p className="font-mono text-xs truncate" style={{ color: 'var(--ax-text-muted)', maxWidth: '80%' }}>
                  {itemPreview.slice(0, 120)}
                </p>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
