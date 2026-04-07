"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function NewProject() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [minAnn, setMinAnn] = useState(3);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const project = await apiFetch("/api/projects", {
        method: "POST",
        body: JSON.stringify({ title, description, min_annotations_per_item: minAnn }),
      });
      router.push(`/projects/${project.id}`);
    } catch (err: any) { setError(err.message); setLoading(false); }
  };

  return (
    <div className="max-w-lg mx-auto ax-enter">
      <a href="/dashboard" className="ax-btn ax-btn-ghost ax-btn-sm mb-5 -ml-2"><ArrowLeft size={11} /> projects</a>

      <div className="mb-5">
        <p className="text-[10px] tracking-[0.15em] uppercase mb-1.5" style={{ color: 'rgba(100,170,200,0.18)' }}>
          Def. (New Project)
        </p>
        <h1 className="font-display text-[24px] font-light tracking-tight leading-none" style={{ color: 'rgba(180,220,240,0.85)' }}>
          Create Project
        </h1>
        <p className="text-[11px] mt-2" style={{ color: 'rgba(100,170,200,0.28)' }}>
          Configure schema and data after creation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="ax-terminal">
        <div className="ax-terminal-header">project config</div>
        <div className="ax-terminal-body space-y-4">
          {error && (
            <div className="ax-card p-3 text-[12px] font-medium" style={{ borderColor: 'rgba(255,107,107,0.15)', color: 'var(--ax-red)' }}>{error}</div>
          )}
          <div>
            <label className="ax-label">Project Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="ax-input" placeholder="e.g. Persona Consistency Evaluation" required autoFocus />
          </div>
          <div>
            <label className="ax-label">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              className="ax-input" placeholder="Describe the annotation task and goals..." />
          </div>
          <div>
            <label className="ax-label">Min Annotations per Item</label>
            <input type="number" value={minAnn} onChange={(e) => setMinAnn(Number(e.target.value))}
              className="ax-input" style={{ maxWidth: 100 }} min={1} max={10} />
            <p className="text-[10px] mt-1.5" style={{ color: 'rgba(100,170,200,0.2)' }}>
              each item will be assigned to this many annotators
            </p>
          </div>
          <button type="submit" disabled={loading} className="ax-btn ax-btn-primary w-full" style={{ height: 40 }}>
            {loading ? <span className="inline-block w-3 h-3 border rounded-full animate-spin" style={{ borderColor: 'rgba(0,200,240,0.2)', borderTopColor: '#00d4ff' }} /> : "Create Project"}
          </button>
        </div>
      </form>
    </div>
  );
}
