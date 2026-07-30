"use client";

import dynamic from "next/dynamic";
import * as styles from "./home.css";

const HomeEditor = dynamic(() => import("./HomeEditor").then((m) => m.HomeEditor), {
  ssr: false,
  loading: () => (
    <div>
      <div className={styles.actionBar} style={{ minHeight: 34 }} />
      <div className={styles.editorCard}>
        <div className={styles.editorBody} />
      </div>
      <div className={styles.exampleRow} style={{ minHeight: 28 }} />
    </div>
  ),
});

export function HomeEditorLoader() {
  return <HomeEditor />;
}
