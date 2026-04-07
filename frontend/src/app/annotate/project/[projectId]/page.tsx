"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useRouter, useParams } from "next/navigation";
import DynamicAnnotationForm from "@/components/DynamicAnnotationForm";
import ItemDataRenderer from "@/components/ItemDataRenderer";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

interface TaskData {
  id: string;
  project_id: string;
  project_title: string;
  item_data: any;
  external_id?: string;
  schema_fields: any[];
  progress_total: number;
  progress_completed: number;
  done?: boolean;
}

function ProgressBar({ pct }: { pct: number }) {
  return (
    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(100,140,190,0.1)' }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: '#00d4ff' }} />
    </div>
  );
}

export default function ProjectAnnotationFlow() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [task, setTask] = useState<TaskData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [allDone, setAllDone] = useState(false);

  const fetchNext = useCallback(async () => {
    try {
      setError("");
      const t = await apiFetch(`/api/tasks/projects/${projectId}/next`);
      if (t.done) { setAllDone(true); setTask(null); }
      else {
        setTask(t); setAllDone(false);
        if (t.status === "pending") await apiFetch(`/api/tasks/${t.id}/start`, { method: "PATCH" }).catch(() => {});
      }
    } catch (e: any) { setError(e.message); }
  }, [projectId]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (user && projectId) fetchNext();
  }, [user, loading, projectId, router, fetchNext]);

  const handleSubmit = async (responses: Record<string, any>) => {
    if (!task) return;
    setSubmitting(true); setError("");
    try {
      await apiFetch(`/api/tasks/${task.id}/submit`, { method: "POST", body: JSON.stringify({ responses }) });
      setJustSubmitted(true);
      setTimeout(async () => { setJustSubmitted(false); setSubmitting(false); await fetchNext(); }, 600);
    } catch (err: any) { setError(err.message); setSubmitting(false); }
  };

  if (loading || !user) return null;

  const progressTotal = task?.progress_total || 0;
  const progressCompleted = task?.progress_completed || 0;
  const currentNumber = progressCompleted + 1;
  const pct = progressTotal > 0 ? Math.round((progressCompleted / progressTotal) * 100) : 0;

  if (allDone) {
    return (
      <div className="max-w-2xl mx-auto ax-enter">
        <a href="/annotate" className="inline-flex items-center gap-1.5 text-[13px] mb-5 transition-colors"
          style={{ color: '#7a95ae', textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Back to assignments
        </a>
        <div className="ax-card p-14 text-center ax-enter ax-d1">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
            style={{ background: 'rgba(52,211,153,0.1)' }}>
            <CheckCircle2 size={32} style={{ color: '#34d399' }} />
          </div>
          <p className="text-[18px] font-semibold mb-2" style={{ color: '#dfe7ef' }}>All done!</p>
          <p className="text-[14px] mb-6" style={{ color: '#a3b8cc' }}>
            You completed all {progressTotal} annotation{progressTotal !== 1 ? "s" : ""} for this project.
          </p>
          <a href="/annotate" className="ax-btn ax-btn-primary inline-flex">Back to assignments</a>
        </div>
      </div>
    );
  }

  if (error && !task) return (
    <div className="max-w-2xl mx-auto ax-enter">
      <a href="/annotate" className="inline-flex items-center gap-1.5 text-[13px] mb-5 transition-colors"
        style={{ color: '#7a95ae', textDecoration: 'none' }}>
        <ArrowLeft size={14} /> Back to assignments
      </a>
      <div className="ax-card p-6 text-center text-[13px]" style={{ color: '#f87171' }}>{error}</div>
    </div>
  );

  if (!task) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(0,212,255,0.2)', borderTopColor: '#00d4ff' }} />
    </div>
  );

  const itemData = typeof task.item_data === "string" ? JSON.parse(task.item_data) : task.item_data;
  const schemaFields = (task.schema_fields || []).map((f: any) => ({
    ...f, config: typeof f.config === "string" ? JSON.parse(f.config) : f.config,
  }));

  return (
    <div className="max-w-2xl mx-auto ax-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <a href="/annotate" className="inline-flex items-center gap-1.5 text-[13px] transition-colors"
          style={{ color: '#7a95ae', textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Back
        </a>
        <div className="flex items-center gap-2 text-[13px]" style={{ color: '#a3b8cc' }}>
          <CheckCircle2 size={14} style={{ color: '#34d399' }} />
          {progressCompleted}/{progressTotal}
        </div>
      </div>

      {/* Title + progress */}
      <div className="mb-5">
        <h1 className="text-[22px] font-bold tracking-tight mb-3" style={{ color: '#edf2f7' }}>
          {task.project_title}
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex-1"><ProgressBar pct={pct} /></div>
          <span className="text-[13px] font-semibold shrink-0" style={{ color: '#00d4ff' }}>{pct}%</span>
        </div>
      </div>

      {/* Task counter */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-[12px] font-semibold px-3 py-1 rounded-lg"
          style={{ color: '#00d4ff', background: 'rgba(0,212,255,0.08)' }}>
          Task {currentNumber} of {progressTotal}
        </span>
        {task.external_id && (
          <span className="text-[12px] px-2.5 py-1 rounded-lg" style={{ color: '#7a95ae', background: 'rgba(100,140,190,0.06)' }}>
            {task.external_id}
          </span>
        )}
      </div>

      {/* Success flash */}
      {justSubmitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 px-5 py-3 rounded-xl text-[13px] font-medium ax-enter"
            style={{ background: '#1e2940', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
            <CheckCircle2 size={16} /> Submitted!
          </div>
        </div>
      )}

      {/* Item data */}
      <div className="ax-card mb-4 overflow-hidden">
        <div className="px-5 py-3.5 text-[13px] font-semibold" style={{ color: '#a3b8cc', borderBottom: '1px solid rgba(100,140,190,0.08)' }}>
          Item data
        </div>
        <div className="p-5"><ItemDataRenderer data={itemData} /></div>
      </div>

      {/* Annotation form */}
      <div className="ax-card overflow-hidden">
        <div className="px-5 py-3.5 text-[13px] font-semibold" style={{ color: '#a3b8cc', borderBottom: '1px solid rgba(100,140,190,0.08)' }}>
          Annotation
        </div>
        <div className="p-5">
          {error && (
            <div className="rounded-lg p-3 text-[13px] font-medium mb-4" style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171' }}>
              {error}
            </div>
          )}
          {submitting ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(0,212,255,0.2)', borderTopColor: '#00d4ff' }} />
            </div>
          ) : (
            <DynamicAnnotationForm key={task.id} fields={schemaFields} onSubmit={handleSubmit}
              submitLabel={currentNumber < progressTotal ? "Submit & Next" : "Submit Final"} />
          )}
        </div>
      </div>

      {progressTotal > 1 && (
        <p className="text-center text-[12px] mt-4" style={{ color: '#7a95ae' }}>
          Press submit to advance to the next item
        </p>
      )}
    </div>
  );
}
