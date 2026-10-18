import type { ButtonHTMLAttributes } from "react";

// The one button. Every text button in the customer app is this component, so size, shape,
// states and the alive look change in one place.
type Variant = "primary" | "soft" | "quiet";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  block?: boolean;
  // Primary buttons breathe: a very slow, faint lift in brightness and colour.
  live?: boolean;
};

export default function Button({ variant = "primary", block = false, live, className, type = "button", ...props }: ButtonProps) {
  const classes = ["fd-btn", variant !== "primary" ? `fd-btn--${variant}` : "", block ? "fd-btn--block" : "", (live ?? variant === "primary") ? "fd-live" : "", className ?? ""];
  return <button className={classes.filter(Boolean).join(" ")} type={type} {...props} />;
}
