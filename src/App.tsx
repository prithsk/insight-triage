import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Reviewer from "./pages/Reviewer";
import Analytics from "./pages/Analytics";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Assistant from "./pages/Assistant";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
