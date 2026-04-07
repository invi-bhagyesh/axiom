"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-sm ax-animate">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5" style={{ background: 'var(--ax-accent-glow)', border: '1px solid var(--ax-accent-dim)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L22 8.5V15.5L12 22L2 15.5V8.5L12 2Z" stroke="var(--ax-accent)" strokeWidth="1.5" />
              <path d="M12 8L17 11V17L12 20L7 17V11L12 8Z" fill="var(--ax-accent)" opacity="0.6" />
            </svg>
          </div>
          <h1 className="font-display text-3xl mb-2">Welcome back</h1>
          <p style={{ color: 'var(--ax-text-muted)' }} className="text-sm">Sign in to your Axiom workspace</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="ax-animate-scale rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--ax-danger-dim)', color: 'var(--ax-danger)', border: '1px solid rgba(240,96,96,0.2)' }}>
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--ax-text-muted)' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="ax-input"
              placeholder="you@institution.edu"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--ax-text-muted)' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="ax-input"
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="ax-btn ax-btn-primary w-full mt-2"
            style={{ height: 44 }}
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--ax-bg)', borderTopColor: 'transparent' }} />
            ) : "Sign In"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center mt-8 text-sm" style={{ color: 'var(--ax-text-muted)' }}>
          No account?{" "}
          <a href="/register" className="font-medium transition-colors hover:underline" style={{ color: 'var(--ax-accent)' }}>
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}
