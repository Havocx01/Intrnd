import { ButtonHTMLAttributes, ReactNode, forwardRef } from "react";
import { Link, LinkProps } from "react-router-dom";

type Variant = "default" | "primary" | "secondary" | "ghost" | "link";
type Size = "sm" | "md" | "lg";

interface SharedProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

export type AppButtonProps = SharedProps & ButtonHTMLAttributes<HTMLButtonElement> & { as?: "button" };

export const AppButton = forwardRef<HTMLButtonElement, AppButtonProps>(function AppButton(
  { variant = "default", size = "md", block, iconLeft, iconRight, children, className, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={["app-btn", className].filter(Boolean).join(" ")}
      data-variant={variant}
      data-size={size}
      data-block={block ? "true" : undefined}
      {...rest}>
      {iconLeft}
      <span>{children}</span>
      {iconRight}
    </button>
  );
});

export type AppLinkButtonProps = SharedProps & LinkProps;

export function AppLinkButton({
  variant = "default",
  size = "md",
  block,
  iconLeft,
  iconRight,
  children,
  className,
  ...rest
}: AppLinkButtonProps) {
  return (
    <Link
      className={["app-btn", className].filter(Boolean).join(" ")}
      data-variant={variant}
      data-size={size}
      data-block={block ? "true" : undefined}
      {...rest}>
      {iconLeft}
      <span>{children}</span>
      {iconRight}
    </Link>
  );
}
