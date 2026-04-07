"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { useRouter, useParams } from "next/navigation";
import DynamicAnnotationForm from "@/components/DynamicAnnotationForm";
import ItemDataRenderer from "@/components/ItemDataRenderer";
import { ArrowLeft, FileCheck } from "lucide-react";

export default function AnnotateTask() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const taskId = params.taskId as string;

  const [task, setTask] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (user && taskId) {
      apiFetch(`/api/tasks/${taskId}`)
        .then((t) => {
          setTask(t);
          if (t.status !== "submitted") {
            router.replace(`/annotate/project/${t.project_id}`);
          }
        })
        .catch((e) => setError(e.message));
    }
  }, [user, loading, taskId, router]);

  if (loading || !user) return null;
  if (error) return (
    <div className="max-w-2xl mx-auto ax-enter">
      <a href="/annotate" className="inline-flex items-center gap-1.5 text-[13px] mb-5"
        style={{ color: '#7a95ae', textDecoration: 'none' }}>
        <ArrowLeft size={14} /> Back
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
    ...f,
    config: typeof f.config === "string" ? JSON.parse(f.config) : f.config,
  }));
  const existingResponses = task.annotation?.responses
    ? (typeof task.annotation.responses === "string" ? JSON.parse(task.annotation.responses) : task.annotation.responses)
    : undefined;

  return (
    <div className="max-w-2xl mx-auto ax-enter">
      <a href="/annotate/history" className="inline-flex items-center gap-1.5 text-[13px] mb-5"
        style={{ color: '#7a95ae', textDecoration: 'none' }}>
        <ArrowLeft size={14} /> Back to history
      </a>

      <div className="mb-5">
        <h1 className="text-[22px] font-bold tracking-tight mb-2" style={{ color: '#edf2f7' }}>
          {task.project_title}
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-semibold px-3 py-1 rounded-lg"
            style={{ background: 'rgba(52,211,153,0.08)', color: '#34d399' }}>
            <span className="inline-flex items-center gap-1.5"><FileCheck size={12} /> Submitted</span>
          </span>
          {task.external_id && (
            <span className="text-[12px] px-2.5 py-1 rounded-lg" style={{ color: '#7a95ae', background: 'rgba(100,140,190,0.06)' }}>
              {task.external_id}
            </span>
          )}
        </div>
      </div>

      <div className="ax-card mb-4 overflow-hidden">
        <div className="px-5 py-3.5 text-[13px] font-semibold" style={{ color: '#a3b8cc', borderBottom: '1px solid rgba(100,140,190,0.08)' }}>
          Item data
        </div>
        <div className="p-5">
          <ItemDataRenderer data={itemData} />
        </div>
      </div>

      <div className="ax-card overflow-hidden">
        <div className="px-5 py-3.5 text-[13px] font-semibold" style={{ color: '#a3b8cc', borderBottom: '1px solid rgba(100,140,190,0.08)' }}>
          Submitted response
        </div>
        <div className="p-5">
          <DynamicAnnotationForm fields={schemaFields} initial={existingResponses} onSubmit={() => {}} readOnly />
        </div>
      </div>
    </div>
  );
}
