"use client"

import { useEffect, useRef, useState } from "react"
import { Bell, Check, Cloud, Flame, MessageCircleHeart, Rocket, Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Button as StatefulButton } from "@/components/ui/stateful-button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "studyflow-community-popup"
const SESSION_KEY = "studyflow-community-popup-session"
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000
// const SNOOZE_MS = 0
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type PopupRecord = {
  joined?: boolean
  email?: string
  signedUpAt?: string
  remindUntil?: number
  offered?: boolean
}

const PERKS = [
  {
    icon: Rocket,
    title: "Sign up as a beta tester",
    detail: "Get the fastest updates as they ship",
    tone: "bg-primary/15 text-primary",
  },
  {
    icon: Cloud,
    title: "Test new beta features",
    detail: "Try upcoming extras like cloud saving",
    tone: "bg-sky-500/15 text-sky-600",
  },
  {
    icon: MessageCircleHeart,
    title: "Leave your opinion",
    detail: "Tell us what you love — and what to fix",
    tone: "bg-rose-500/15 text-rose-600",
  },
  {
    icon: Flame,
    title: "Streak with your friends",
    detail: "See friends' tasks and keep each other going",
    tone: "bg-amber-500/15 text-amber-600",
  },
] as const

function readRecord(): PopupRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PopupRecord) : {}
  } catch {
    return {}
  }
}

function writeRecord(next: PopupRecord) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

function shouldOpen(record: PopupRecord) {
  if (record.joined) return false
  if (record.remindUntil && Date.now() < record.remindUntil) return false
  const snoozeExpired = !!record.remindUntil && Date.now() >= record.remindUntil
  if (record.offered && !snoozeExpired) return false
  return true
}

export function CommunityPopup({
  offerId = 0,
  skipEligibility = false,
  showRemind = true,
}: {
  offerId?: number
  skipEligibility?: boolean
  showRemind?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [joined, setJoined] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const closeTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!offerId) return
    const record = readRecord()
    if (!skipEligibility) {
      if (!shouldOpen(record)) return
      if (sessionStorage.getItem(SESSION_KEY)) return
    }

    const appear = window.setTimeout(() => {
      if (!skipEligibility) {
        writeRecord({ ...record, offered: true, remindUntil: undefined })
      }
      setJoined(!!record.joined)
      setEmail(record.email ?? "")
      setError("")
      setLeaving(false)
      setOpen(true)
    }, skipEligibility ? 0 : 160)
    return () => window.clearTimeout(appear)
  }, [offerId, skipEligibility])

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 260)

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismissForSession()
    }
    window.addEventListener("keydown", onKey)

    return () => {
      document.body.style.overflow = previousOverflow
      window.clearTimeout(focusTimer)
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  useEffect(() => {
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current)
    }
  }, [])

  const hide = () => {
    setLeaving(true)
    window.setTimeout(() => {
      setOpen(false)
      setLeaving(false)
    }, 200)
  }

  const dismissForSession = () => {
    if (joined && skipEligibility) {
      hide()
      return
    }
    if (joined) return
    if (!skipEligibility) sessionStorage.setItem(SESSION_KEY, "1")
    hide()
  }

  const remindInThreeDays = () => {
    const current = readRecord()
    writeRecord({ ...current, remindUntil: Date.now() + SNOOZE_MS })
    hide()
  }

  const handleJoin = async () => {
    const value = email.trim().toLowerCase()

    if (!EMAIL_RE.test(value)) {
      setError("Please enter a valid email")
      inputRef.current?.focus()
      throw new Error("invalid-email")
    }

    setError("")
    const signedUpAt = new Date().toISOString()

    const response = await fetch("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: value, signedUpAt }),
    })

    if (!response.ok) {
      setError("Could not send your signup. Please try again.")
      throw new Error("signup-failed")
    }

    writeRecord({ joined: true, email: value, signedUpAt })
  }

  const handleJoined = () => {
    setJoined(true)
    closeTimer.current = window.setTimeout(hide, 1800)
  }

  if (!open) return null

  return (
    <div
      className={cn(
        "fixed inset-0 z-[90] flex items-end justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-6",
        "bg-foreground/40 backdrop-blur-sm transition-opacity duration-200",
        leaving && "opacity-0"
      )}
      onClick={dismissForSession}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="community-popup-title"
        aria-describedby="community-popup-desc"
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "relative w-full max-w-md overflow-hidden rounded-[28px] border border-border/60 bg-card shadow-2xl",
          "max-h-[min(92dvh,720px)] overflow-y-auto",
          leaving ? "community-card-leave" : "community-card-enter"
        )}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-accent to-primary" />
        <div className="pointer-events-none absolute -left-16 -top-20 h-48 w-48 rounded-full bg-primary/25 blur-3xl community-orb" />
        <div className="pointer-events-none absolute -right-10 top-8 h-36 w-36 rounded-full bg-accent/30 blur-3xl community-orb-delayed" />
        <div className="pointer-events-none absolute bottom-10 left-1/3 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />

        <button
          type="button"
          onClick={dismissForSession}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/70 text-muted-foreground backdrop-blur transition-colors hover:bg-background hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        
        <div className="relative px-5 pb-5 pt-7 sm:px-7 sm:pb-6 sm:pt-8">
          {joined ? (
            <div className="flex flex-col items-center py-8 text-center sm:py-10">
              <div className="community-icon-in mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="community-perk text-2xl font-bold text-foreground">You&apos;re in!</h2>
              <p className="community-perk mt-2 max-w-xs text-sm text-muted-foreground text-pretty" style={{ animationDelay: "50ms" }}>
                Welcome to the StudyFlow community. We&apos;ll send the fastest updates to your inbox.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-5 flex flex-col items-center text-center sm:mb-6">
                <div className="community-icon-in mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg">
                  <Users className="h-7 w-7 text-white" />
                </div>
                <p className="community-perk mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Beta community
                </p>
                <h2 id="community-popup-title" className="community-perk text-2xl font-bold tracking-tight text-foreground sm:text-[1.7rem]" style={{ animationDelay: "40ms" }}>
                  Join StudyFlow
                </h2>
                <p id="community-popup-desc" className="community-perk mt-2 max-w-sm text-sm text-muted-foreground text-pretty" style={{ animationDelay: "70ms" }}>
                  Leave your email and help shape what&apos;s next — early features, friend streaks, and faster updates.
                </p>
              </div>
              <form
                onSubmit={(event) => event.preventDefault()}
                className="community-perk flex w-full flex-col gap-3"
                style={{ animationDelay: "110ms" }}
              >
                <Input
                  ref={inputRef}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    if (error) setError("")
                  }}
                  aria-invalid={!!error}
                  aria-describedby={error ? "community-email-error" : undefined}
                  className="h-12 w-full rounded-xl bg-background px-4 text-base shadow-sm"
                />
                {error && (
                  <p id="community-email-error" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                <StatefulButton
                  type="submit"
                  className="w-full"
                  onClick={handleJoin}
                  onSuccess={handleJoined}
                >
                  Join community
                </StatefulButton>
              </form>

              {showRemind && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={remindInThreeDays}
                  className="community-perk mt-2 h-11 w-full rounded-xl text-muted-foreground hover:text-foreground"
                  style={{ animationDelay: "150ms" }}
                >
                  <Bell className="h-4 w-4" />
                  Remind me in 3 days
                </Button>
              )}

              <ul className="mt-5 space-y-2.5">
                {PERKS.map((perk, index) => {
                  const Icon = perk.icon
                  return (
                    <li
                      key={perk.title}
                      className="community-perk flex items-start gap-3 rounded-2xl border border-border/50 bg-muted/30 px-3 py-2.5"
                      style={{ animationDelay: `${190 + index * 40}ms` }}
                    >
                      <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", perk.tone)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 pt-0.5">
                        <span className="block text-sm font-semibold text-foreground">{perk.title}</span>
                        <span className="block text-xs text-muted-foreground text-pretty">{perk.detail}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
