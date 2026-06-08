"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { format } from "date-fns"
import { ArrowLeft, Download, Upload, Edit3, Check, Coffee, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useStore } from "@/lib/store"

const THEME_COLORS = [
  { name: "coral", label: "Coral", primary: "oklch(0.72 0.12 25)", accent: "oklch(0.85 0.1 170)" },
  { name: "blue", label: "Blue", primary: "oklch(0.6 0.15 250)", accent: "oklch(0.75 0.12 200)" },
  { name: "green", label: "Green", primary: "oklch(0.6 0.15 145)", accent: "oklch(0.8 0.12 100)" },
  { name: "purple", label: "Purple", primary: "oklch(0.55 0.2 290)", accent: "oklch(0.75 0.15 320)" },
  { name: "amber", label: "Amber", primary: "oklch(0.7 0.15 70)", accent: "oklch(0.8 0.1 50)" },
  { name: "rose", label: "Rose", primary: "oklch(0.65 0.18 10)", accent: "oklch(0.8 0.12 350)" },
]

export default function ProfilePage() {
  const { userName, setUserName, themeColor, setThemeColor, categories, tasks, events } = useStore()
  const [editName, setEditName] = useState(userName)
  const [isEditingName, setIsEditingName] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEditName(userName)
  }, [userName])

  const handleSaveName = () => {
    setUserName(editName)
    setIsEditingName(false)
  }

  const handleExport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: 1,
      categories,
      tasks,
      events,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `studyflow-export-${format(new Date(), "yyyy-MM-dd")}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (data.categories || data.tasks || data.events) {
          useStore.getState().importData(data)
        }
      } catch (error) {
        console.error("Failed to import data:", error)
      }
    }
    reader.readAsText(file)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-border/50">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
              <span className="sr-only">Back to app</span>
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-foreground">Profile</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          {/* Profile illustration */}
          <div className="flex justify-center">
            <Image
              src="/images/exam-prep.svg"
              alt="Study illustration"
              width={200}
              height={160}
              className="opacity-80"
            />
          </div>

          {/* User name */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Name</CardTitle>
              <CardDescription>This will be displayed in the app</CardDescription>
            </CardHeader>
            <CardContent>
              {isEditingName ? (
                <div className="flex gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter your name"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveName()
                      if (e.key === "Escape") {
                        setEditName(userName)
                        setIsEditingName(false)
                      }
                    }}
                    autoFocus
                  />
                  <Button onClick={handleSaveName} size="sm">
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-muted/50 rounded-lg">
                    <p className="text-foreground">{userName || "Not set"}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setIsEditingName(true)}>
                    <Edit3 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Theme color */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Theme Color</CardTitle>
              <CardDescription>Choose your primary accent color</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {THEME_COLORS.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setThemeColor(color.name)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                      themeColor === color.name
                        ? "border-foreground bg-muted"
                        : "border-transparent hover:bg-muted/50"
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full"
                      style={{ background: `linear-gradient(135deg, ${color.primary}, ${color.accent})` }}
                    />
                    <span className="text-xs font-medium">{color.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Data management */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Data Management</CardTitle>
              <CardDescription>Export or import your study data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" onClick={handleExport} className="w-full justify-start gap-3">
                <Download className="w-4 h-4" />
                Export Data
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full justify-start gap-3"
              >
                <Upload className="w-4 h-4" />
                Import Data
              </Button>
              <p className="text-xs text-muted-foreground">
                Export your data to back it up, or import a previous backup.
              </p>
            </CardContent>
          </Card>

          {/* App info and credits */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 mb-4">
                <Image
                  src="/icon.svg"
                  alt="StudyFlow"
                  width={48}
                  height={48}
                  className="rounded-xl"
                />
                <div>
                  <h3 className="font-semibold">StudyFlow</h3>
                  <p className="text-xs text-muted-foreground">Smart Study Planner with Spaced Repetition</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Created by</span>
                  <a
                    href="https://filszu.vercel.app?utm_source=planner"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-foreground hover:text-primary transition-colors font-medium"
                  >
                    filszu
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <a
                  href="https://buymeacoffee.com/filshu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 rounded-full text-sm font-medium transition-colors"
                >
                  <Coffee className="w-4 h-4" />
                  Buy me a coffee
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
