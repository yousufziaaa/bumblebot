import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BumbleBot — Greenhouse Yield Dashboard",
  description: "Tomato yield estimation via computer vision",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="scan-line" />
        {children}
      </body>
    </html>
  );
}
