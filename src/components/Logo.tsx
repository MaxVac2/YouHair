import { Sparkles } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: { icon: "w-5 h-5", text: "text-lg" },
  md: { icon: "w-6 h-6", text: "text-[22px]" },
  lg: { icon: "w-7 h-7", text: "text-2xl" },
};

export function Logo({ size = "md", className = "" }: LogoProps) {
  const s = sizes[size];
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <Sparkles className={`${s.icon} text-primary`} strokeWidth={2.4} />
      <span className={`font-display font-bold text-foreground tracking-tight ${s.text}`}>
        YouHair
      </span>
    </span>
  );
}
