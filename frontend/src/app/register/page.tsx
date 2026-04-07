"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("requester");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password, name, role);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-sm ax-animate">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5" style={{ background: 'var(--ax-accent-glow)', border: '1px solid var(--ax-accent-dim)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L22 8.5V15.5L12 22L2 15.5V8.5L12 2Z" stroke="var(--ax-accent)" strokeWidth="1.5" />
              <circle cx="12" cy="11" r="3" stroke="var(--ax-accent)" strokeWidth="1.5" />
              <path d="M7 19C7 16.2 9.2 14 12 14C14.8 14 17 16.2 17 19" stroke="var(--ax-accent)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="font-display text-3xl mb-2">Create account</h1>
          <p style={{ color: 'var(--ax-text-muted)' }} className="text-sm">Join Axiom as a requester or annotator</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="ax-animate-scale rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--ax-danger-dim)', color: 'var(--ax-danger)', border: '1px solid rgba(240,96,96,0.2)' }}>
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--ax-text-muted)' }}>Display Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="ax-input" placeholder="Dr. Jane Smith" required />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--ax-text-muted)' }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="ax-input" placeholder="you@institution.edu" required />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--ax-text-muted)' }}>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="ax-input" placeholder="Min. 6 characters" required />
          </div>

          {/* Role selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--ax-text-muted)' }}>Role</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "requester", label: "Requester", desc: "Create projects" },
                { value: "annotator", label: "Annotator", desc: "Label data" },
              ].map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className="p-3 rounded-lg text-left transition-all"
                  style={{
                    background: role === r.value ? 'var(--ax-accent-glow)' : 'var(--ax-surface)',
                    border: `1.5px solid ${role === r.value ? 'var(--ax-accent)' : 'var(--ax-border)'}`,
                  }}
                >
                  <span className="block text-sm font-medium" style={{ color: role === r.value ? 'var(--ax-accent)' : 'var(--ax-text)' }}>
                    {r.label}
                  </span>
                  <span className="block text-xs mt-0.5" style={{ color: 'var(--ax-text-muted)' }}>{r.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading} className="ax-btn ax-btn-primary w-full" style={{ height: 44 }}>
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--ax-bg)', borderTopColor: 'transparent' }} />
            ) : "Create Account"}
          </button>
        </form>

        <p className="text-center mt-8 text-sm" style={{ color: 'var(--ax-text-muted)' }}>
          Already have an account?{" "}
          <a href="/login" className="font-medium hover:underline" style={{ color: 'var(--ax-accent)' }}>Sign in</a>
        </p>
      </div>
    </div>
  );
}
