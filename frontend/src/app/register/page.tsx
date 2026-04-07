"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import AsciiHero from "@/components/AsciiHero";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("requester");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password, name, role);
      router.push("/");
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row w-[100dvw] bg-background text-foreground">
      {/* Left — Register form */}
      <section className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            <h1 className="animate-element animate-delay-100 text-4xl md:text-5xl font-semibold leading-tight">
              <span className="font-light text-foreground tracking-tighter">Create Account</span>
            </h1>
            <p className="animate-element animate-delay-200 text-muted-foreground">
              Get started with Axiom — set up your workspace in seconds
            </p>

            {error && (
              <div className="animate-element rounded-2xl px-4 py-3 text-sm font-medium" style={{ background: 'var(--ax-red-dim)', color: 'var(--ax-red)' }}>
                {error}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="animate-element animate-delay-300">
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Smith" required
                    className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none" />
                </div>
              </div>

              <div className="animate-element animate-delay-400">
                <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com" required
                    className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none" />
                </div>
              </div>

              <div className="animate-element animate-delay-500">
                <label className="text-sm font-medium text-muted-foreground">Password</label>
                <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters" required
                      className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center">
                      {showPassword ? <EyeOff className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" /> : <Eye className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="animate-element animate-delay-600">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Role</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["requester", "annotator"] as const).map((r) => (
                    <button key={r} type="button" onClick={() => setRole(r)}
                      className="h-[60px] rounded-2xl text-left px-4 transition-all border backdrop-blur-sm"
                      style={{
                        background: role === r ? 'rgba(139, 92, 246, 0.1)' : 'hsl(var(--foreground) / 0.05)',
                        borderColor: role === r ? 'rgba(139, 92, 246, 0.7)' : 'hsl(var(--border))',
                        boxShadow: role === r ? '0 0 0 1px rgba(139, 92, 246, 0.5)' : 'none',
                      }}>
                      <span className="block text-sm font-semibold" style={{ color: role === r ? '#a78bfa' : 'hsl(var(--foreground))' }}>
                        {r === "requester" ? "Requester" : "Annotator"}
                      </span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {r === "requester" ? "Create & manage projects" : "Label & annotate data"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="animate-element animate-delay-700 w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                {loading ? <span className="inline-block w-4 h-4 border-2 border-[#0c0d10]/30 border-t-[#0c0d10] rounded-full animate-spin" /> : "Create Account"}
              </button>
            </form>

            <p className="animate-element animate-delay-800 text-center text-sm text-muted-foreground">
              Already have an account? <a href="/login" className="text-violet-400 hover:underline transition-colors">Sign in</a>
            </p>
          </div>
        </div>
      </section>

      {/* Right — Hero panel */}
      <section className="hidden md:block flex-1 relative p-4">
        <div className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl overflow-hidden">
          <AsciiHero />
        </div>
      </section>
    </div>
  );
}
