import type { Metadata } from "next";
import "../src/styles.css";

export const metadata: Metadata = {
  title: "Soedirman Portal · P3MD",
  description:
    "Portal kegiatan P3MD — layanan administrasi, informasi, koordinasi, dan pembelajaran serdik.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
