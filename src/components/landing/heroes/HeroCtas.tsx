import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

/** The two hero actions, sized to sit inside the first fold on every variant. */
export function HeroCtas({
  align = "left",
  onDark = false,
}: {
  align?: "left" | "center";
  onDark?: boolean;
}) {
  return (
    <div className={`flex flex-wrap gap-3 ${align === "center" ? "justify-center" : ""}`}>
      <Link to="/contact">
        <button
          className={`px-7 py-3.5 rounded-full text-[15px] font-semibold transition-opacity hover:opacity-90 flex items-center gap-2 ${
            onDark ? "bg-white text-kx-ink" : "bg-kx-ink text-white"
          }`}
        >
          Request demo
          <ArrowRight className="w-4 h-4" />
        </button>
      </Link>
      <Link to="/dashboard">
        <button
          className={`px-7 py-3.5 rounded-full text-[15px] font-medium border transition-colors ${
            onDark
              ? "border-white/25 text-white hover:border-white/60 hover:bg-white/5"
              : "border-kx-border bg-white text-kx-ink hover:border-kx-ink/40"
          }`}
        >
          See the product
        </button>
      </Link>
    </div>
  );
}
