import type { HTMLAttributes, ReactNode } from "react";

type Tone = "neutral" | "brand" | "success" | "muted";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
}

export function Badge({ tone = "neutral", icon, children, className, ...rest }: BadgeProps) {
  return (
    <span className={["hp-badge", className].filter(Boolean).join(" ")} data-tone={tone} {...rest}>
      {icon}
      {children}
    </span>
  );
}
