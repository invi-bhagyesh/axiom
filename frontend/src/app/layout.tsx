import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Axiom",
  description: "General-Purpose Human Annotation Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <nav className="sticky top-0 z-50 border-b backdrop-blur-md" style={{ borderColor: 'var(--ax-border)', background: 'rgba(12, 14, 19, 0.85)' }}>
              <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
                <a href="/" className="flex items-center gap-2.5 group">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="transition-transform group-hover:rotate-12">
                    <path d="M12 2L22 8.5V15.5L12 22L2 15.5V8.5L12 2Z" stroke="var(--ax-accent)" strokeWidth="1.5" fill="var(--ax-accent-glow)" />
                    <path d="M12 8L17 11V17L12 20L7 17V11L12 8Z" fill="var(--ax-accent)" opacity="0.6" />
                    <circle cx="12" cy="13" r="2" fill="var(--ax-bg)" />
                  </svg>
                  <span className="font-display text-lg tracking-tight" style={{ color: 'var(--ax-text)' }}>
                    Axiom
                  </span>
                </a>
                <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--ax-text-muted)' }}>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--ax-surface)', border: '1px solid var(--ax-border)' }}>
                    v0.1
                  </span>
                </div>
              </div>
            </nav>
            <main className="flex-1">
              <div className="max-w-6xl mx-auto px-6 py-8">
                {children}
              </div>
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
