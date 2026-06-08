"use client"

import { useEffect } from "react"
import { useStore } from "@/lib/store"

const THEME_COLORS: Record<string, { primary: string; accent: string }> = {
  coral: { primary: "oklch(0.72 0.12 25)", accent: "oklch(0.85 0.1 170)" },
  blue: { primary: "oklch(0.6 0.15 250)", accent: "oklch(0.75 0.12 200)" },
  green: { primary: "oklch(0.6 0.15 145)", accent: "oklch(0.8 0.12 100)" },
  purple: { primary: "oklch(0.55 0.2 290)", accent: "oklch(0.75 0.15 320)" },
  amber: { primary: "oklch(0.7 0.15 70)", accent: "oklch(0.8 0.1 50)" },
  rose: { primary: "oklch(0.65 0.18 10)", accent: "oklch(0.8 0.12 350)" },
}

export function ColorThemeProvider({ children }: { children: React.ReactNode }) {
  const themeColor = useStore((state) => state.themeColor)

  useEffect(() => {
    const theme = THEME_COLORS[themeColor] || THEME_COLORS.coral
    document.documentElement.style.setProperty("--primary", theme.primary)
    document.documentElement.style.setProperty("--accent", theme.accent)
    document.documentElement.style.setProperty("--ring", theme.primary)
  }, [themeColor])

  return <>{children}</>
}
