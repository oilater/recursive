"use client";

import * as styles from "./error.css";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Oops!</h1>
      <p className={styles.message}>{error.message || "Something went wrong."}</p>
      <div className={styles.actions}>
        <button onClick={reset} className={styles.retryButton}>
          Try again
        </button>
        <a href="/" className={styles.homeLink}>
          Go home
        </a>
      </div>
    </div>
  );
}
