import { Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function PendingApproval() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-landing-bg text-landing-heading flex items-center justify-center px-8">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-landing-primary/10 flex items-center justify-center mx-auto mb-6">
          <Clock className="w-8 h-8 text-landing-primary" />
        </div>
        <h1 className="font-serif text-[28px] text-landing-heading mb-3 tracking-[-0.01em]">
          Awaiting approval
        </h1>
        <p className="text-[15px] text-landing-body leading-relaxed mb-2">
          Your account (<strong className="text-landing-heading">{user?.email}</strong>) has been
          created but hasn't been approved for clinical access yet.
        </p>
        <p className="text-[15px] text-landing-body leading-relaxed mb-8">
          An administrator needs to verify and approve your account before you can view the
          worklist. Contact your site administrator to expedite this.
        </p>
        <button
          onClick={signOut}
          className="px-6 py-2.5 rounded-[10px] border border-landing-primary text-landing-primary hover:bg-landing-primary hover:text-white transition-colors text-[14px] font-medium"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
