import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  /**
   * True until the approval state for the current session is KNOWN — not merely
   * until the session itself is known. That distinction is the whole reason this
   * file reads the way it does; see the note in the effect.
   */
  loading: boolean;
  approved: boolean;
  role: "admin" | "radiologist" | null;
  /**
   * Set when the profile lookup itself failed. `approved === false` then means
   * "we could not find out", which is a different fact from "you are not
   * approved" and must not render the same screen.
   */
  profileError: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState(false);
  const [role, setRole] = useState<"admin" | "radiologist" | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  /**
   * Monotonic counter identifying the most recent session event. A profile fetch
   * only writes state if it is still the current one, so a slow response for a
   * signed-out session cannot overwrite a newer signed-in one.
   */
  const seqRef = useRef(0);
  const activeRef = useRef(true);
  const userIdRef = useRef<string | null>(null);

  const loadProfile = async (userId: string, seq: number) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("approved, role")
      .eq("user_id", userId)
      .maybeSingle();

    if (!activeRef.current || seq !== seqRef.current) return;

    if (error) {
      // Deliberately NOT falling through to `approved = false`. The previous
      // version destructured only `data`, so a network failure or an RLS denial
      // was indistinguishable from an unapproved account and the user was shown
      // "Awaiting approval" — a confident, wrong answer.
      setProfileError(error.message);
      setApproved(false);
      setRole(null);
      return;
    }

    setProfileError(null);
    setApproved(data?.approved ?? false);
    setRole((data?.role as "admin" | "radiologist") ?? null);
  };

  useEffect(() => {
    activeRef.current = true;

    /**
     * `loading` must not clear until the approval state is resolved.
     *
     * It used to clear synchronously while the profile fetch was deferred with
     * `setTimeout(..., 0)`. That left at least one render with
     * `loading === false`, `user` set, and `approved` still at its initial
     * `false` — which is exactly the state `ProtectedRoute` reads as "signed in
     * but not approved". So every approved radiologist saw the "Awaiting
     * approval" screen flash on every load and every refresh, for as long as
     * the profile query took. And when that query failed there was no second
     * render to correct it: the user sat on "Awaiting approval" permanently,
     * with no error shown and no way to retry.
     *
     * Note this only ever clears `loading`, never sets it back to true. An
     * hourly TOKEN_REFRESHED event therefore re-reads the profile silently in
     * the background — which is wanted, since it picks up an approval granted
     * mid-session — without throwing a spinner up under someone mid-task.
     */
    const applySession = (nextSession: Session | null) => {
      if (!activeRef.current) return;

      const seq = ++seqRef.current;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        userIdRef.current = null;
        setApproved(false);
        setRole(null);
        setProfileError(null);
        setLoading(false);
        return;
      }

      const userId = nextSession.user.id;
      userIdRef.current = userId;

      // The fetch stays deferred: calling back into supabase-js synchronously
      // from inside an onAuthStateChange callback can deadlock its internal
      // lock. Deferring is correct — clearing `loading` before it resolved was
      // not.
      setTimeout(() => {
        if (!activeRef.current || seq !== seqRef.current) return;
        void loadProfile(userId, seq).finally(() => {
          if (activeRef.current && seq === seqRef.current) setLoading(false);
        });
      }, 0);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => applySession(nextSession)
    );

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      applySession(existing);
    });

    return () => {
      activeRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    const userId = userIdRef.current;
    if (!userId) return;
    setLoading(true);
    await loadProfile(userId, seqRef.current);
    if (activeRef.current) setLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    seqRef.current++;
    userIdRef.current = null;
    setSession(null);
    setUser(null);
    setApproved(false);
    setRole(null);
    setProfileError(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{ session, user, loading, approved, role, profileError, refreshProfile, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
