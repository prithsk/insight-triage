import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface ApprovedUser {
  id: string;
  email: string | undefined;
  role: "admin" | "radiologist";
}

/**
 * Verifies the caller's JWT and confirms their profile is approved before
 * any handler is allowed to use the service-role client. Returns an error
 * message on failure, or the verified user on success.
 */
export async function requireApprovedUser(
  req: Request
): Promise<{ user: ApprovedUser } | { error: string; status: number }> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: "Missing authorization", status: 401 };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Verify the JWT itself using the anon client (never trust an unverified token).
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: userError } = await authClient.auth.getUser();
  if (userError || !user) return { error: "Invalid or expired session", status: 401 };

  // Look up approval status with the service client (profiles RLS only allows
  // self-reads for non-admins, which is fine — this query is server-side).
  const adminClient = createClient(supabaseUrl, serviceKey);
  const { data: profile } = await adminClient
    .from("profiles")
    .select("approved, role")
    .eq("user_id", user.id)
    .single();

  if (!profile?.approved) return { error: "Account pending approval", status: 403 };

  return {
    user: { id: user.id, email: user.email, role: (profile.role as "admin" | "radiologist") ?? "radiologist" },
  };
}
