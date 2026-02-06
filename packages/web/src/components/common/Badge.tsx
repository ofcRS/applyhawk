import type { ReactNode } from "react";
import styles from "./Badge.module.css";

interface BadgeProps {
  variant?: "default" | "success" | "warning" | "error" | "accent";
  children: ReactNode;
  className?: string;
}

export default function Badge({
  variant = "default",
  children,
  className,
}: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${className || ""}`}>
      {children}
    </span>
  );
}
