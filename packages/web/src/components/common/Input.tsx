import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import styles from "./Input.module.css";

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  hint?: string;
}

export function InputField({
  label,
  required,
  hint,
  className,
  ...props
}: InputFieldProps) {
  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <input className={`${styles.input} ${className || ""}`} {...props} />
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}

interface TextareaFieldProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  required?: boolean;
  hint?: string;
}

export function TextareaField({
  label,
  required,
  hint,
  className,
  ...props
}: TextareaFieldProps) {
  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <textarea
        className={`${styles.input} ${styles.textarea} ${className || ""}`}
        {...props}
      />
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  );
}
