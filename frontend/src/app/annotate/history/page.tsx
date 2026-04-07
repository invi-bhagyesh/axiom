"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react";

interface HistoryProject {
  project_id: string;
  title: string;
  completed_tasks: number;
  last_submitted: string | null;
}

export default function AnnotationHistory() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<HistoryProject[]>([]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (user) apiFetch("/api/tasks/history/projects").then(setProjects).catch(console.error);
  }, [user, loading, router]);

  if (loading || !user) return null;

  const totalAnnotations = projects.reduce((s, p) => s + p.completed_tasks, 0);

  return (
    <div className="ax-enter">
      <a href="/annotate" className="inline-flex items-center gap-1.5 text-[13px] mb-5 transition-colors"
        style={{ color: '#7a95ae', textDecoration: 'none' }}>
        <ArrowLeft size={14} /> Back to assignments
      </a>

      <div className="mb-6">
        <h1 className="text-[26px] font-bold tracking-tight" style={{ color: '#edf2f7' }}>
          History
        </h1>
        <p className="text-[13px] mt-1.5" style={{ color: '#7a95ae' }}>
          <span style={{ color: '#34d399' }}>{totalAnnotations}</span> annotations across {projects.length} project{projects.length !== 1 ? "s" : ""}
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="ax-card p-14 text-center ax-enter ax-d1">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
            style={{ background: '#253350' }}>
            <CheckCircle2 size={32} style={{ color: '#4a6480' }} />
          </div>
          <p className="text-[16px] font-semibold mb-2" style={{ color: '#dfe7ef' }}>
            No history yet
          </p>
          <p className="text-[14px]" style={{ color: '#7a95ae' }}>
            Complete some annotation tasks to see them here.
          </p>
        </div>
      ) : (
        <div className="ax-card overflow-hidden">
          <div className="flex items-center px-5 py-3 text-[12px] font-medium"
            style={{ color: '#7a95ae', borderBottom: '1px solid rgba(100,140,190,0.08)' }}>
            <span className="flex-1">Project</span>
            <span className="w-28 text-center">Completed</span>
            <span className="w-36 text-right">Last submitted</span>
          </div>
          {projects.map((p, i) => (
            <a key={p.project_id} href={`/annotate/project/${p.project_id}`}
              className={`flex items-center px-5 py-4 group transition-colors hover:bg-[#253350] ax-enter ax-d${Math.min(i + 1, 5)}`}
              style={{
                borderBottom: i < projects.length - 1 ? '1px solid rgba(100,140,190,0.06)' : 'none',
                textDecoration: 'none',
              }}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <CheckCircle2 size={14} style={{ color: '#34d399' }} />
                <span className="text-[13px] font-medium truncate" style={{ color: '#dfe7ef' }}>{p.title}</span>
              </div>
              <span className="w-28 text-center">
                <span className="text-[12px] font-semibold px-2.5 py-1 rounded-lg"
                  style={{ background: 'rgba(52,211,153,0.08)', color: '#34d399' }}>
                  {p.completed_tasks} done
                </span>
              </span>
              <span className="w-36 text-right flex items-center justify-end gap-2">
                <Clock size={12} style={{ color: '#7a95ae' }} />
                <span className="text-[12px]" style={{ color: '#a3b8cc' }}>
                  {p.last_submitted ? new Date(p.last_submitted).toLocaleDateString() : "—"}
                </span>
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
