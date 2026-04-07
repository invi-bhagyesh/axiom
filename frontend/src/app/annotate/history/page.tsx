"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function AnnotationHistory() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (user) apiFetch("/api/tasks/history").then(setTasks).catch(console.error);
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div className="ax-animate">
      <div className="flex items-start justify-between mb-10">
        <div>
          <a href="/annotate" className="text-xs font-mono uppercase tracking-wide hover:underline" style={{ color: 'var(--ax-text-muted)' }}>
            &larr; Task Queue
          </a>
          <h1 className="font-display text-3xl mt-3">History</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--ax-text-muted)' }}>
            {tasks.length} completed annotation{tasks.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="ax-card p-16 text-center">
          <p style={{ color: 'var(--ax-text-muted)' }}>No completed annotations yet.</p>
        </div>
      ) : (
        <div className="ax-card divide-y" style={{ borderColor: 'var(--ax-border)' }}>
          {tasks.map((t, i) => (
            <a
              key={t.id}
              href={`/annotate/${t.id}`}
              className={`p-4 flex items-center justify-between transition-colors block ax-animate ax-stagger-${Math.min(i + 1, 5)}`}
              style={{ borderColor: 'var(--ax-border-subtle)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--ax-surface-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--ax-success)' }} />
                <div>
                  <p className="text-sm font-medium">{t.project_title}</p>
                  <p className="text-xs font-mono" style={{ color: 'var(--ax-text-muted)' }}>
                    {t.submitted_at ? new Date(t.submitted_at).toLocaleString() : ""}
                  </p>
                </div>
              </div>
              <span className="ax-badge" style={{ background: 'var(--ax-success-dim)', color: 'var(--ax-success)' }}>
                submitted
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
