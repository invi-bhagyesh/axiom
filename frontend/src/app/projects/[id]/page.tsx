"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiFetch, apiUpload } from "@/lib/api";
import { useRouter, useParams } from "next/navigation";

type Tab = "overview" | "schema" | "data" | "annotators" | "results";

export default function ProjectDetail() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [error, setError] = useState("");

  const reload = () => apiFetch(`/api/projects/${projectId}`).then(setProject).catch((e) => setError(e.message));

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (user && projectId) reload();
  }, [user, loading, projectId, router]);

  if (loading || !user || !project) return null;

  const tabs: Tab[] = user.role === "requester"
    ? ["overview", "schema", "data", "annotators", "results"]
    : ["overview"];

  const tabIcons: Record<Tab, string> = {
    overview: "M3 12L12 3L21 12M5 10V20H19V10",
    schema: "M4 5H20M4 12H20M4 19H12",
    data: "M4 7V17C4 18.1 4.9 19 6 19H18C19.1 19 20 18.1 20 17V7M4 7L8 3H16L20 7M4 7H20",
    annotators: "M17 21V19C17 16.8 15.2 15 13 15H5C2.8 15 1 16.8 1 19V21M23 21V19C23 17.9 22.2 16.9 21 16.5M16 3.5C17.2 3.9 18 4.9 18 6S17.2 8.1 16 8.5M9 11C11.2 11 13 9.2 13 7S11.2 3 9 3S5 4.8 5 7S6.8 11 9 11Z",
    results: "M18 20V10M12 20V4M6 20V14",
  };

  return (
    <div className="ax-animate">
      {/* Breadcrumb + Header */}
      <div className="mb-8">
        <a href="/dashboard" className="text-xs font-mono uppercase tracking-wide hover:underline" style={{ color: 'var(--ax-text-muted)' }}>
          &larr; Dashboard
        </a>
        <div className="flex items-start justify-between mt-3">
          <div>
            <h1 className="font-display text-3xl">{project.title}</h1>
            {project.description && <p className="text-sm mt-1" style={{ color: 'var(--ax-text-secondary)' }}>{project.description}</p>}
          </div>
          <StatusBadge status={project.status} />
        </div>
      </div>

      {error && (
        <div className="rounded-lg px-4 py-3 text-sm mb-6" style={{ background: 'var(--ax-danger-dim)', color: 'var(--ax-danger)' }}>
          {error}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 mb-8 pb-px" style={{ borderBottom: '1px solid var(--ax-border)' }}>
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium capitalize transition-all relative"
            style={{
              color: tab === t ? 'var(--ax-accent)' : 'var(--ax-text-muted)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d={tabIcons[t]} />
            </svg>
            {t}
            {tab === t && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ background: 'var(--ax-accent)' }} />
            )}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab project={project} projectId={projectId} reload={reload} />}
      {tab === "schema" && <SchemaTab projectId={projectId} fields={project.schema_fields || []} onUpdate={reload} isDraft={project.status === "draft"} />}
      {tab === "data" && <DataTab projectId={projectId} />}
      {tab === "annotators" && <AnnotatorsTab projectId={projectId} />}
      {tab === "results" && <ResultsTab projectId={projectId} />}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    draft: { bg: 'var(--ax-surface-raised)', color: 'var(--ax-text-muted)' },
    active: { bg: 'var(--ax-info-dim)', color: 'var(--ax-info)' },
    paused: { bg: 'var(--ax-warn-dim)', color: 'var(--ax-warn)' },
    completed: { bg: 'var(--ax-success-dim)', color: 'var(--ax-success)' },
    archived: { bg: 'var(--ax-danger-dim)', color: 'var(--ax-danger)' },
  };
  const s = styles[status] || styles.draft;
  return <span className="ax-badge" style={{ background: s.bg, color: s.color }}>{status}</span>;
}

function Stat({ label, value, accent }: { label: string; value: any; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: 'var(--ax-text-muted)' }}>{label}</p>
      <p className="text-xl font-semibold capitalize" style={{ color: accent ? 'var(--ax-accent)' : 'var(--ax-text)' }}>{String(value)}</p>
    </div>
  );
}

/* ───────── Overview ───────── */
function OverviewTab({ project, projectId, reload }: { project: any; projectId: string; reload: () => void }) {
  const [progress, setProgress] = useState<any>(null);

  useEffect(() => {
    apiFetch(`/api/projects/${projectId}/progress`).then(setProgress).catch(() => {});
  }, [projectId]);

  const handleStatus = async (status: string) => {
    await apiFetch(`/api/projects/${projectId}`, { method: "PATCH", body: JSON.stringify({ status }) });
    reload();
  };

  return (
    <div className="space-y-6 ax-animate">
      <div className="ax-card p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
        <Stat label="Status" value={project.status} />
        <Stat label="Min Annotations" value={project.min_annotations_per_item} accent />
        <Stat label="Schema Fields" value={project.schema_fields?.length || 0} />
        <Stat label="Deadline" value={project.deadline ? new Date(project.deadline).toLocaleDateString() : "None"} />
      </div>

      {progress && (
        <div className="ax-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--ax-text-muted)' }}>Progress</h3>
            <span className="font-mono text-sm font-semibold" style={{ color: 'var(--ax-accent)' }}>
              {progress.pct_complete?.toFixed(0) || 0}%
            </span>
          </div>
          <div className="ax-progress mb-5">
            <div className="ax-progress-bar" style={{ width: `${progress.pct_complete || 0}%` }} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Total Tasks" value={progress.total_tasks || 0} />
            <Stat label="Submitted" value={progress.submitted_tasks || 0} />
            <Stat label="Flagged" value={progress.flagged_items || 0} />
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {project.status === "draft" && (
          <button onClick={() => handleStatus("active")} className="ax-btn ax-btn-primary">Activate Project</button>
        )}
        {project.status === "active" && (
          <button onClick={() => handleStatus("paused")} className="ax-btn ax-btn-ghost" style={{ borderColor: 'var(--ax-warn)', color: 'var(--ax-warn)' }}>Pause</button>
        )}
        {project.status === "paused" && (
          <button onClick={() => handleStatus("active")} className="ax-btn ax-btn-primary">Resume</button>
        )}
        {(project.status === "active" || project.status === "paused") && (
          <button onClick={() => handleStatus("completed")} className="ax-btn ax-btn-ghost" style={{ borderColor: 'var(--ax-success)', color: 'var(--ax-success)' }}>Mark Completed</button>
        )}
      </div>
    </div>
  );
}

/* ───────── Schema ───────── */
function SchemaTab({ projectId, fields, onUpdate, isDraft }: { projectId: string; fields: any[]; onUpdate: () => void; isDraft: boolean }) {
  const [showAdd, setShowAdd] = useState(false);
  const [fieldKey, setFieldKey] = useState("");
  const [label, setLabel] = useState("");
  const [desc, setDesc] = useState("");
  const [fieldType, setFieldType] = useState("likert");
  const [config, setConfig] = useState('{"min":1,"max":5,"labels":["Strongly Disagree","Disagree","Neutral","Agree","Strongly Agree"]}');
  const [error, setError] = useState("");

  const typeConfigs: Record<string, string> = {
    likert: '{"min":1,"max":5,"labels":["Strongly Disagree","Disagree","Neutral","Agree","Strongly Agree"]}',
    boolean: "{}",
    free_text: "{}",
    multi_select: '{"options":["Option A","Option B","Option C"]}',
  };

  const fieldTypeLabels: Record<string, { icon: string; color: string }> = {
    likert: { icon: "1-5", color: 'var(--ax-info)' },
    boolean: { icon: "T/F", color: 'var(--ax-success)' },
    free_text: { icon: "Aa", color: 'var(--ax-accent)' },
    multi_select: { icon: "[ ]", color: 'var(--ax-warn)' },
  };

  const addField = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await apiFetch(`/api/projects/${projectId}/schema`, {
        method: "POST",
        body: JSON.stringify({ field_key: fieldKey, label, description: desc || null, field_type: fieldType, is_required: true, position: fields.length, config: JSON.parse(config) }),
      });
      setFieldKey(""); setLabel(""); setDesc(""); setShowAdd(false);
      onUpdate();
    } catch (err: any) { setError(err.message); }
  };

  const deleteField = async (fieldId: string) => {
    await apiFetch(`/api/projects/${projectId}/schema/${fieldId}`, { method: "DELETE" });
    onUpdate();
  };

  return (
    <div className="space-y-4 ax-animate">
      {fields.length === 0 ? (
        <div className="ax-card p-12 text-center">
          <p style={{ color: 'var(--ax-text-muted)' }}>No schema fields defined yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {fields.map((f: any, i: number) => {
            const ft = fieldTypeLabels[f.field_type] || fieldTypeLabels.free_text;
            return (
              <div key={f.id} className={`ax-card p-4 flex items-center justify-between ax-animate ax-stagger-${Math.min(i + 1, 5)}`}>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs font-bold w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--ax-surface-raised)', color: ft.color }}>
                    {ft.icon}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{f.label}
                      <span className="font-mono text-xs ml-2" style={{ color: 'var(--ax-text-muted)' }}>{f.field_key}</span>
                    </p>
                    {f.description && <p className="text-xs mt-0.5" style={{ color: 'var(--ax-text-muted)' }}>{f.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="ax-badge" style={{ background: f.is_required ? 'var(--ax-accent-glow)' : 'var(--ax-surface)', color: f.is_required ? 'var(--ax-accent)' : 'var(--ax-text-muted)' }}>
                    {f.is_required ? "required" : "optional"}
                  </span>
                  {isDraft && (
                    <button onClick={() => deleteField(f.id)} className="text-xs hover:underline" style={{ color: 'var(--ax-danger)' }}>Remove</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isDraft && !showAdd && (
        <button onClick={() => setShowAdd(true)} className="ax-btn ax-btn-primary">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          Add Field
        </button>
      )}

      {showAdd && (
        <form onSubmit={addField} className="ax-card p-6 space-y-4 relative ax-corner-accent ax-animate-scale">
          {error && <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--ax-danger-dim)', color: 'var(--ax-danger)' }}>{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--ax-text-muted)' }}>Field Key</label>
              <input value={fieldKey} onChange={(e) => setFieldKey(e.target.value)} className="ax-input" placeholder="persona_score" required />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--ax-text-muted)' }}>Label</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)} className="ax-input" placeholder="Persona Consistency" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--ax-text-muted)' }}>Description</label>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} className="ax-input" placeholder="Optional description..." />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--ax-text-muted)' }}>Field Type</label>
            <select value={fieldType} onChange={(e) => { setFieldType(e.target.value); setConfig(typeConfigs[e.target.value] || "{}"); }} className="ax-input">
              <option value="likert">Likert Scale</option>
              <option value="boolean">Boolean (Yes/No)</option>
              <option value="free_text">Free Text</option>
              <option value="multi_select">Multi Select</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--ax-text-muted)' }}>Config JSON</label>
            <textarea value={config} onChange={(e) => setConfig(e.target.value)} className="ax-input font-mono text-xs" style={{ minHeight: 64 }} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="ax-btn ax-btn-primary">Save Field</button>
            <button type="button" onClick={() => setShowAdd(false)} className="ax-btn ax-btn-ghost">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ───────── Data ───────── */
function DataTab({ projectId }: { projectId: string }) {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [selectedDs, setSelectedDs] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState("");

  const loadDatasets = () => apiFetch(`/api/projects/${projectId}/datasets`).then(setDatasets).catch(() => {});
  useEffect(() => { loadDatasets(); }, [projectId]);

  const createDataset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    await apiFetch(`/api/projects/${projectId}/datasets`, { method: "POST", body: JSON.stringify({ name: newName }) });
    setNewName("");
    loadDatasets();
  };

  const handleUpload = async (datasetId: string, file: File) => {
    setUploading(true); setUploadResult("");
    try {
      const res = await apiUpload(`/api/projects/${projectId}/datasets/${datasetId}/upload`, file);
      setUploadResult(`Uploaded ${res.uploaded} items`);
      loadItems(datasetId);
    } catch (err: any) { setUploadResult(err.message); }
    setUploading(false);
  };

  const loadItems = (datasetId: string) => {
    setSelectedDs(datasetId);
    apiFetch(`/api/projects/${projectId}/datasets/${datasetId}/items`).then((r) => setItems(r.items)).catch(() => {});
  };

  return (
    <div className="space-y-4 ax-animate">
      <form onSubmit={createDataset} className="flex gap-2">
        <input placeholder="Dataset name..." value={newName} onChange={(e) => setNewName(e.target.value)} className="ax-input" style={{ maxWidth: 300 }} />
        <button type="submit" className="ax-btn ax-btn-primary">Create</button>
      </form>

      {datasets.map((ds) => (
        <div key={ds.id} className="ax-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ax-accent)" strokeWidth="1.5"><path d="M4 7V17C4 18.1 4.9 19 6 19H18C19.1 19 20 18.1 20 17V7M4 7L8 3H16L20 7M4 7H20" /></svg>
              {ds.name}
            </h3>
            <div className="flex gap-2 items-center">
              <label className="ax-btn ax-btn-ghost text-xs cursor-pointer" style={{ padding: '6px 12px' }}>
                {uploading ? "Uploading..." : "Upload JSON"}
                <input type="file" accept=".json" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(ds.id, e.target.files[0])} />
              </label>
              <button onClick={() => loadItems(ds.id)} className="text-xs font-medium hover:underline" style={{ color: 'var(--ax-info)' }}>View Items</button>
            </div>
          </div>

          {uploadResult && selectedDs === ds.id && (
            <p className="text-xs mb-3" style={{ color: 'var(--ax-success)' }}>{uploadResult}</p>
          )}

          {selectedDs === ds.id && items.length > 0 && (
            <div className="max-h-64 overflow-auto rounded-lg" style={{ background: 'var(--ax-bg)' }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--ax-border)' }}>
                    <th className="py-2 px-3 text-left font-mono uppercase tracking-wide" style={{ color: 'var(--ax-text-muted)' }}>#</th>
                    <th className="py-2 px-3 text-left font-mono uppercase tracking-wide" style={{ color: 'var(--ax-text-muted)' }}>ID</th>
                    <th className="py-2 px-3 text-left font-mono uppercase tracking-wide" style={{ color: 'var(--ax-text-muted)' }}>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--ax-border-subtle)' }}>
                      <td className="py-2 px-3" style={{ color: 'var(--ax-text-muted)' }}>{i + 1}</td>
                      <td className="py-2 px-3 font-mono">{item.external_id || "—"}</td>
                      <td className="py-2 px-3 font-mono truncate" style={{ maxWidth: 400, color: 'var(--ax-text-secondary)' }}>
                        {typeof item.item_data === "string" ? item.item_data.slice(0, 80) : JSON.stringify(item.item_data).slice(0, 80)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ───────── Annotators ───────── */
function AnnotatorsTab({ projectId }: { projectId: string }) {
  const [annotators, setAnnotators] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [assignResult, setAssignResult] = useState("");

  const load = () => apiFetch(`/api/projects/${projectId}/annotators`).then(setAnnotators).catch(() => {});
  useEffect(() => { load(); }, [projectId]);

  const enroll = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    try {
      await apiFetch(`/api/projects/${projectId}/annotators`, { method: "POST", body: JSON.stringify({ annotator_email: email }) });
      setEmail(""); load();
    } catch (err: any) { setError(err.message); }
  };

  const remove = async (annotatorId: string) => {
    await apiFetch(`/api/projects/${projectId}/annotators/${annotatorId}`, { method: "DELETE" });
    load();
  };

  const assign = async () => {
    setAssignResult("");
    try {
      const res = await apiFetch(`/api/projects/${projectId}/annotators/assign`, { method: "POST" });
      setAssignResult(`${res.tasks_created} tasks created`);
    } catch (err: any) { setAssignResult(err.message); }
  };

  return (
    <div className="space-y-4 ax-animate">
      <form onSubmit={enroll} className="flex gap-2">
        <input type="email" placeholder="annotator@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="ax-input" style={{ maxWidth: 300 }} required />
        <button type="submit" className="ax-btn ax-btn-primary">Enroll</button>
      </form>
      {error && <p className="text-sm" style={{ color: 'var(--ax-danger)' }}>{error}</p>}

      {annotators.length > 0 ? (
        <div className="ax-card divide-y" style={{ borderColor: 'var(--ax-border)' }}>
          {annotators.map((a) => (
            <div key={a.id} className="p-4 flex items-center justify-between" style={{ borderColor: 'var(--ax-border-subtle)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--ax-accent-glow)', color: 'var(--ax-accent)' }}>
                  {a.display_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-sm font-medium">{a.display_name}</p>
                  <p className="text-xs font-mono" style={{ color: 'var(--ax-text-muted)' }}>{a.email}</p>
                </div>
              </div>
              <button onClick={() => remove(a.id)} className="text-xs hover:underline" style={{ color: 'var(--ax-danger)' }}>Remove</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="ax-card p-12 text-center">
          <p style={{ color: 'var(--ax-text-muted)' }}>No annotators enrolled yet.</p>
        </div>
      )}

      <div className="flex items-center gap-4 pt-2">
        <button onClick={assign} className="ax-btn ax-btn-ghost" style={{ borderColor: 'var(--ax-success)', color: 'var(--ax-success)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></svg>
          Assign Tasks
        </button>
        {assignResult && <span className="text-sm font-mono" style={{ color: 'var(--ax-success)' }}>{assignResult}</span>}
      </div>
    </div>
  );
}

/* ───────── Results ───────── */
function ResultsTab({ projectId }: { projectId: string }) {
  const [agreement, setAgreement] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [computing, setComputing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    apiFetch(`/api/projects/${projectId}/agreement`).then(setAgreement).catch(() => {});
    apiFetch(`/api/projects/${projectId}/flags`).then(setFlags).catch(() => {});
  }, [projectId]);

  const computeAgreement = async () => {
    setComputing(true);
    try { const res = await apiFetch(`/api/projects/${projectId}/agreement/compute`, { method: "POST" }); setAgreement(res); } catch {}
    setComputing(false);
  };

  const analyzeFlags = async () => {
    setAnalyzing(true);
    try {
      await apiFetch(`/api/projects/${projectId}/flags/analyze`, { method: "POST" });
      const res = await apiFetch(`/api/projects/${projectId}/flags`); setFlags(res);
    } catch {}
    setAnalyzing(false);
  };

  const exportData = (format: string) => {
    const token = localStorage.getItem("token");
    window.open(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/projects/${projectId}/export?format=${format}${token ? `&token=${token}` : ""}`, "_blank");
  };

  return (
    <div className="space-y-6 ax-animate">
      {/* Agreement */}
      <div className="ax-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--ax-text-muted)' }}>Inter-Annotator Agreement</h3>
          <button onClick={computeAgreement} disabled={computing} className="ax-btn ax-btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}>
            {computing ? "Computing..." : "Compute"}
          </button>
        </div>
        {agreement.length > 0 ? (
          <div className="overflow-auto rounded-lg" style={{ background: 'var(--ax-bg)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--ax-border)' }}>
                  <th className="py-2.5 px-4 text-left text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--ax-text-muted)' }}>Field</th>
                  <th className="py-2.5 px-4 text-left text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--ax-text-muted)' }}>Agreement</th>
                  <th className="py-2.5 px-4 text-left text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--ax-text-muted)' }}>Items</th>
                  <th className="py-2.5 px-4 text-left text-[10px] font-mono uppercase tracking-widest" style={{ color: 'var(--ax-text-muted)' }}>Annotators</th>
                </tr>
              </thead>
              <tbody>
                {agreement.map((a) => {
                  const pct = a.pct_agreement != null ? a.pct_agreement * 100 : null;
                  const color = pct === null ? 'var(--ax-text-muted)' : pct >= 80 ? 'var(--ax-success)' : pct >= 50 ? 'var(--ax-warn)' : 'var(--ax-danger)';
                  return (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--ax-border-subtle)' }}>
                      <td className="py-2.5 px-4 font-medium">{a.field_key}</td>
                      <td className="py-2.5 px-4 font-mono font-bold" style={{ color }}>{pct !== null ? `${pct.toFixed(0)}%` : "—"}</td>
                      <td className="py-2.5 px-4 font-mono" style={{ color: 'var(--ax-text-secondary)' }}>{a.n_items}</td>
                      <td className="py-2.5 px-4 font-mono" style={{ color: 'var(--ax-text-secondary)' }}>{a.n_annotators}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--ax-text-muted)' }}>No agreement scores computed yet.</p>
        )}
      </div>

      {/* Flags */}
      <div className="ax-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xs font-mono uppercase tracking-widest" style={{ color: 'var(--ax-text-muted)' }}>AI Flagged Items</h3>
          <button onClick={analyzeFlags} disabled={analyzing} className="ax-btn" style={{ padding: '6px 14px', fontSize: 12, background: 'rgba(190, 120, 240, 0.12)', color: '#be78f0', border: '1px solid rgba(190,120,240,0.25)' }}>
            {analyzing ? "Analyzing..." : "Run AI Analysis"}
          </button>
        </div>
        {flags.length > 0 ? (
          <div className="space-y-3">
            {flags.map((f) => (
              <div key={f.id} className="rounded-lg p-4" style={{ background: 'var(--ax-danger-dim)', border: '1px solid rgba(240,96,96,0.15)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs" style={{ color: 'var(--ax-text-secondary)' }}>{f.external_id || f.dataset_item_id?.slice(0, 8)}</span>
                  <span className="ax-badge" style={{ background: 'rgba(240,96,96,0.15)', color: 'var(--ax-danger)' }}>
                    {f.confidence_score != null ? `${(f.confidence_score * 100).toFixed(0)}% confidence` : "flagged"}
                  </span>
                </div>
                <p className="text-sm" style={{ color: 'var(--ax-text-secondary)' }}>{f.rationale}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--ax-text-muted)' }}>No flagged items.</p>
        )}
      </div>

      {/* Export */}
      <div className="ax-card p-6">
        <h3 className="text-xs font-mono uppercase tracking-widest mb-4" style={{ color: 'var(--ax-text-muted)' }}>Export Data</h3>
        <div className="flex gap-3">
          <button onClick={() => exportData("json")} className="ax-btn ax-btn-ghost">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15M7 10L12 15M12 15L17 10M12 15V3" /></svg>
            JSON
          </button>
          <button onClick={() => exportData("csv")} className="ax-btn ax-btn-ghost">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15M7 10L12 15M12 15L17 10M12 15V3" /></svg>
            CSV
          </button>
        </div>
      </div>
    </div>
  );
}
