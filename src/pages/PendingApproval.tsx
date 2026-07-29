import { Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function PendingApproval() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-kx-surface text-kx-ink flex items-center justify-center px-8">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-kx-accent3/10 flex items-center justify-center mx-auto mb-6">
          <Clock className="w-8 h-8 text-kx-accent3" />
        </div>
        <h1 className="font-display text-[28px] text-kx-ink mb-3 tracking-[-0.01em]">
          Awaiting approval
        </h1>
        <p className="text-[15px] text-kx-muted leading-relaxed mb-2">
          Your account (<strong className="text-kx-ink">{user?.email}</strong>) has been
          created but hasn't been approved for clinical access yet.
        </p>
        <p className="text-[15px] text-kx-muted leading-relaxed mb-8">
          An administrator needs to verify and approve your account before you can view the
          worklist. Contact your site administrator to expedite this.
        </p>
        <button
          onClick={signOut}
          className="px-6 py-2.5 rounded-[10px] border border-kx-accent3 text-kx-accent3 hover:bg-kx-accent3 hover:text-white transition-colors text-[14px] font-medium"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
