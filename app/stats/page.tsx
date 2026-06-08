"use client"

import { useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { format, subDays, startOfDay, isSameDay } from "date-fns"
import { ArrowLeft, Clock, CheckCircle2, Award, Flame, BookOpen } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Area,
  AreaChart,
  Pie,
  PieChart,
  Cell,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { useStore } from "@/lib/store"

// Format seconds into a compact "Xh Ym" string
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m`
  return `${seconds}s`
}

const DIFFICULTY_META: Record<string, { label: string; color: string }> = {
  easy: { label: "Easy", color: "var(--chart-2)" },
  mid: { label: "Medium", color: "var(--chart-4)" },
  tough: { label: "Tough", color: "var(--chart-1)" },
}

export default function StatsPage() {
  const { tasks, categories } = useStore()

  const completedTasks = useMemo(
    () => tasks.filter((t) => t.status === "completed"),
    [tasks]
  )

  // Summary metrics
  const totalTimeSpent = useMemo(
    () => tasks.reduce((sum, t) => sum + t.timeSpent, 0),
    [tasks]
  )
  const masteredCount = useMemo(() => tasks.filter((t) => t.mastered).length, [tasks])

  // Current study streak (consecutive days with at least one completion, ending today)
  const streak = useMemo(() => {
    const completionDays = new Set(
      completedTasks
        .filter((t) => t.completedAt)
        .map((t) => startOfDay(new Date(t.completedAt as Date)).getTime())
    )
    let count = 0
    let cursor = startOfDay(new Date())
    // Allow streak to count even if nothing done today yet, by checking from today backwards
    while (completionDays.has(cursor.getTime())) {
      count++
      cursor = subDays(cursor, 1)
    }
    return count
  }, [completedTasks])

  // Study time over the last 14 days (minutes per day)
  const dailyData = useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => subDays(startOfDay(new Date()), 13 - i))
    return days.map((day) => {
      const seconds = tasks.reduce((sum, t) => {
        if (
          t.completedAt &&
          isSameDay(new Date(t.completedAt as Date), day)
        ) {
          return sum + t.timeSpent
        }
        return sum
      }, 0)
      const completions = completedTasks.filter(
        (t) => t.completedAt && isSameDay(new Date(t.completedAt as Date), day)
      ).length
      return {
        date: format(day, "MMM d"),
        minutes: Math.round(seconds / 60),
        completions,
      }
    })
  }, [tasks, completedTasks])

  // Time and task count per category
  const categoryData = useMemo(() => {
    return categories
      .map((cat) => {
        const catTasks = tasks.filter((t) => t.categoryId === cat.id)
        const minutes = Math.round(
          catTasks.reduce((sum, t) => sum + t.timeSpent, 0) / 60
        )
        return {
          name: cat.name,
          minutes,
          tasks: catTasks.length,
          fill: cat.color,
        }
      })
      .filter((c) => c.tasks > 0)
  }, [categories, tasks])

  // Difficulty distribution
  const difficultyData = useMemo(() => {
    const counts: Record<string, number> = { easy: 0, mid: 0, tough: 0 }
    tasks.forEach((t) => {
      if (t.difficulty) counts[t.difficulty] = (counts[t.difficulty] || 0) + 1
    })
    return Object.entries(counts)
      .filter(([, value]) => value > 0)
      .map(([key, value]) => ({
        difficulty: DIFFICULTY_META[key].label,
        count: value,
        fill: DIFFICULTY_META[key].color,
      }))
  }, [tasks])

  const dailyConfig = {
    minutes: { label: "Minutes", color: "var(--chart-1)" },
    completions: { label: "Completions", color: "var(--chart-2)" },
  } satisfies ChartConfig

  const categoryConfig = {
    minutes: { label: "Minutes" },
    tasks: { label: "Tasks" },
  } satisfies ChartConfig

  const difficultyConfig = {
    count: { label: "Tasks" },
  } satisfies ChartConfig

  const hasData = tasks.length > 0

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
          <h1 className="text-xl font-bold text-foreground">Statistics</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center text-center py-12 gap-6">
            <Image
              src="/images/stats-empty.svg"
              alt="No statistics yet"
              width={280}
              height={234}
              className="opacity-90"
            />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground text-balance">
                No stats to show yet
              </h2>
              <p className="text-muted-foreground max-w-sm text-pretty">
                Start studying and completing tasks to see your progress, study time, and trends here.
              </p>
            </div>
            <Link href="/">
              <Button className="gap-2">
                <BookOpen className="w-4 h-4" />
                Go to planner
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard
                icon={<Clock className="w-5 h-5" />}
                label="Total study time"
                value={formatDuration(totalTimeSpent)}
              />
              <SummaryCard
                icon={<CheckCircle2 className="w-5 h-5" />}
                label="Tasks completed"
                value={String(completedTasks.length)}
              />
              <SummaryCard
                icon={<Award className="w-5 h-5" />}
                label="Mastered"
                value={String(masteredCount)}
              />
              <SummaryCard
                icon={<Flame className="w-5 h-5" />}
                label="Day streak"
                value={String(streak)}
              />
            </div>

            {/* Study time trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Study time</CardTitle>
                <CardDescription>Minutes studied over the last 14 days</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={dailyConfig} className="h-[260px] w-full">
                  <AreaChart data={dailyData} margin={{ left: 0, right: 12, top: 8 }}>
                    <defs>
                      <linearGradient id="fillMinutes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-minutes)" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="var(--color-minutes)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      interval="preserveStartEnd"
                    />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      dataKey="minutes"
                      type="monotone"
                      fill="url(#fillMinutes)"
                      stroke="var(--color-minutes)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Completions per day */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Completions</CardTitle>
                  <CardDescription>Tasks finished per day</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={dailyConfig} className="h-[240px] w-full">
                    <BarChart data={dailyData} margin={{ left: 0, right: 12, top: 8 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        interval="preserveStartEnd"
                      />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} allowDecimals={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="completions" fill="var(--color-completions)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Difficulty distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Difficulty mix</CardTitle>
                  <CardDescription>How tough your tasks are</CardDescription>
                </CardHeader>
                <CardContent>
                  {difficultyData.length > 0 ? (
                    <ChartContainer
                      config={difficultyConfig}
                      className="h-[240px] w-full [&_.recharts-text]:fill-foreground"
                    >
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent nameKey="difficulty" />} />
                        <Pie
                          data={difficultyData}
                          dataKey="count"
                          nameKey="difficulty"
                          innerRadius={55}
                          strokeWidth={2}
                        >
                          {difficultyData.map((entry) => (
                            <Cell key={entry.difficulty} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartLegend content={<ChartLegendContent nameKey="difficulty" />} />
                      </PieChart>
                    </ChartContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground py-12 text-center">
                      No difficulty data yet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Time per category */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Time by category</CardTitle>
                <CardDescription>Minutes spent in each subject</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <ChartContainer config={categoryConfig} className="h-[280px] w-full">
                    <BarChart
                      data={categoryData}
                      layout="vertical"
                      margin={{ left: 12, right: 16 }}
                    >
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                      <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        width={90}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="minutes" radius={[0, 6, 6, 0]}>
                        {categoryData.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground py-12 text-center">
                    No category data yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-primary mb-2">{icon}</div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  )
}
