import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { NavWrapper } from "@/components/NavWrapper";

export const metadata: Metadata = {
  title: "Axiom",
  description: "Human Annotation Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <AuthProvider>
          <NavWrapper>{children}</NavWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
