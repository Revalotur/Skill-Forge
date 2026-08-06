"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "@/components/theme/theme-provider";

export function Toaster() {
  const { theme } = useTheme();
  return (
    <SonnerToaster
      theme={theme}
      position="top-right"
      richColors
      toastOptions={{
        style: { fontFamily: "var(--font-jakarta-sans)" },
      }}
    />
  );
}
