import type { Metadata } from "next";
import "./globals.css";
import { CADStoreWrapper } from "./store-wrapper";

export const metadata: Metadata = {
  title: "GestureCAD — Hand Gesture Controlled CAD",
  description: "A premium CAD application controlled by hand gestures",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <CADStoreWrapper>{children}</CADStoreWrapper>
      </body>
    </html>
  );
}
