"use client";
import { usePathname } from "next/navigation";

const AUTH_ROUTES = ["/login", "/register"];

export function NavWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = AUTH_ROUTES.includes(pathname);

  if (isAuth) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav
        className="sticky top-0 z-50 flex items-center px-5"
        style={{
          height: 54,
          background: '#1a2235',
          borderBottom: '1px solid rgba(100,140,190,0.1)',
        }}
      >
        <div className="w-full max-w-5xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5" style={{ textDecoration: 'none' }}>
            <div className="w-2 h-2 rounded-full" style={{ background: '#00d4ff' }} />
            <span className="text-[17px] font-bold tracking-tight" style={{ color: '#edf2f7' }}>
              Axiom
            </span>
          </a>
        </div>
      </nav>

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-5 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
