import { Footer } from "@/shared/ui";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: "100vh" }}>
      <div style={{ flex: 1 }}>{children}</div>
      <Footer />
    </div>
  );
}
