"use client";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) router.replace("/login");
      else if (user.role === "requester") router.replace("/dashboard");
      else router.replace("/annotate");
    }
  }, [user, loading, router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--ax-accent)', borderTopColor: 'transparent' }} />
        <span className="text-[13px]" style={{ color: 'var(--ax-text-tertiary)' }}>Loading...</span>
      </div>
    </div>
  );
}
