Rewrite `/about`, `/contact`, and `/reset-password` pages to match the light eco UI already used on Login, Signup, and Forgot Password.

## Shared design tokens to apply
- Background: `bg-landing-bg` (off-white #F6F7F4) with the same subtle grain SVG overlay
- Fixed top nav (blur, Kroix wordmark in Playfair, About / Contact / Login links)
- Headings: `font-serif` Playfair, tracking `-0.01em`, `text-landing-heading`
- Body: `text-landing-body`, 15px
- Accent: `bg-landing-primary` (eucalyptus #2F6F5E), hover `#265A4C`
- Cards / surfaces: `bg-white` with `border-[rgba(0,0,0,0.06)]`, rounded-2xl, `shadow-sm`
- Inputs / buttons match Login/ForgotPassword styling (h-11, rounded-[10px])
- Footer tagline: "Non-diagnostic workflow tool. For clinical decision support only."

## src/pages/About.tsx
- Remove `AppLayout`, dark surfaces, and shadcn `Card`
- Replace with landing-style nav + sections on `bg-landing-bg`
- Keep existing content: hero ("Radiology Workflow is Broken"), stats (2.4M / 30% / 72hrs), Challenge cards, Solution feature grid, Vision block, footer disclaimer
- Icons stay (lucide), tinted with `text-landing-primary` (swap `text-critical` accents to a muted warm tone that reads on light bg; keep the "A Healthcare Crisis" pill but recolor to a soft terracotta/amber on tinted background so it still signals urgency without dark-mode reds)
- Section backgrounds alternate between `bg-landing-bg` and a subtle `bg-[#E8EBE4]` band for rhythm

## src/pages/Contact.tsx
- Rewrite to same light shell (nav + grain + gradient)
- Centered white card with Playfair heading, form fields (name, email, message) styled like ForgotPassword inputs, primary submit button with `ArrowRight`
- Preserve existing form logic, validation, Resend edge function call, toasts, and any rate-limit / security hooks — only presentation changes
- Include the same footer tagline

## src/pages/ResetPassword.tsx
- Rewrite to mirror ForgotPassword exactly (nav, grain, gradient, white card)
- Keep all logic: `PASSWORD_RECOVERY` listener, password/confirm inputs, min length 6, `supabase.auth.updateUser`, success state with 3s redirect to `/login`
- Success state uses a landing-primary tinted circle with `CheckCircle2` (same pattern as ForgotPassword's Mail icon)
- "Validating your reset link…" warning restyled to a soft amber notice on light bg instead of dark warning card

## Scope guardrails
- Frontend/presentation only — no route, auth, or edge-function changes
- No changes to design tokens in `index.css` or `tailwind.config.ts`
- Run `tsgo --noEmit` after edits to confirm build stays green