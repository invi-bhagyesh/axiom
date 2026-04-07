"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useRouter, useParams } from "next/navigation";
import DynamicAnnotationForm from "@/components/DynamicAnnotationForm";

export default function AnnotateTask() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const taskId = params.taskId as string;

  const [task, setTask] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (user && taskId) {
      apiFetch(`/api/tasks/${taskId}`)
        .then(async (t) => {
          setTask(t);
          if (t.status === "pending") {
            await apiFetch(`/api/tasks/${taskId}/start`, { method: "PATCH" }).catch(() => {});
          }
        })
        .catch((e) => setError(e.message));
    }
  }, [user, loading, taskId, router]);

  const handleSubmit = async (responses: Record<string, any>) => {
    setSubmitting(true);
    setError("");
    try {
      await apiFetch(`/api/tasks/${taskId}/submit`, { method: "POST", body: JSON.stringify({ responses }) });
      router.push("/annotate");
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (loading || !user) return null;
  if (error && !task) return <div className="ax-card p-8 text-center" style={{ color: 'var(--ax-danger)' }}>{error}</div>;
  if (!task) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--ax-accent)', borderTopColor: 'transparent' }} />
    </div>
  );

  const itemData = typeof task.item_data === "string" ? JSON.parse(task.item_data) : task.item_data;
  const schemaFields = (task.schema_fields || []).map((f: any) => ({
    ...f,
    config: typeof f.config === "string" ? JSON.parse(f.config) : f.config,
  }));
  const isSubmitted = task.status === "submitted";
  const existingResponses = task.annotation?.responses
    ? (typeof task.annotation.responses === "string" ? JSON.parse(task.annotation.responses) : task.annotation.responses)
    : undefined;

  return (
    <div className="max-w-2xl mx-auto ax-animate">
      {/* Header */}
      <div className="mb-8">
        <a href="/annotate" className="text-xs font-mono uppercase tracking-wide hover:underline" style={{ color: 'var(--ax-text-muted)' }}>
          &larr; Back to queue
        </a>
        <h1 className="font-display text-2xl mt-3">{task.project_title}</h1>
        {task.external_id && (
          <span className="font-mono text-xs px-2 py-0.5 rounded mt-2 inline-block" style={{ background: 'var(--ax-surface)', border: '1px solid var(--ax-border)', color: 'var(--ax-text-muted)' }}>
            {task.external_id}
          </span>
        )}
      </div>

      {/* Item Data */}
      <div className="ax-card p-6 mb-6 relative ax-corner-accent">
        <h3 className="text-[10px] font-mono uppercase tracking-widest mb-4" style={{ color: 'var(--ax-text-muted)' }}>Item Data</h3>
        <div className="space-y-4">
          {Object.entries(itemData).map(([key, val]) => (
            <div key={key}>
              <p className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: 'var(--ax-accent-dim)' }}>
                {key.replace(/_/g, " ")}
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--ax-text)' }}>
                {String(val)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Annotation Form */}
      <div className="ax-card p-6">
        <h3 className="text-[10px] font-mono uppercase tracking-widest mb-6" style={{ color: 'var(--ax-text-muted)' }}>
          {isSubmitted ? "Your Submitted Response" : "Annotation"}
        </h3>
        {error && <p className="text-sm mb-4" style={{ color: 'var(--ax-danger)' }}>{error}</p>}
        {submitting ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--ax-accent)', borderTopColor: 'transparent' }} />
          </div>
        ) : (
          <DynamicAnnotationForm fields={schemaFields} initial={existingResponses} onSubmit={handleSubmit} readOnly={isSubmitted} />
        )}
      </div>
    </div>
  );
}
