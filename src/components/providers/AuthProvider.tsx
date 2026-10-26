"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup, signOut as firebaseSignOut } from "firebase/auth";
import { firebaseAuth, googleProvider } from "@/lib/firebase/client";
import { fetchJson } from "@/lib/queries/fetch-json";

export interface AuthAgent {
  id: string;
  email: string;
  name: string;
  role?: string;
}

interface AuthContextValue {
  agent: AuthAgent | null;
  isLoading: boolean;
  error: string | null;
  signInWithGoogle: (next?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [agent, setAgent] = useState<AuthAgent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchJson<{ agent: AuthAgent }>("/api/auth/session")
      .then((data) => {
        if (!cancelled) setAgent(data.agent);
      })
      .catch(() => {
        if (!cancelled) setAgent(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signInWithGoogle = useCallback(
    async (next?: string) => {
      setError(null);
      try {
        const result = await signInWithPopup(firebaseAuth, googleProvider);
        const idToken = await result.user.getIdToken();
        const data = await fetchJson<{ agent: AuthAgent }>("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        });
        setAgent(data.agent);
        router.push(next && next.startsWith("/") ? next : "/inicio");
      } catch (err) {
        // El usuario cerro el popup, o el backend rechazo el login (dominio
        // invalido / no esta en el staff) -- ambos casos quedan sin sesion.
        await firebaseSignOut(firebaseAuth).catch(() => {});
        setAgent(null);
        setError(err instanceof Error ? err.message : "No se pudo iniciar sesion");
      }
    },
    [router],
  );

  const signOut = useCallback(async () => {
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
    await firebaseSignOut(firebaseAuth).catch(() => {});
    setAgent(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ agent, isLoading, error, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
