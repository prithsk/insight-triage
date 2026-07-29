# Security

Kroix handles protected health information: chest X-ray imaging, triage scores,
laboratory results, and clinician sign-off records. Security reports are taken
seriously and are welcome.

## Reporting a vulnerability

Email **supercurry300@gmail.com** with `SECURITY` in the subject.

Please do not open a public GitHub issue for a security report. This repository is
public, and an issue describing a live hole is a disclosure to everyone at once.

Include what you can:

- What you found and where (file, endpoint, table, or policy)
- The request or steps that demonstrate it
- What data or capability it exposes
- Whether you accessed any data beyond what was needed to confirm it

You will get an acknowledgement within 72 hours and an assessment within seven days.
Please allow 90 days before public disclosure, or less if a fix ships sooner. Credit
is given unless you would rather stay anonymous.

## Scope

**In scope**
- This repository
- Supabase row-level security policies and the approval gate that governs PHI access
- Edge functions under `supabase/functions/`
- Authentication, session handling, and route protection
- The ML inference API
- Storage bucket policies for `dicom-files` and `documents`

**Out of scope**
- Denial of service and volumetric testing
- Social engineering of the maintainer or any user
- Findings from automated scanners with no demonstrated impact
- Vulnerabilities in third-party services (report those to the vendor)
- Anything requiring physical access

## Please do not

- Access, download, or retain PHI. If you reach patient data while confirming a
  finding, stop, do not save it, and say so in your report.
- Modify or delete data that is not yours.
- Test against accounts you do not control.

A proof of concept should demonstrate access, not exercise it.

## What we care about most

Given the data involved, these carry the highest severity:

1. Anything that lets an unapproved account read patient data. Signup is open, and
   an `approved` flag on the user profile is the gate. Any path around that flag is
   critical.
2. Privilege escalation, particularly writes to authorization-bearing columns.
3. Row-level security bypass. Permissive Postgres policies combine with OR, so an
   overly broad policy silently overrides a strict one.
4. Service-role key exposure, or reaching an RLS-bypassing code path with
   unvalidated input.
5. Storage bucket access without the approval gate.

## Known constraints

Kroix is pre-clinical and not FDA-cleared. It is a research and development system,
not an approved medical device, and it is not in clinical use. Reports are still
welcome, and the security posture is maintained as though it were deployed, because
it eventually will be.
