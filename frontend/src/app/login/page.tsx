"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { SignInPage } from "@/components/ui/sign-in";
import AsciiHero from "@/components/AsciiHero";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    try {
      await login(email, password);
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-background text-foreground">
      <SignInPage
        title={
          <span className="font-light text-foreground tracking-tighter">
            {error ? (
              <><span className="block text-base text-red-400 font-medium mb-2">{error}</span>Welcome back</>
            ) : "Welcome back"}
          </span>
        }
        description="Sign in to your Axiom account to continue"
        onSignIn={handleSignIn}
        onCreateAccount={() => router.push("/register")}
        heroElement={<AsciiHero />}
      />
    </div>
  );
}
