import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Card.module.css";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
  glow?: boolean;
  compact?: boolean;
}

export default function Card({
  children,
  hoverable,
  glow,
  compact,
  className,
  ...props
}: CardProps) {
  const cls = [
    styles.card,
    hoverable && styles.hoverable,
    glow && styles.glow,
    compact && styles.compact,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls} {...props}>
      {children}
    </div>
  );
}
