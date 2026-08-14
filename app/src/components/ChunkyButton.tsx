import { useState, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";
import { color } from "../styles/tokens";

type Variant = "primary" | "secondary" | "white";

interface ChunkyButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
  fullWidth?: boolean;
}

const base: CSSProperties = {
  border: 0,
  cursor: "pointer",
  fontFamily: "inherit",
  fontWeight: 900,
  transition: "transform .06s ease, box-shadow .06s ease, background .15s ease, opacity .2s",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

function variantStyle(variant: Variant, disabled: boolean | undefined): CSSProperties {
  if (variant === "secondary") {
    return {
      background: "transparent",
      boxShadow: `inset 0 0 0 2px ${color.borderMuted}, 0 2px 0 0 ${color.borderMuted}`,
      color: "rgba(255,255,255,.82)",
      borderRadius: radiusFor(variant),
    };
  }
  if (variant === "white") {
    return {
      background: "#fff",
      color: color.bg,
      boxShadow: disabled ? "none" : "0 3px 0 rgba(127,96,220,.55)",
      borderRadius: 13,
    };
  }
  return {
    background: color.teal,
    color: color.bg,
    boxShadow: disabled ? "none" : `0 4px 0 ${color.tealLip}`,
    borderRadius: 16,
  };
}

function radiusFor(_variant: Variant) {
  return 12;
}

export function ChunkyButton({
  variant = "primary",
  children,
  fullWidth = true,
  disabled,
  style,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  ...rest
}: ChunkyButtonProps) {
  const [pressed, setPressed] = useState(false);

  const pressedShadow =
    variant === "primary" ? `0 1px 0 ${color.tealLip}`
    : variant === "white" ? "0 1px 0 rgba(127,96,220,.55)"
    : `inset 0 0 0 2px ${color.borderMuted}`;

  return (
    <button
      {...rest}
      disabled={disabled}
      onPointerDown={(e) => { setPressed(true); onPointerDown?.(e); }}
      onPointerUp={(e) => { setPressed(false); onPointerUp?.(e); }}
      onPointerLeave={(e) => { setPressed(false); onPointerLeave?.(e); }}
      style={{
        ...base,
        ...variantStyle(variant, disabled),
        width: fullWidth ? "100%" : undefined,
        padding: "14px 16px",
        fontSize: 15,
        letterSpacing: 0.4,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        transform: pressed && !disabled ? "translateY(3px)" : "none",
        boxShadow: pressed && !disabled ? pressedShadow : variantStyle(variant, disabled).boxShadow,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
