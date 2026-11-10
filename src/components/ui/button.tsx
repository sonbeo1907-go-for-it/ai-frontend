import type { ButtonHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "success" | "danger" | "ghost";
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}
export function Button({
  className,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  children,
  ...props
}: Props) {
  const variants: Record<Variant, string> = {
    primary: "bg-slate-900 text-white shadow-sm hover:bg-slate-800",
    secondary:
      "border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50",
    success: "bg-emerald-600 text-white shadow-sm shadow-emerald-200 hover:bg-emerald-700",
    danger: "bg-rose-50 text-rose-700 hover:bg-rose-100",
    ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
  };
  const sizes = { sm: "h-9 px-3 text-xs", md: "h-10 px-4 text-sm", lg: "h-12 px-5 text-sm" };
  return (
    <button
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-2 rounded-lg font-bold transition disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" />}
      {children}
    </button>
  );
}
