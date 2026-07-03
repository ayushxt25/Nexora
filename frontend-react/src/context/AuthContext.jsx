import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setUnauthorizedHandler } from "../api/client";
import { getAuthProvider, isSupabaseAuthProvider } from "../lib/authProvider";
import { getSupabaseClient, getSupabaseConfigError } from "../lib/supabaseClient";

const AuthContext = createContext(null);

function deriveDisplayNameFromSupabaseUser(authUser) {
  if (!authUser) return null;

  const metadataName =
    authUser.user_metadata?.username ||
    authUser.user_metadata?.full_name ||
    authUser.user_metadata?.name ||
    authUser.app_metadata?.username;

  if (metadataName) return metadataName;
  if (authUser.email) return authUser.email.split("@", 1)[0];
  return authUser.id || null;
}

function deriveRoleFromSupabaseUser(authUser) {
  const candidates = [
    authUser?.app_metadata?.role,
    authUser?.user_metadata?.role,
    authUser?.role,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim().toLowerCase();
    }
  }

  return null;
}

export function AuthProvider({ children }) {
  const provider = getAuthProvider();
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState(() => localStorage.getItem("username") || null);
  const [role, setRole] = useState(() => localStorage.getItem("user_role") || null);
  const [token, setToken] = useState(() =>
    isSupabaseAuthProvider() ? null : localStorage.getItem("access_token") || null
  );
  const [loading, setLoading] = useState(isSupabaseAuthProvider());
  const navigate = useNavigate();

  const persistSessionIdentity = useCallback((nextUsername, nextRole) => {
    setUsername(nextUsername);
    setRole(nextRole);

    if (nextUsername) {
      localStorage.setItem("username", nextUsername);
    } else {
      localStorage.removeItem("username");
    }

    if (nextRole) {
      localStorage.setItem("user_role", nextRole);
    } else {
      localStorage.removeItem("user_role");
    }
  }, []);

  const login = useCallback(
    async (...args) => {
      if (provider === "supabase") {
        const [email, password] = args;
        const supabase = getSupabaseClient();
        const configError = getSupabaseConfigError();
        if (!supabase || configError) {
          throw new Error(configError || "Supabase client is not configured.");
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const authUser = data.user || data.session?.user || null;
        const nextUsername = deriveDisplayNameFromSupabaseUser(authUser);
        const nextRole = deriveRoleFromSupabaseUser(authUser);
        setUser(authUser);
        setToken(data.session?.access_token || null);
        persistSessionIdentity(nextUsername, nextRole);
        return data;
      }

      const [accessToken, legacyUsername, legacyRole = null] = args;
      localStorage.setItem("access_token", accessToken);
      setToken(accessToken);
      setUser(legacyUsername ? { username: legacyUsername, role: legacyRole } : null);
      persistSessionIdentity(legacyUsername, legacyRole);
      return { access_token: accessToken, role: legacyRole };
    },
    [persistSessionIdentity, provider]
  );

  const register = useCallback(
    async (identifier, password) => {
      if (provider === "supabase") {
        const supabase = getSupabaseClient();
        const configError = getSupabaseConfigError();
        if (!supabase || configError) {
          throw new Error(configError || "Supabase client is not configured.");
        }

        const { data, error } = await supabase.auth.signUp({
          email: identifier,
          password,
        });
        if (error) throw error;
        return data;
      }

      return api.register(identifier, password);
    },
    [provider]
  );

  const logout = useCallback(() => {
    if (provider === "supabase") {
      const supabase = getSupabaseClient();
      void supabase?.auth.signOut();
    } else {
      localStorage.removeItem("access_token");
    }

    localStorage.removeItem("username");
    localStorage.removeItem("user_role");
    setToken(null);
    setUsername(null);
    setRole(null);
    setUser(null);
  }, [provider]);

  useEffect(() => {
    if (provider !== "supabase") {
      const storedUsername = localStorage.getItem("username") || null;
      const storedToken = localStorage.getItem("access_token") || null;
      const storedRole = localStorage.getItem("user_role") || null;
      setUsername(storedUsername);
      setToken(storedToken);
      setRole(storedRole);
      setUser(storedUsername ? { username: storedUsername, role: storedRole } : null);
      setLoading(false);
      return undefined;
    }

    const supabase = getSupabaseClient();
    const configError = getSupabaseConfigError();
    if (!supabase || configError) {
      setUser(null);
      setToken(null);
      setUsername(null);
      setRole(null);
      setLoading(false);
      return undefined;
    }

    let active = true;

    async function bootstrapSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active) return;

      const authUser = session?.user || null;
      const nextUsername = deriveDisplayNameFromSupabaseUser(authUser);
      const nextRole = deriveRoleFromSupabaseUser(authUser);
      setUser(authUser);
      setToken(session?.access_token || null);
      persistSessionIdentity(nextUsername, nextRole);
      setLoading(false);
    }

    void bootstrapSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;

      const authUser = session?.user || null;
      const nextUsername = deriveDisplayNameFromSupabaseUser(authUser);
      const nextRole = deriveRoleFromSupabaseUser(authUser);
      setUser(authUser);
      setToken(session?.access_token || null);
      persistSessionIdentity(nextUsername, nextRole);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [persistSessionIdentity, provider]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      navigate("/login", { replace: true });
    });
  }, [logout, navigate]);

  const isAuthenticated = Boolean(token);

  return (
    <AuthContext.Provider
      value={{
        user,
        username,
        role,
        token,
        isAuthenticated,
        login,
        register,
        logout,
        loading,
        authProvider: provider,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
