import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { Profile } from "@/types/database";

interface SignupInput {
  name: string;
  email: string;
  dept: string;
  role: string;
  password: string;
}

interface AuthState {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  configured: boolean;
  /** 'in' = approved & signed in · 'pending' = awaiting approval · 'out' */
  status: "loading" | "out" | "pending" | "in";
  login: (email: string, password: string) => Promise<{ error?: string }>;
  signup: (input: SignupInput) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  async function loadProfile(userId: string | undefined) {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    setProfile((data as Profile) ?? null);
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      await loadProfile(s?.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const login: AuthState["login"] = async (email, password) => {
    if (!isSupabaseConfigured) return { error: "Supabase가 설정되지 않았습니다 (.env 확인)." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const signup: AuthState["signup"] = async (input) => {
    if (!isSupabaseConfigured) return { error: "Supabase가 설정되지 않았습니다 (.env 확인)." };
    const { error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { name: input.name, dept: input.dept, role: input.role },
      },
    });
    if (error) return { error: error.message };
    return {};
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  const refreshProfile = async () => loadProfile(session?.user.id);

  const status: AuthState["status"] = useMemo(() => {
    if (loading) return "loading";
    if (!session) return "out";
    if (profile?.status === "approved") return "in";
    return "pending";
  }, [loading, session, profile]);

  const value: AuthState = {
    loading,
    session,
    profile,
    configured: isSupabaseConfigured,
    status,
    login,
    signup,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
