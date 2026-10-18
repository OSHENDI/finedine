import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

// A button that is only an icon. It must carry a label for screen readers.
type Tone = "bare" | "soft" | "add";

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label: string;
  tone?: Tone;
  ref?: Ref<HTMLButtonElement>;
  children: ReactNode;
};

export default function IconButton({ label, tone = "bare", className, type = "button", children, ...props }: IconButtonProps) {
  const classes = ["fd-ibtn", `fd-ibtn--${tone}`, tone === "add" ? "fd-live" : "", className ?? ""];
  return (
    <button aria-label={label} className={classes.filter(Boolean).join(" ")} type={type} {...props}>
      {children}
    </button>
  );
}
