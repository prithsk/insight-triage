import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RouteErrorBoundary, clearChunkReloadFlag } from "@/components/RouteErrorBoundary";

// Eager: the entry path. A visitor lands on one of these, and the auth pages are
// where they go next, so splitting them would only add a round-trip.
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

/**
 * Lazy: the clinical app and the secondary marketing pages.
 *
 * Everything below used to ship in the single entry chunk, so a visitor who only
 * read the landing page downloaded the whole worklist, reviewer and analytics
 * surface to render a hero. Recharts in particular is reached from `Analytics`
 * alone — an authenticated route — and was landing on every first paint.
 *
 * The `/…-variants` galleries are NOT in this list on purpose: they are already
 * absent from the production bundle. `import.meta.env.DEV` is replaced with
 * `false` at build time, Rollup drops the dead branch, and the imports tree-shake
 * with it. Verified by grepping `dist/` for strings unique to those pages — zero
 * hits. Making them lazy would change nothing and cost the tree-shaking guarantee.
 */
const Index = lazy(() => import("./pages/Index"));
const Reviewer = lazy(() => import("./pages/Reviewer"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Assistant = lazy(() => import("./pages/Assistant"));
const About = lazy(() => import("./pages/About"));
const Contact = lazy(() => import("./pages/Contact"));

// Dev-only design galleries. Statically imported so Rollup can prove they are
// unreachable in production and remove them entirely.
import HeroVariants from "./pages/HeroVariants";
import AboutVariants from "./pages/AboutVariants";
import InfoVariants from "./pages/InfoVariants";
import TraceVariants from "./pages/TraceVariants";
import WorklistVariants from "./pages/WorklistVariants";
import ReaderVariants from "./pages/ReaderVariants";
import AnalyticsVariantsPage from "./pages/AnalyticsVariants";
import HeroLab from "./pages/HeroLab";
import MotionLab from "./pages/MotionLab";
import Validation from "./pages/Validation";
import EditorialVariants from "./pages/EditorialVariants";
import TxtVariants from "./pages/TxtVariants";

const queryClient = new QueryClient();

/** Matches ProtectedRoute's own pending state, so a chunk fetch and an approval
 *  check don't look like two different kinds of waiting. */
function ClearReloadFlagOnMount() {
  useEffect(() => {
    // A route rendered, so whatever chunk problem there was is over. Reset the
    // one-shot guard; otherwise the next real failure gets no retry.
    clearChunkReloadFlag();
  }, []);
  return null;
}

function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ClearReloadFlagOnMount />
          <RouteErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                {/* Design comparison galleries. Internal tooling for picking section
                    variants — dev-only so they aren't publicly browsable in production. */}
                {import.meta.env.DEV && (
                  <>
                    <Route path="/validation" element={<Validation />} />
                    <Route path="/hero-variants" element={<HeroVariants />} />
                    <Route path="/about-variants" element={<AboutVariants />} />
                    <Route path="/info-variants" element={<InfoVariants />} />
                    <Route path="/trace-variants" element={<TraceVariants />} />
                    <Route path="/worklist-variants" element={<WorklistVariants />} />
                    <Route path="/editorial-variants" element={<EditorialVariants />} />
                    <Route path="/txt-variants" element={<TxtVariants />} />
                    <Route path="/reader-variants" element={<ReaderVariants />} />
                    <Route path="/analytics-variants" element={<AnalyticsVariantsPage />} />
                    <Route path="/hero-lab" element={<HeroLab />} />
                    <Route path="/motion-lab" element={<MotionLab />} />
                  </>
                )}
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/reviewer" element={<ProtectedRoute><Reviewer /></ProtectedRoute>} />
                <Route path="/reviewer/:studyId" element={<ProtectedRoute><Reviewer /></ProtectedRoute>} />
                <Route path="/analytics"  element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                <Route path="/assistant"  element={<ProtectedRoute><Assistant /></ProtectedRoute>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </RouteErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
