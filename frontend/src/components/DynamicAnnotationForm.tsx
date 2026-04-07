"use client";
import { useState } from "react";

interface SchemaField {
  id: string;
  field_key: string;
  label: string;
  description?: string;
  field_type: "likert" | "boolean" | "free_text" | "multi_select";
  is_required: boolean;
  config: any;
}

interface Props {
  fields: SchemaField[];
  initial?: Record<string, any>;
  onSubmit: (responses: Record<string, any>) => void;
  readOnly?: boolean;
}

function LikertField({ field, value, onChange, readOnly }: {
  field: SchemaField; value: number | null; onChange: (v: number) => void; readOnly?: boolean;
}) {
  const min = field.config?.min || 1;
  const max = field.config?.max || 5;
  const labels = field.config?.labels || [];
  const points = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {points.map((p) => (
          <button
            key={p}
            type="button"
            disabled={readOnly}
            onClick={() => onChange(p)}
            className="flex-1 h-11 rounded-lg text-sm font-mono font-bold transition-all"
            style={{
              background: value === p ? 'var(--ax-accent)' : 'var(--ax-bg)',
              color: value === p ? 'var(--ax-bg)' : 'var(--ax-text-muted)',
              border: `1.5px solid ${value === p ? 'var(--ax-accent)' : 'var(--ax-border)'}`,
              cursor: readOnly ? 'default' : 'pointer',
              transform: value === p ? 'scale(1.05)' : 'scale(1)',
              boxShadow: value === p ? '0 0 16px var(--ax-accent-glow)' : 'none',
            }}
          >
            {p}
          </button>
        ))}
      </div>
      {labels.length > 0 && (
        <div className="flex justify-between text-[10px] font-mono uppercase tracking-wide" style={{ color: 'var(--ax-text-muted)' }}>
          <span>{labels[0]}</span>
          {labels.length > 1 && <span>{labels[labels.length - 1]}</span>}
        </div>
      )}
    </div>
  );
}

function BooleanField({ value, onChange, readOnly }: {
  value: boolean | null; onChange: (v: boolean) => void; readOnly?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        { val: true, label: "Yes", color: 'var(--ax-success)', bg: 'var(--ax-success-dim)' },
        { val: false, label: "No", color: 'var(--ax-danger)', bg: 'var(--ax-danger-dim)' },
      ].map((opt) => (
        <button
          key={String(opt.val)}
          type="button"
          disabled={readOnly}
          onClick={() => onChange(opt.val)}
          className="h-11 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: value === opt.val ? opt.bg : 'var(--ax-bg)',
            color: value === opt.val ? opt.color : 'var(--ax-text-muted)',
            border: `1.5px solid ${value === opt.val ? opt.color : 'var(--ax-border)'}`,
            cursor: readOnly ? 'default' : 'pointer',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function FreeTextField({ value, onChange, readOnly }: {
  value: string; onChange: (v: string) => void; readOnly?: boolean;
}) {
  return (
    <textarea
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      readOnly={readOnly}
      rows={3}
      className="ax-input font-normal"
      placeholder="Enter your response..."
      style={{ minHeight: 80, lineHeight: 1.6 }}
    />
  );
}

function MultiSelectField({ field, value, onChange, readOnly }: {
  field: SchemaField; value: string[]; onChange: (v: string[]) => void; readOnly?: boolean;
}) {
  const options: string[] = field.config?.options || [];
  const toggle = (opt: string) => {
    if (readOnly) return;
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else onChange([...value, opt]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          disabled={readOnly}
          onClick={() => toggle(opt)}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            background: value.includes(opt) ? 'var(--ax-accent-glow)' : 'var(--ax-bg)',
            color: value.includes(opt) ? 'var(--ax-accent)' : 'var(--ax-text-muted)',
            border: `1.5px solid ${value.includes(opt) ? 'var(--ax-accent)' : 'var(--ax-border)'}`,
            cursor: readOnly ? 'default' : 'pointer',
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export default function DynamicAnnotationForm({ fields, initial, onSubmit, readOnly }: Props) {
  const [responses, setResponses] = useState<Record<string, any>>(initial || {});
  const [validationError, setValidationError] = useState("");

  const setValue = (key: string, val: any) => {
    setResponses((prev) => ({ ...prev, [key]: val }));
    setValidationError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    for (const f of fields) {
      if (f.is_required && (responses[f.field_key] === undefined || responses[f.field_key] === null || responses[f.field_key] === "")) {
        setValidationError(`"${f.label}" is required.`);
        return;
      }
    }
    onSubmit(responses);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {validationError && (
        <div className="rounded-lg px-4 py-3 text-sm ax-animate-scale" style={{ background: 'var(--ax-danger-dim)', color: 'var(--ax-danger)', border: '1px solid rgba(240,96,96,0.2)' }}>
          {validationError}
        </div>
      )}

      {fields.map((field, i) => (
        <div key={field.id} className={`space-y-3 ax-animate ax-stagger-${Math.min(i + 1, 5)}`}>
          <div>
            <label className="block text-sm font-semibold mb-0.5" style={{ color: 'var(--ax-text)' }}>
              {field.label}
              {field.is_required && <span className="ml-1" style={{ color: 'var(--ax-accent)' }}>*</span>}
            </label>
            {field.description && (
              <p className="text-xs" style={{ color: 'var(--ax-text-muted)' }}>{field.description}</p>
            )}
          </div>

          {field.field_type === "likert" && (
            <LikertField field={field} value={responses[field.field_key] ?? null} onChange={(v) => setValue(field.field_key, v)} readOnly={readOnly} />
          )}
          {field.field_type === "boolean" && (
            <BooleanField value={responses[field.field_key] ?? null} onChange={(v) => setValue(field.field_key, v)} readOnly={readOnly} />
          )}
          {field.field_type === "free_text" && (
            <FreeTextField value={responses[field.field_key] || ""} onChange={(v) => setValue(field.field_key, v)} readOnly={readOnly} />
          )}
          {field.field_type === "multi_select" && (
            <MultiSelectField field={field} value={responses[field.field_key] || []} onChange={(v) => setValue(field.field_key, v)} readOnly={readOnly} />
          )}

          {/* Divider between fields */}
          {i < fields.length - 1 && (
            <div className="pt-2" style={{ borderBottom: '1px solid var(--ax-border-subtle)' }} />
          )}
        </div>
      ))}

      {!readOnly && (
        <button type="submit" className="ax-btn ax-btn-primary w-full" style={{ height: 48, fontSize: 15 }}>
          Submit Annotation
        </button>
      )}
    </form>
  );
}
