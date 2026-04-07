"use client";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";

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
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto ax-animate">
      <div className="mb-8">
        <a href="/dashboard" className="text-xs font-mono uppercase tracking-wide hover:underline" style={{ color: 'var(--ax-text-muted)' }}>
          &larr; Dashboard
        </a>
        <h1 className="font-display text-3xl mt-3">New Project</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--ax-text-muted)' }}>
          Define your annotation project. You can add schema fields and data after creation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="ax-card p-8 space-y-6 relative ax-corner-accent">
        {error && (
          <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--ax-danger-dim)', color: 'var(--ax-danger)', border: '1px solid rgba(240,96,96,0.2)' }}>
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--ax-text-muted)' }}>Project Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            className="ax-input" placeholder="e.g. Persona Consistency Evaluation" required autoFocus />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--ax-text-muted)' }}>Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            className="ax-input" placeholder="Describe the annotation task and goals..." />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--ax-text-muted)' }}>
            Min Annotations per Item
          </label>
          <input type="number" value={minAnn} onChange={(e) => setMinAnn(Number(e.target.value))}
            className="ax-input" style={{ maxWidth: 120 }} min={1} max={10} />
          <p className="text-xs" style={{ color: 'var(--ax-text-muted)' }}>
            Each dataset item will be assigned to this many annotators
          </p>
        </div>

        <button type="submit" disabled={loading} className="ax-btn ax-btn-primary w-full" style={{ height: 46 }}>
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--ax-bg)', borderTopColor: 'transparent' }} />
          ) : "Create Project"}
        </button>
      </form>
    </div>
  );
}
