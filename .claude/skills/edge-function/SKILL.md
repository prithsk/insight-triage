---
name: edge-function
version: 1.0.0
description: Write or review a Supabase edge function without opening a PHI hole. Auth before service-role, validate before trust. (Kroix)
triggers:
  - new edge function
  - supabase function
  - add an endpoint
  - review this function
allowed-tools:
  - Read
  - Write
  - Edit
  - Grep
  - Glob
  - Bash
---

# Edge functions

Every Kroix edge function that touches data builds a **service-role** client.
That client has `BYPASSRLS`. Every row-level policy protecting patient data is
inert inside it.

So the edge function is not "behind" the security model. For the duration of the
request, it *is* the security model.

---

## The order that matters

```ts
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // 1. AUTHENTICATE AND AUTHORIZE — before anything else
  const auth = await requireApprovedUser(req);
  if ("error" in auth) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2. PARSE — a malformed body is a 400, not a 500
  let body: MyRequest;
  try { body = await req.json(); }
  catch { return bad("Invalid JSON body"); }

  // 3. VALIDATE — before the service-role client exists
  const err = validate(body);
  if (err) return bad(err);

  // 4. ONLY NOW construct the RLS-bypassing client
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  // 5. Do the work
});
```

Steps 1 and 3 must both complete before step 4. `rag-embed` had step 1 but not
step 3: it built a service-role client and then interpolated caller-supplied
`sourceId` straight into a Pinecone vector id and an `embeddings` row. Any
approved user could write arbitrary rows and arbitrary vectors into the shared
namespace, which the assistant later surfaces as clinical context.

---

## Validation rules

Validate every field the caller controls. "It's typed as a string" is a
compile-time claim about your code, not a runtime claim about their input.

- **Enums** — check membership against an explicit list, never a cast.
- **IDs** — match the UUID regex. Anything interpolated into a key, path, or
  external system id is the highest-risk field on the request.
- **Free text** — cap the length. Unbounded content becomes an unbounded bill
  when it reaches an embedding or LLM endpoint.
- **Objects** — cap key count, reject nested objects and functions, cap value
  length. An open `Record<string, unknown>` written to a database is a schema
  you did not design.
- **Numbers** — range check. `NaN` and `Infinity` are numbers.

Return 400 with a specific message. Do not throw; an unhandled throw is a 500
that tells the caller nothing and you nothing.

## Authorization is not authentication

`requireApprovedUser` establishes *who* and *whether they are approved*. It does
not establish that this user may touch *this row*. If the function acts on a
specific study, document, or profile, check ownership or scope explicitly — the
service-role client will happily read anyone's.

## Client-side calls need the session JWT

From the app, send the signed-in user's token, not the publishable key:

```ts
const { data: { session } } = await supabase.auth.getSession();
if (!session?.access_token) throw new Error("Your session expired. Sign in again.");
// Authorization: `Bearer ${session.access_token}`
```

The anon key authenticates as nobody. `getUser()` on it returns 401, so the call
fails for every user. This broke DICOM inference in `useUploadDicom` and
`useStudies` and went unnoticed because the failure looked like a server problem.

Do not fall back to the anon key when there is no session. Fail loudly.

## Secrets

`Deno.env.get(...)` only. Never a literal. Never anything `VITE_`-prefixed —
those are inlined into the public browser bundle.

## Logging

Do not log request bodies, patient identifiers, file paths, or model output on a
PHI path. Log the operation, the outcome, and a study id at most. Logs are a
data store with weaker access control than the database.

## CORS

`Access-Control-Allow-Origin: *` is the current default here. It is acceptable
only because every PHI path also checks the bearer token — CORS is not doing
security work. If a function is ever added that relies on origin, tighten it.

---

## Review checklist

For a new or changed function:

1. Does `requireApprovedUser` run before the service-role client is constructed?
2. Is every caller-controlled field validated before that point?
3. Is anything interpolated into an id, path, query, or external key validated as
   a UUID or against an allowlist?
4. Are row-level ownership checks present where the function acts on one record?
5. Are secrets read from the environment only?
6. Does any log line carry PHI?
7. Do the app-side callers send the session JWT rather than the anon key?

Then run `/preflight`.

## Existing functions

`send-contact-email` and `validate-email` are intentionally unauthenticated and
rate-limited; they touch no PHI. Every other function must gate on
`requireApprovedUser`. If a new function does not need auth, say why in a comment
at the top, because the default assumption for this codebase is that it does.
