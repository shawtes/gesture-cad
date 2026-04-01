import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GestureCAD XR — AR/VR CAD Simulator",
  description: "Immersive AR/VR CAD viewer with hand tracking for Meta Quest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
