import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
        mono: ['IBM Plex Mono', 'monospace'],
        grotesk: ['Space Grotesk', 'system-ui', 'sans-serif'],
        // Public-site display type. `display` is the Linear/Legora-style tight
        // geometric; `editorial` is the Harvey-style serif for statement lines.
        display: ['Inter Tight', 'Inter', 'system-ui', 'sans-serif'],
        editorial: ['Instrument Serif', 'Times New Roman', 'serif'],
      },
      colors: {
        // Kroix Precision — THE palette, for the public site and the clinical app
        // alike. 1703 uses across `src/` as of 2026-09-26.
        //
        // This comment used to read "Landing/About/Contact/Auth only ... never used
        // by the dashboard, so the clinical app is unaffected". That stopped being
        // true and nobody updated it, which made it a trap: it invites the next
        // person to treat a `kx-*` change as safe for the clinical app. It is not.
        // Anything edited here lands on the worklist and the reviewer too.
        //
        // The `landing.*` block further down is the opposite case — it is DEAD.
        // Zero utility-class uses in `src/`. Left in place rather than deleted so
        // the warm sage/gold direction it encodes is not lost, but nothing renders
        // from it today.
        kx: {
          canvas:   "#FFFFFF",
          surface:  "#F6F7F9",
          surface2: "#EDEFF3",
          ink:      "#12151A",
          muted:    "#6B7280",
          border:   "rgba(18,21,26,0.08)",
          critical: "#E8503A",
          accent2:  "#3B5BFF",
          accent3:  "#0F9D6E",
          tint2:    "#EEF1FF",
          tint3:    "#EAF7F1",

          // Added for the dense worklist. Two additions, both about contrast:
          //
          // `critical` (#E8503A) measures 3.7:1 against #FFFFFF. That clears the
          // 3:1 floor for a non-text UI element (WCAG 2.2 SC 1.4.11), so it is
          // still the right fill for a progress bar or a severity rule — but it
          // is below the 4.5:1 body-text floor (SC 1.4.3), and the worklist uses
          // it as text ("18m over", "3 Over target"). `critical-ink` is the same
          // hue at text weight: 6.0:1 on white.
          //
          // `warn` is the approaching-target amber. There was no amber token at
          // all, which is why WorklistCard/StudyPreview reached for raw
          // `amber-50` / `amber-700` Tailwind against the kx-only rule in
          // CLAUDE.md. 5.0:1 on white.
          //
          // Existing values above are untouched.
          "critical-ink": "#B03A28",
          warn:           "#B45309",

          // Warm paper ground, for the E-series editorial variants.
          //
          // `surface` (#F6F7F9) and `muted` (#6B7280 — Tailwind's gray-500) are
          // blue-cast. Every design reference collected for this product is warm
          // off-white: Harvey, Moda, Petrarch, Forward, RonanRx. Side by side the
          // difference reads as "software" versus "document", which is most of
          // what separates the landing page's feel from the worklist's.
          //
          // ADDITIVE ONLY. Nothing existing is repointed, so the live dashboard
          // and landing page are unchanged until something opts in. If an E
          // variant is chosen, the move is to repoint `surface`/`muted` here
          // rather than to sprinkle `paper` through the app.
          // `paper-muted` is 5.17:1 on `paper` — it shipped at #8A8378, which is
          // 3.47:1 and fails SC 1.4.3, in the same commit that added these
          // tokens to enforce contrast elsewhere. Computed, not eyeballed.
          paper:      "#F7F6F3",
          paper2:     "#EFEDE7",
          "paper-ink":  "#1A1815",
          "paper-muted":"#6E675C",
          "paper-line": "rgba(26,24,21,0.10)",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: {
          DEFAULT: "hsl(var(--surface))",
          foreground: "hsl(var(--surface-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Urgency colors
        critical: {
          DEFAULT: "hsl(var(--critical))",
          foreground: "hsl(var(--critical-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        clear: {
          DEFAULT: "hsl(var(--clear))",
          foreground: "hsl(var(--clear-foreground))",
        },
        "overlay-accent": "hsl(var(--overlay-accent))",
        // Landing page eco palette
        landing: {
          bg: "#ECEFEA",
          surface: "#FFFFFF",
          dark: "#15201B",
          deep: "#0E1814",
          primary: "#2F6F5E",
          secondary: "#4B7F6A",
          accent: "#C89F65",
          heading: "#1B1F1D",
          body: "#4A5A54",
          muted: "#7C8B85",
        },
        // Chart colors
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "slide-in": {
          "0%": { transform: "translateX(-10px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "fade-up": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "stream-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-slow": "pulse-slow 2s ease-in-out infinite",
        "slide-in": "slide-in 0.3s ease-out",
        "fade-up": "fade-up 0.3s ease-out",
        "blink": "blink 0.85s ease-in-out infinite",
        "stream-in": "stream-in 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
