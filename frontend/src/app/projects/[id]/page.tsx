"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { apiFetch, apiUpload } from "@/lib/api";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Play, Pause, CheckCircle2, Plus, Trash2,
  Upload, Eye, Sparkles, Download, FolderOpen, LayoutList,
  Database, Users, BarChart3, FileText, AlertTriangle,
} from "lucide-react";

type Tab = "overview" | "schema" | "data" | "annotators" | "results";
const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <LayoutList size={15} /> },
  { key: "schema", label: "Schema", icon: <FileText size={15} /> },
  { key: "data", label: "Data", icon: <Database size={15} /> },
  { key: "annotators", label: "Annotators", icon: <Users size={15} /> },
  { key: "results", label: "Results", icon: <BarChart3 size={15} /> },
];

const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  draft:     { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", label: "Draft" },
  active:    { color: "#00d4ff", bg: "rgba(0,212,255,0.1)",   label: "Active" },
  paused:    { color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  label: "Paused" },
  completed: { color: "#34d399", bg: "rgba(52,211,153,0.1)",  label: "Complete" },
  archived:  { color: "#f87171", bg: "rgba(248,113,113,0.1)", label: "Archived" },
};

function ProgressBar({ pct, color = "#00d4ff" }: { pct: number; color?: string }) {
  return (
    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(100,140,190,0.1)" }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function ProgressRing({ pct, size = 80, stroke = 6 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(100,140,190,0.12)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#00d4ff" strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <span className="absolute text-[15px] font-semibold" style={{ color: "#dfe7ef" }}>{pct}%</span>
    </div>
  );
}

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

  const tabs = user.role === "requester" ? TABS : TABS.slice(0, 1);
  const st = STATUS_META[project.status] || STATUS_META.draft;

  return (
    <div className="ax-enter">
      {/* Back link */}
      <a href="/dashboard" className="inline-flex items-center gap-1.5 text-[13px] mb-5 transition-colors"
        style={{ color: "#7a95ae", textDecoration: "none" }}>
        <ArrowLeft size={14} /> Back to projects
      </a>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-[24px] font-bold tracking-tight" style={{ color: "#edf2f7" }}>
              {project.title}
            </h1>
            <span className="text-[12px] font-semibold px-3 py-1 rounded-lg"
              style={{ color: st.color, background: st.bg }}>
              {st.label}
            </span>
          </div>
          {project.description && (
            <p className="text-[14px] mt-1" style={{ color: "#7a95ae" }}>{project.description}</p>
          )}
        </div>
      </div>

      {error && (
        <div className="ax-card p-4 text-[13px] font-medium mb-4" style={{ borderColor: "rgba(248,113,113,0.2)", color: "#f87171" }}>
          {error}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: "#172035" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all"
            style={{
              color: tab === t.key ? "#dfe7ef" : "#7a95ae",
              background: tab === t.key ? "#253350" : "transparent",
            }}
          >
            {t.icon}
            {t.label}
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

/* ───── Overview ───── */
function OverviewTab({ project, projectId, reload }: { project: any; projectId: string; reload: () => void }) {
  const [progress, setProgress] = useState<any>(null);
  useEffect(() => { apiFetch(`/api/projects/${projectId}/progress`).then(setProgress).catch(() => {}); }, [projectId]);

  const changeStatus = async (status: string) => {
    await apiFetch(`/api/projects/${projectId}`, { method: "PATCH", body: JSON.stringify({ status }) });
    reload();
  };

  const pct = Math.round(progress?.pct_complete || 0);

  return (
    <div className="space-y-5 ax-enter">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="ax-card p-5">
          <p className="text-[12px] mb-1" style={{ color: "#7a95ae" }}>Status</p>
          <p className="text-[18px] font-semibold capitalize" style={{ color: STATUS_META[project.status]?.color || "#dfe7ef" }}>
            {project.status}
          </p>
        </div>
        <div className="ax-card p-5">
          <p className="text-[12px] mb-1" style={{ color: "#7a95ae" }}>Min annotations</p>
          <p className="text-[18px] font-semibold" style={{ color: "#dfe7ef" }}>{project.min_annotations_per_item}</p>
        </div>
        <div className="ax-card p-5">
          <p className="text-[12px] mb-1" style={{ color: "#7a95ae" }}>Schema fields</p>
          <p className="text-[18px] font-semibold" style={{ color: "#dfe7ef" }}>{project.schema_fields?.length || 0}</p>
        </div>
        <div className="ax-card p-5">
          <p className="text-[12px] mb-1" style={{ color: "#7a95ae" }}>Deadline</p>
          <p className="text-[18px] font-semibold" style={{ color: "#dfe7ef" }}>
            {project.deadline ? new Date(project.deadline).toLocaleDateString() : "None"}
          </p>
        </div>
      </div>

      {/* Progress card */}
      {progress && (
        <div className="ax-card p-6">
          <h3 className="text-[15px] font-semibold mb-5" style={{ color: "#dfe7ef" }}>Progress</h3>
          <div className="flex items-center gap-8">
            <ProgressRing pct={pct} size={90} stroke={7} />
            <div className="flex-1 space-y-4">
              <ProgressBar pct={pct} />
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[12px]" style={{ color: "#7a95ae" }}>Total tasks</p>
                  <p className="text-[20px] font-semibold" style={{ color: "#dfe7ef" }}>{progress.total_tasks || 0}</p>
                </div>
                <div>
                  <p className="text-[12px]" style={{ color: "#7a95ae" }}>Submitted</p>
                  <p className="text-[20px] font-semibold" style={{ color: "#34d399" }}>{progress.submitted_tasks || 0}</p>
                </div>
                <div>
                  <p className="text-[12px]" style={{ color: "#7a95ae" }}>Flagged</p>
                  <p className="text-[20px] font-semibold" style={{ color: progress.flagged_items > 0 ? "#f87171" : "#dfe7ef" }}>
                    {progress.flagged_items || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {project.status === "draft" && (
          <button onClick={() => changeStatus("active")} className="ax-btn ax-btn-primary"><Play size={13} /> Activate</button>
        )}
        {project.status === "active" && (
          <button onClick={() => changeStatus("paused")} className="ax-btn ax-btn-secondary"><Pause size={13} /> Pause</button>
        )}
        {project.status === "paused" && (
          <button onClick={() => changeStatus("active")} className="ax-btn ax-btn-primary"><Play size={13} /> Resume</button>
        )}
        {(project.status === "active" || project.status === "paused") && (
          <button onClick={() => changeStatus("completed")} className="ax-btn ax-btn-secondary"><CheckCircle2 size={13} /> Complete</button>
        )}
      </div>
    </div>
  );
}

/* ───── Schema ───── */
function SchemaTab({ projectId, fields, onUpdate, isDraft }: { projectId: string; fields: any[]; onUpdate: () => void; isDraft: boolean }) {
  const [showAdd, setShowAdd] = useState(false);
  const [fieldKey, setFieldKey] = useState("");
  const [label, setLabel] = useState("");
  const [desc, setDesc] = useState("");
  const [fieldType, setFieldType] = useState("likert");
  const [config, setConfig] = useState('{"min":1,"max":5,"labels":["Strongly Disagree","Disagree","Neutral","Agree","Strongly Agree"]}');
  const [error, setError] = useState("");

  const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
    likert:       { label: "Likert",       color: "#00d4ff", bg: "rgba(0,212,255,0.1)" },
    boolean:      { label: "Boolean",      color: "#34d399", bg: "rgba(52,211,153,0.1)" },
    free_text:    { label: "Free text",    color: "#fbbf24", bg: "rgba(251,191,36,0.1)" },
    multi_select: { label: "Multi select", color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
  };

  const TYPE_CONFIGS: Record<string, string> = {
    likert: '{"min":1,"max":5,"labels":["Strongly Disagree","Disagree","Neutral","Agree","Strongly Agree"]}',
    boolean: "{}", free_text: "{}", multi_select: '{"options":["Option A","Option B","Option C"]}',
  };

  const addField = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    try {
      await apiFetch(`/api/projects/${projectId}/schema`, {
        method: "POST",
        body: JSON.stringify({ field_key: fieldKey, label, description: desc || null, field_type: fieldType, is_required: true, position: fields.length, config: JSON.parse(config) }),
      });
      setFieldKey(""); setLabel(""); setDesc(""); setShowAdd(false); onUpdate();
    } catch (err: any) { setError(err.message); }
  };

  const deleteField = async (fid: string) => {
    await apiFetch(`/api/projects/${projectId}/schema/${fid}`, { method: "DELETE" }); onUpdate();
  };

  return (
    <div className="space-y-3 ax-enter">
      {fields.length === 0 && !showAdd && (
        <div className="ax-card p-12 text-center">
          <FileText size={32} style={{ color: "#4a6480" }} className="mx-auto mb-3" />
          <p className="text-[14px] font-medium mb-1" style={{ color: "#a3b8cc" }}>No schema fields yet</p>
          <p className="text-[13px]" style={{ color: "#7a95ae" }}>Define the fields annotators will fill out.</p>
        </div>
      )}

      {fields.map((f: any, i) => {
        const tm = TYPE_META[f.field_type] || TYPE_META.free_text;
        return (
          <div key={f.id} className={`ax-card p-4 flex items-center gap-4 ax-enter ax-d${Math.min(i + 1, 5)}`}>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg shrink-0"
              style={{ color: tm.color, background: tm.bg }}>
              {tm.label}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold truncate" style={{ color: "#dfe7ef" }}>
                {f.label}
                <span className="font-normal text-[12px] ml-2" style={{ color: "#7a95ae" }}>{f.field_key}</span>
              </p>
              {f.description && <p className="text-[12px] truncate mt-0.5" style={{ color: "#7a95ae" }}>{f.description}</p>}
            </div>
            {f.is_required && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ color: "#fbbf24", background: "rgba(251,191,36,0.08)" }}>Required</span>
            )}
            {isDraft && (
              <button onClick={() => deleteField(f.id)} className="ax-btn ax-btn-danger-ghost ax-btn-sm"><Trash2 size={13} /></button>
            )}
          </div>
        );
      })}

      {isDraft && !showAdd && (
        <button onClick={() => setShowAdd(true)} className="ax-btn ax-btn-primary">
          <Plus size={13} /> Add field
        </button>
      )}

      {showAdd && (
        <form onSubmit={addField} className="ax-card p-6 space-y-4 ax-scale-in">
          <h3 className="text-[15px] font-semibold" style={{ color: "#dfe7ef" }}>New field</h3>
          {error && <div className="rounded-lg p-3 text-[13px]" style={{ background: "rgba(248,113,113,0.08)", color: "#f87171" }}>{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="ax-label">Field key</label><input value={fieldKey} onChange={e => setFieldKey(e.target.value)} className="ax-input" placeholder="persona_score" required /></div>
            <div><label className="ax-label">Label</label><input value={label} onChange={e => setLabel(e.target.value)} className="ax-input" placeholder="Persona Consistency" required /></div>
          </div>
          <div><label className="ax-label">Description</label><input value={desc} onChange={e => setDesc(e.target.value)} className="ax-input" placeholder="Optional description" /></div>
          <div><label className="ax-label">Type</label>
            <select value={fieldType} onChange={e => { setFieldType(e.target.value); setConfig(TYPE_CONFIGS[e.target.value] || "{}"); }} className="ax-input">
              <option value="likert">Likert Scale</option>
              <option value="boolean">Boolean</option>
              <option value="free_text">Free Text</option>
              <option value="multi_select">Multi Select</option>
            </select>
          </div>
          <div><label className="ax-label">Config (JSON)</label><textarea value={config} onChange={e => setConfig(e.target.value)} className="ax-input text-[12px] font-mono" /></div>
          <div className="flex gap-2">
            <button type="submit" className="ax-btn ax-btn-primary">Save field</button>
            <button type="button" onClick={() => setShowAdd(false)} className="ax-btn ax-btn-secondary">Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ───── Data ───── */
function DataTab({ projectId }: { projectId: string }) {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [selectedDs, setSelectedDs] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");

  const load = () => apiFetch(`/api/projects/${projectId}/datasets`).then(setDatasets).catch(() => {});
  useEffect(() => { load(); }, [projectId]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newName) return;
    await apiFetch(`/api/projects/${projectId}/datasets`, { method: "POST", body: JSON.stringify({ name: newName }) });
    setNewName(""); load();
  };

  const upload = async (did: string, file: File) => {
    setUploading(true); setMsg("");
    try {
      const r = await apiUpload(`/api/projects/${projectId}/datasets/${did}/upload`, file);
      setMsg(`${r.uploaded} items uploaded`);
      loadItems(did);
    } catch (e: any) { setMsg(e.message); }
    setUploading(false);
  };

  const loadItems = (did: string) => {
    setSelectedDs(did);
    apiFetch(`/api/projects/${projectId}/datasets/${did}/items`).then(r => setItems(r.items)).catch(() => {});
  };

  return (
    <div className="space-y-4 ax-enter">
      <form onSubmit={create} className="flex gap-2">
        <input placeholder="Dataset name..." value={newName} onChange={e => setNewName(e.target.value)} className="ax-input" style={{ maxWidth: 280 }} />
        <button type="submit" className="ax-btn ax-btn-primary"><Plus size={13} /> Create</button>
      </form>

      {datasets.length === 0 && (
        <div className="ax-card p-12 text-center">
          <Database size={32} style={{ color: "#4a6480" }} className="mx-auto mb-3" />
          <p className="text-[14px] font-medium mb-1" style={{ color: "#a3b8cc" }}>No datasets yet</p>
          <p className="text-[13px]" style={{ color: "#7a95ae" }}>Create a dataset and upload items as JSON.</p>
        </div>
      )}

      {datasets.map(ds => (
        <div key={ds.id} className="ax-card overflow-hidden">
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(100,140,190,0.08)" }}>
            <div className="flex items-center gap-3">
              <Database size={16} style={{ color: "#00d4ff" }} />
              <span className="text-[14px] font-semibold" style={{ color: "#dfe7ef" }}>{ds.name}</span>
            </div>
            <div className="flex gap-2">
              <label className="ax-btn ax-btn-secondary ax-btn-sm cursor-pointer">
                <Upload size={12} /> {uploading ? "Uploading..." : "Upload JSON"}
                <input type="file" accept=".json" className="hidden" onChange={e => e.target.files?.[0] && upload(ds.id, e.target.files[0])} />
              </label>
              <button onClick={() => loadItems(ds.id)} className="ax-btn ax-btn-ghost ax-btn-sm"><Eye size={12} /> View</button>
            </div>
          </div>

          {msg && selectedDs === ds.id && (
            <div className="px-5 py-3 text-[13px] font-medium" style={{ color: "#34d399" }}>{msg}</div>
          )}

          {selectedDs === ds.id && items.length > 0 && (
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(100,140,190,0.08)" }}>
                    <th className="py-3 px-5 text-left text-[12px] font-medium" style={{ color: "#7a95ae" }}>#</th>
                    <th className="py-3 px-5 text-left text-[12px] font-medium" style={{ color: "#7a95ae" }}>ID</th>
                    <th className="py-3 px-5 text-left text-[12px] font-medium" style={{ color: "#7a95ae" }}>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid rgba(100,140,190,0.04)" }}>
                      <td className="py-2.5 px-5" style={{ color: "#7a95ae" }}>{i + 1}</td>
                      <td className="py-2.5 px-5" style={{ color: "#a3b8cc" }}>{item.external_id || "—"}</td>
                      <td className="py-2.5 px-5 truncate" style={{ maxWidth: 400, color: "#7a95ae" }}>
                        {typeof item.item_data === "string" ? item.item_data.slice(0, 100) : JSON.stringify(item.item_data).slice(0, 100)}
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

/* ───── Annotators ───── */
function AnnotatorsTab({ projectId }: { projectId: string }) {
  const [list, setList] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [assignMsg, setAssignMsg] = useState("");

  const load = () => apiFetch(`/api/projects/${projectId}/annotators`).then(setList).catch(() => {});
  useEffect(() => { load(); }, [projectId]);

  const enroll = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    try {
      await apiFetch(`/api/projects/${projectId}/annotators`, { method: "POST", body: JSON.stringify({ annotator_email: email }) });
      setEmail(""); load();
    } catch (e: any) { setError(e.message); }
  };

  const remove = async (aid: string) => {
    await apiFetch(`/api/projects/${projectId}/annotators/${aid}`, { method: "DELETE" }); load();
  };

  const assign = async () => {
    setAssignMsg("");
    try {
      const r = await apiFetch(`/api/projects/${projectId}/annotators/assign`, { method: "POST" });
      setAssignMsg(`${r.tasks_created} tasks assigned`);
    } catch (e: any) { setAssignMsg(e.message); }
  };

  return (
    <div className="space-y-4 ax-enter">
      <form onSubmit={enroll} className="flex gap-2">
        <input type="email" placeholder="annotator@email.com" value={email} onChange={e => setEmail(e.target.value)} className="ax-input" style={{ maxWidth: 280 }} required />
        <button type="submit" className="ax-btn ax-btn-primary"><Plus size={13} /> Enroll</button>
      </form>
      {error && <p className="text-[13px] font-medium" style={{ color: "#f87171" }}>{error}</p>}

      {list.length > 0 ? (
        <div className="ax-card overflow-hidden">
          <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(100,140,190,0.08)" }}>
            <span className="text-[14px] font-semibold" style={{ color: "#dfe7ef" }}>
              Enrolled annotators
            </span>
            <span className="text-[12px] font-medium px-2.5 py-1 rounded-lg" style={{ color: "#00d4ff", background: "rgba(0,212,255,0.08)" }}>
              {list.length}
            </span>
          </div>
          {list.map((a, i) => (
            <div key={a.id} className={`flex items-center px-5 py-3.5 ax-enter ax-d${Math.min(i + 1, 5)}`}
              style={{ borderBottom: i < list.length - 1 ? "1px solid rgba(100,140,190,0.06)" : "none" }}>
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold"
                  style={{ color: "#00d4ff", background: "rgba(0,212,255,0.1)" }}>
                  {a.display_name?.[0]?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="text-[13px] font-medium" style={{ color: "#dfe7ef" }}>{a.display_name}</p>
                  <p className="text-[12px]" style={{ color: "#7a95ae" }}>{a.email}</p>
                </div>
              </div>
              <button onClick={() => remove(a.id)} className="ax-btn ax-btn-danger-ghost ax-btn-sm"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      ) : (
        <div className="ax-card p-12 text-center">
          <Users size={32} style={{ color: "#4a6480" }} className="mx-auto mb-3" />
          <p className="text-[14px] font-medium mb-1" style={{ color: "#a3b8cc" }}>No annotators enrolled</p>
          <p className="text-[13px]" style={{ color: "#7a95ae" }}>Invite annotators by email to start.</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button onClick={assign} className="ax-btn ax-btn-secondary">
          <CheckCircle2 size={13} style={{ color: "#34d399" }} /> Assign tasks
        </button>
        {assignMsg && <span className="text-[13px] font-semibold" style={{ color: "#34d399" }}>{assignMsg}</span>}
      </div>
    </div>
  );
}

/* ───── Results ───── */
function ResultsTab({ projectId }: { projectId: string }) {
  const [agreement, setAgreement] = useState<any[]>([]);
  const [flags, setFlags] = useState<any[]>([]);
  const [computing, setComputing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    apiFetch(`/api/projects/${projectId}/agreement`).then(setAgreement).catch(() => {});
    apiFetch(`/api/projects/${projectId}/flags`).then(setFlags).catch(() => {});
  }, [projectId]);

  const compute = async () => {
    setComputing(true);
    try { const r = await apiFetch(`/api/projects/${projectId}/agreement/compute`, { method: "POST" }); setAgreement(r); } catch {}
    setComputing(false);
  };

  const analyze = async () => {
    setAnalyzing(true);
    try {
      await apiFetch(`/api/projects/${projectId}/flags/analyze`, { method: "POST" });
      const r = await apiFetch(`/api/projects/${projectId}/flags`);
      setFlags(r);
    } catch {}
    setAnalyzing(false);
  };

  const exportData = (fmt: string) => {
    const t = localStorage.getItem("token");
    window.open(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/projects/${projectId}/export?format=${fmt}${t ? `&token=${t}` : ""}`, "_blank");
  };

  return (
    <div className="space-y-5 ax-enter">
      {/* Agreement */}
      <div className="ax-card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(100,140,190,0.08)" }}>
          <span className="text-[14px] font-semibold" style={{ color: "#dfe7ef" }}>Agreement scores</span>
          <button onClick={compute} disabled={computing} className="ax-btn ax-btn-primary ax-btn-sm">
            {computing ? "Computing..." : "Compute"}
          </button>
        </div>
        {agreement.length > 0 ? (
          <>
            <div className="flex items-center px-5 py-3 text-[12px] font-medium"
              style={{ color: "#7a95ae", borderBottom: "1px solid rgba(100,140,190,0.06)" }}>
              <span className="flex-1">Field</span>
              <span className="w-20 text-right">Agreement</span>
              <span className="w-16 text-right">Items</span>
              <span className="w-16 text-right">Annotators</span>
            </div>
            {agreement.map((a) => {
              const pct = a.pct_agreement != null ? a.pct_agreement * 100 : null;
              const c = pct === null ? "#7a95ae" : pct >= 80 ? "#34d399" : pct >= 50 ? "#fbbf24" : "#f87171";
              return (
                <div key={a.id} className="flex items-center px-5 py-3.5 text-[13px]"
                  style={{ borderBottom: "1px solid rgba(100,140,190,0.04)" }}>
                  <span className="flex-1 font-medium" style={{ color: "#dfe7ef" }}>{a.field_key}</span>
                  <span className="w-20 text-right font-bold" style={{ color: c }}>
                    {pct !== null ? `${pct.toFixed(0)}%` : "—"}
                  </span>
                  <span className="w-16 text-right" style={{ color: "#7a95ae" }}>{a.n_items}</span>
                  <span className="w-16 text-right" style={{ color: "#7a95ae" }}>{a.n_annotators}</span>
                </div>
              );
            })}
          </>
        ) : (
          <div className="p-8 text-center">
            <p className="text-[13px]" style={{ color: "#7a95ae" }}>No agreement data yet. Click Compute after annotations are submitted.</p>
          </div>
        )}
      </div>

      {/* Flags */}
      <div className="ax-card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(100,140,190,0.08)" }}>
          <span className="text-[14px] font-semibold" style={{ color: "#dfe7ef" }}>AI flags</span>
          <button onClick={analyze} disabled={analyzing} className="ax-btn ax-btn-sm"
            style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa", borderColor: "rgba(167,139,250,0.25)" }}>
            <Sparkles size={12} /> {analyzing ? "Analyzing..." : "Analyze"}
          </button>
        </div>
        {flags.length > 0 ? (
          <div className="p-5 space-y-3">
            {flags.map(f => (
              <div key={f.id} className="rounded-xl p-4" style={{ background: "rgba(248,113,113,0.04)", border: "1px solid rgba(248,113,113,0.1)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-medium" style={{ color: "#a3b8cc" }}>
                    {f.external_id || f.dataset_item_id?.slice(0, 8)}
                  </span>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                    style={{ background: "rgba(248,113,113,0.08)", color: "#f87171" }}>
                    {f.confidence_score != null ? `${(f.confidence_score * 100).toFixed(0)}% confidence` : "Flagged"}
                  </span>
                </div>
                <p className="text-[13px] leading-relaxed" style={{ color: "#7a95ae" }}>{f.rationale}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-[13px]" style={{ color: "#7a95ae" }}>No flagged items. Use AI analysis to detect divergent annotations.</p>
          </div>
        )}
      </div>

      {/* Export */}
      <div className="ax-card p-5">
        <h3 className="text-[14px] font-semibold mb-3" style={{ color: "#dfe7ef" }}>Export</h3>
        <div className="flex gap-2">
          <button onClick={() => exportData("json")} className="ax-btn ax-btn-secondary"><Download size={13} /> JSON</button>
          <button onClick={() => exportData("csv")} className="ax-btn ax-btn-secondary"><Download size={13} /> CSV</button>
        </div>
      </div>
    </div>
  );
}
