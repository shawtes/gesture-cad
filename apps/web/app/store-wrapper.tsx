"use client";

import { CADStoreProvider } from "@/lib/store";

export function CADStoreWrapper({ children }: { children: React.ReactNode }) {
  return <CADStoreProvider>{children}</CADStoreProvider>;
}
