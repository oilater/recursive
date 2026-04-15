import * as styles from "./status-message.css";

interface StatusMessageProps {
  variant: "loading" | "error";
  children: React.ReactNode;
}

export function StatusMessage({ variant, children }: StatusMessageProps) {
  return (
    <div className={variant === "error" ? styles.error : styles.loading}>
      {children}
    </div>
  );
}
