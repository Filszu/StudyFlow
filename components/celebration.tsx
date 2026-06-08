"use client"

import { useMemo } from "react"
import { Sparkles, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"

const CONFETTI_COLORS = [
  "#F5A9A9",
  "#A9D9F5",
  "#C5F5A9",
  "#F5D9A9",
  "#D9A9F5",
  "#A9F5E5",
]

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 2.5 + Math.random() * 2,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        size: 6 + Math.random() * 8,
        rounded: Math.random() > 0.5,
      })),
    []
  )

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="animate-confetti absolute top-0"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.rounded ? "9999px" : "2px",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

export function AllTasksCelebration({
  open,
  onClose,
  completedCount,
}: {
  open: boolean
  onClose: () => void
  completedCount: number
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
      <Confetti />
      <div className="animate-bounce-in relative w-full max-w-sm rounded-3xl bg-card p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Trophy className="h-10 w-10 text-primary" />
        </div>
        <div className="mb-2 flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          <h2 className="text-2xl font-bold text-foreground">All done!</h2>
          <Sparkles className="h-5 w-5 text-accent" />
        </div>
        <p className="animate-float-up mb-1 text-4xl" aria-hidden>
          🎉
        </p>
        <p className="mb-6 text-muted-foreground text-pretty">
          You finished all {completedCount} {completedCount === 1 ? "task" : "tasks"} for today.
          Amazing work, take a well-deserved break!
        </p>
        <Button onClick={onClose} className="w-full h-12 rounded-xl text-base">
          Keep it up
        </Button>
      </div>
    </div>
  )
}
