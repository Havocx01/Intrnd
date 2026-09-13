import { forwardRef } from "react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

type CommonProps = { variant?: Variant; size?: Size; iconLeft?: ReactNode; iconRight?: ReactNode; className?: string; children: ReactNode };

type ButtonAsButton = CommonProps & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & { as?: "button" };

type ButtonAsLink = CommonProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className"> & { as: "link"; to: string };

type ButtonAsAnchor = CommonProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className"> & { as: "a"; href: string };

export type ButtonProps = ButtonAsButton | ButtonAsLink | ButtonAsAnchor;

function classNames(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(function Button(props, ref) {
  const {
    variant = "primary",
    size = "md",
    iconLeft,
    iconRight,
    className,
    children,
    ...rest
  } = props as CommonProps & { as?: "button" | "link" | "a"; to?: string; href?: string };

  const dataAttrs = { "data-variant": variant, "data-size": size };

  const content = (
    <>
      {iconLeft}
      <span>{children}</span>
      {iconRight}
    </>
  );

  if ((rest as { as?: string }).as === "link") {
    const { as: _as, to, ...anchorRest } = rest as ButtonAsLink & { as: "link" };
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        to={to as string}
        className={classNames("hp-btn", className)}
        {...dataAttrs}
        {...(anchorRest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {content}
      </Link>
    );
  }

  if ((rest as { as?: string }).as === "a") {
    const { as: _as, href, ...anchorRest } = rest as ButtonAsAnchor & { as: "a" };
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href as string}
        className={classNames("hp-btn", className)}
        {...dataAttrs}
        {...(anchorRest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {content}
      </a>
    );
  }

  const { as: _as, ...buttonRest } = rest as ButtonAsButton & { as?: "button" };
  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type={(buttonRest as ButtonHTMLAttributes<HTMLButtonElement>).type ?? "button"}
      className={classNames("hp-btn", className)}
      {...dataAttrs}
      {...(buttonRest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {content}
    </button>
  );
});
