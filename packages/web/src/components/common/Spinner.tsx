import styles from "./Spinner.module.css";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <div className={`${styles.spinner} ${className || ""}`}>
      <div className={`${styles.ring} ${styles[size]}`} />
    </div>
  );
}
