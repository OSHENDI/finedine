import type { ReactNode } from "react";

// The bottom bar of the order and payment screens: the total always in view, the action under it.
export default function CheckoutBar({ label, amount, children }: { label: string; amount: string; children: ReactNode }) {
  return (
    <div className="fd-sticky-cta">
      <div className="fd-cta-total">
        <span>{label}</span>
        <strong>{amount}</strong>
      </div>
      {children}
    </div>
  );
}
