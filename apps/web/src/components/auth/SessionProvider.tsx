"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { UserRole } from "@loqme/types";
import { clearBusinessDraft } from '@/lib/business/draft';

type SessionUser = {
  id?: string;
  userId?: string;
  mobile: string;
  role: UserRole;
  fullName?: string | null;
};
type SessionState = {
  user: SessionUser | null;
  status: "loading" | "authenticated" | "anonymous" | "unavailable";
};
const SessionContext = createContext<
  | (SessionState & {
      refresh: () => Promise<void>;
      setUser: (user: SessionUser | null) => void;
    })
  | null
>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({
    user: null,
    status: "loading",
  });
  const revision = useRef(0);
  const invalidate = useCallback(() => {
    revision.current++;
  }, []);
  const setUser = useCallback((user: SessionUser | null) => {
    if (!user) clearBusinessDraft();
    revision.current++;
    setState({ user, status: user ? "authenticated" : "anonymous" });
  }, []);
  const refresh = useCallback(async () => {
    const current = ++revision.current;
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      if (!response.ok) throw new Error("Session unavailable");
      const result = await response.json();
      if (revision.current === current)
        setState(previous => {
          if (!result.authenticated && previous.status === 'authenticated') clearBusinessDraft();
          return { user: result.authenticated ? result.user : null, status: result.authenticated ? 'authenticated' : 'anonymous' };
        });
    } catch {
      // A network failure must not erase a known session or imply logout.
      if (revision.current === current)
        setState((previous) =>
          previous.status === "loading"
            ? { user: null, status: "unavailable" }
            : previous,
        );
    }
  }, []);
  useEffect(() => {
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      invalidate();
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, invalidate]);
  return (
    <SessionContext.Provider value={{ ...state, setUser, refresh }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("SessionProvider is required");
  return context;
}
