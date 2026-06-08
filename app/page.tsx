"use client"

import { DndContext, DragEndEvent, useDraggable, useDroppable, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { useStore, Task, StudyEvent, Difficulty } from "@/lib/store"
import { format, isSameDay, startOfWeek, addDays, startOfDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths } from "date-fns"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { ConfirmProvider, useConfirm } from "@/components/confirm-dialog"
import { AllTasksCelebration } from "@/components/celebration"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Check, 
  Plus, 
  CalendarDays,
  BookOpen,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Trash2,
  GripVertical,
  CheckCircle2,
  BarChart3,
  Calendar as CalendarIcon,
  X,
  LayoutGrid,
  List,
  User,
  Coffee,
  Edit3,
  Award,
} from "lucide-react"

// Difficulty configuration: colors + emoji for easy / mid / tough
const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { label: string; emoji: string; color: string; bgClass: string; textClass: string }
> = {
  easy: { label: "Easy", emoji: "😄", color: "#22c55e", bgClass: "bg-green-500/10", textClass: "text-green-600" },
  mid: { label: "Medium", emoji: "😐", color: "#f59e0b", bgClass: "bg-amber-500/10", textClass: "text-amber-600" },
  tough: { label: "Tough", emoji: "😣", color: "#ef4444", bgClass: "bg-red-500/10", textClass: "text-red-600" },
}

const DIFFICULTY_ORDER: Difficulty[] = ["easy", "mid", "tough"]

// Small pill showing difficulty with its emoji + color
function DifficultyBadge({ difficulty, className }: { difficulty: Difficulty; className?: string }) {
  const config = DIFFICULTY_CONFIG[difficulty]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
        config.bgClass,
        config.textClass,
        className
      )}
    >
      <span aria-hidden>{config.emoji}</span>
      {config.label}
    </span>
  )
}

// Sparkle decoration component
function Sparkle({ className }: { className?: string }) {
  return (
    <svg className={cn("w-4 h-4 text-primary", className)} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L13.5 8.5L22 10L13.5 11.5L12 20L10.5 11.5L2 10L10.5 8.5L12 0Z" />
    </svg>
  )
}

// Draggable task component
function DraggableTask({ task, isOverlay = false, onClick }: { task: Task; isOverlay?: boolean; onClick?: () => void }) {
  const { categories } = useStore()
  const category = categories.find((c) => c.id === task.categoryId)
  
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { type: "task", task },
  })

  const isCompleted = task.status === "completed"
  const difficultyConfig = task.difficulty ? DIFFICULTY_CONFIG[task.difficulty] : null

  return (
    <div
      ref={!isOverlay ? setNodeRef : undefined}
      {...(!isOverlay ? listeners : {})}
      {...(!isOverlay ? attributes : {})}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 p-3 bg-card rounded-xl border border-border/50 shadow-sm cursor-grab active:cursor-grabbing transition-all hover:shadow-md hover:border-primary/20",
        isDragging && "opacity-50",
        isOverlay && "shadow-lg scale-105 rotate-2",
        isCompleted && "opacity-60"
      )}
      style={difficultyConfig ? { borderLeft: `4px solid ${difficultyConfig.color}` } : undefined}
    >
      {isCompleted ? (
        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
      ) : difficultyConfig ? (
        <span className="text-lg shrink-0 leading-none" aria-hidden>{difficultyConfig.emoji}</span>
      ) : (
        <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium text-foreground truncate",
          isCompleted && "line-through text-muted-foreground"
        )}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {category && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${category.color}30`, color: category.color }}
            >
              {category.name}
            </span>
          )}
          {task.difficulty && <DifficultyBadge difficulty={task.difficulty} />}
          {task.repetitionCount > 0 && (
            <span className="text-xs text-muted-foreground">
              Review #{task.repetitionCount + 1}
            </span>
          )}
        </div>
      </div>
      {/* Edit icon - visible on hover on desktop, always tappable on mobile */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClick?.()
        }}
        className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all opacity-0 group-hover:opacity-100 md:opacity-0 active:opacity-100 focus:opacity-100"
      >
        <Edit3 className="w-4 h-4" />
      </button>
    </div>
  )
}

// Draggable event component for calendar
function DraggableEvent({ event }: { event: StudyEvent }) {
  const { categories } = useStore()
  const category = categories.find((c) => c.id === event.categoryId)
  
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `event-${event.id}`,
    data: { type: "event", event },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "text-xs p-1.5 rounded-lg bg-primary/10 text-primary font-medium truncate cursor-grab",
        isDragging && "opacity-50"
      )}
      style={{
        borderLeft: category ? `3px solid ${category.color}` : "3px solid var(--primary)",
      }}
    >
      {event.title}
    </div>
  )
}

// Draggable task chip for the full calendar grid
function DraggableCalendarTask({
  task,
  categories,
  onClick,
  onDelete,
  large = false,
}: {
  task: Task
  categories: { id: string; name: string; color: string }[]
  onClick: () => void
  onDelete: () => void
  large?: boolean
}) {
  const cat = categories.find((c) => c.id === task.categoryId)
  const difficultyConfig = task.difficulty ? DIFFICULTY_CONFIG[task.difficulty] : null
  const accentColor = difficultyConfig?.color ?? cat?.color

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { type: "task", task },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        "group relative rounded bg-muted/50 truncate cursor-grab active:cursor-grabbing hover:bg-muted transition-colors",
        large ? "text-sm p-2.5" : "text-xs p-1",
        task.status === "completed" && "opacity-60",
        isDragging && "opacity-50"
      )}
      style={{
        borderLeft: accentColor ? `${large ? 4 : 2}px solid ${accentColor}` : `${large ? 4 : 2}px solid transparent`,
      }}
    >
      <div className="flex items-center gap-1 pr-5">
        {task.mastered ? (
          <Award className={cn("text-green-600 shrink-0", large ? "w-4 h-4" : "w-3 h-3")} />
        ) : task.status === "completed" ? (
          <CheckCircle2 className={cn("text-green-500 shrink-0", large ? "w-4 h-4" : "w-3 h-3")} />
        ) : difficultyConfig ? (
          <span className={cn("shrink-0 leading-none", large ? "text-base" : "text-xs")} aria-hidden>
            {difficultyConfig.emoji}
          </span>
        ) : null}
        <span className={cn("truncate", task.status === "completed" && "line-through")}>{task.title}</span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        className={cn(
          "absolute right-0.5 top-0.5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center transition-opacity",
          large ? "w-6 h-6 opacity-100" : "w-4 h-4 opacity-0 group-hover:opacity-100"
        )}
        aria-label="Delete task"
      >
        <X className={large ? "w-4 h-4" : "w-3 h-3"} />
      </button>
    </div>
  )
}

// Task detail dialog
function TaskDetailDialog({ task, open, onOpenChange }: { task: Task | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { categories, events, updateTask, deleteTask } = useStore()
  const confirm = useConfirm()
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editCategory, setEditCategory] = useState<string>("")
  const [editDueDate, setEditDueDate] = useState<Date>()

  useEffect(() => {
    if (task) {
      setEditTitle(task.title)
      setEditCategory(task.categoryId || "")
      setEditDueDate(new Date(task.dueDate))
    }
  }, [task])

  if (!task) return null

  const category = categories.find((c) => c.id === task.categoryId)
  const event = events.find((e) => e.id === task.eventId)

  const handleSave = () => {
    updateTask(task.id, {
      title: editTitle,
      categoryId: editCategory || null,
      dueDate: editDueDate || task.dueDate,
    })
    setIsEditing(false)
  }

  const totalTimeSpent = (task.completionHistory || []).reduce((acc, record) => acc + record.timeSpent, 0) + task.timeSpent
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`
    if (mins > 0) return `${mins}m ${secs}s`
    return `${secs}s`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {task.status === "completed" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
            {isEditing ? "Edit Task" : "Task Details"}
          </DialogTitle>
        </DialogHeader>
        
        {isEditing ? (
          <div className="space-y-4 py-4">
            <div>
              <Label>Title</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Category</Label>
                <Select value={editCategory} onValueChange={(val) => setEditCategory(val === "none" ? "" : val)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal mt-1.5">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editDueDate ? format(editDueDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={editDueDate} onSelect={setEditDueDate} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">Save</Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Task info */}
            <div className="space-y-3">
              <h3 className={cn(
                "text-xl font-semibold",
                task.status === "completed" && "line-through text-muted-foreground"
              )}>
                {task.title}
              </h3>
              <div className="flex flex-wrap gap-2">
                {category && (
                  <Badge style={{ backgroundColor: `${category.color}30`, color: category.color }}>
                    {category.name}
                  </Badge>
                )}
                {event && (
                  <Badge variant="outline">
                    <BookOpen className="w-3 h-3 mr-1" />
                    {event.title}
                  </Badge>
                )}
                <Badge variant="secondary">
                  <CalendarIcon className="w-3 h-3 mr-1" />
                  {format(new Date(task.dueDate), "MMM d, yyyy")}
                </Badge>
                {task.difficulty && (
                  <Badge
                    variant="secondary"
                    style={{
                      backgroundColor: `${DIFFICULTY_CONFIG[task.difficulty].color}25`,
                      color: DIFFICULTY_CONFIG[task.difficulty].color,
                    }}
                  >
                    <span className="mr-1" aria-hidden>{DIFFICULTY_CONFIG[task.difficulty].emoji}</span>
                    {DIFFICULTY_CONFIG[task.difficulty].label}
                  </Badge>
                )}
                {task.mastered && (
                  <Badge className="bg-green-500/15 text-green-600 hover:bg-green-500/15">
                    <Award className="w-3 h-3 mr-1" />
                    Mastered
                  </Badge>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-xs font-medium">Times Completed</span>
                </div>
                <p className="text-2xl font-bold">{(task.completionHistory || []).length}</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-medium">Total Time</span>
                </div>
                <p className="text-2xl font-bold">{formatTime(totalTimeSpent)}</p>
              </div>
            </div>

            {/* Next revision info */}
            {task.status !== "completed" && (
              <div className="bg-primary/5 rounded-xl p-4">
                <div className="flex items-center gap-2 text-primary mb-1">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">Spaced Repetition</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Review #{task.repetitionCount + 1} scheduled for {format(new Date(task.dueDate), "EEEE, MMM d")}
                </p>
              </div>
            )}

            {/* Completion history */}
            {(task.completionHistory || []).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Completion History</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {(task.completionHistory || []).map((record, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm bg-muted/30 rounded-lg p-2">
                      <span>{format(new Date(record.completedAt), "MMM d, yyyy")}</span>
                      <span className="text-muted-foreground">{formatTime(record.timeSpent)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit3 className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              const ok = await confirm({
                title: "Delete task?",
                description: `"${task.title}" will be permanently removed.`,
              })
              if (ok) {
                deleteTask(task.id)
                onOpenChange(false)
              }
            }}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Today's tasks panel
function TodayTasks() {
  const { tasks, categories, events, deleteTask, setCurrentTask, currentTaskId, addTask } = useStore()
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedEvent, setSelectedEvent] = useState<string>("")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  
  const today = startOfDay(new Date())
  const todayTasks = tasks.filter(
    (task) => isSameDay(new Date(task.dueDate), today)
  )

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      const eventId = selectedEvent || null
      const catId = selectedEvent 
        ? events.find(e => e.id === selectedEvent)?.categoryId || selectedCategory || null
        : selectedCategory || null
      addTask(newTaskTitle, eventId, catId, today)
      setNewTaskTitle("")
      setSelectedCategory("")
      setSelectedEvent("")
      setShowAddTask(false)
    }
  }

  return (
    <Card className="flex-1 bg-card/80 backdrop-blur border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Today&apos;s Tasks
          </CardTitle>
          <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Task for Today</DialogTitle>
                <DialogDescription>Create a new task to study today.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Task Title</Label>
                  <Input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="e.g., Review Newton's Laws"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Event (optional)</Label>
                  <Select value={selectedEvent || "none"} onValueChange={(val) => setSelectedEvent(val === "none" ? "" : val)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Link to an event" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No event</SelectItem>
                      {events.map((evt) => (
                        <SelectItem key={evt.id} value={evt.id}>
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-3 h-3" />
                            {evt.title}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category (optional)</Label>
                  <Select value={selectedCategory || "none"} onValueChange={(val) => setSelectedCategory(val === "none" ? "" : val)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                            {cat.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddTask} className="w-full">
                  Add Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-sm text-muted-foreground">{format(today, "EEEE, MMMM d")}</p>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
        {todayTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No tasks for today</p>
            <p className="text-xs mt-1">Add a task or drag one from your events</p>
          </div>
        ) : (
          todayTasks.map((task) => (
            <div key={task.id} className="relative group">
              <DraggableTask task={task} onClick={() => setSelectedTask(task)} />
              {currentTaskId !== task.id && task.status !== "completed" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentTask(task.id)
                  }}
                  className="absolute right-2 bottom-2 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full hover:bg-primary/20 transition-colors"
                >
                  Select
                </button>
              )}
            </div>
          ))
        )}
      </CardContent>
      
      <TaskDetailDialog task={selectedTask} open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)} />
    </Card>
  )
}

// Drop zone for current task
function CurrentTaskDropZone() {
  const { setNodeRef, isOver } = useDroppable({ id: "current-task-drop" })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "h-full min-h-[120px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all",
        isOver
          ? "border-primary bg-primary/5 scale-[1.02]"
          : "border-muted-foreground/20"
      )}
    >
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
        <BookOpen className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground text-center px-4">
        Drag a task here or select from the list
      </p>
    </div>
  )
}

// Timer display
function Timer({ elapsedTime, isRunning }: { elapsedTime: number; isRunning: boolean }) {
  const hours = Math.floor(elapsedTime / 3600)
  const minutes = Math.floor((elapsedTime % 3600) / 60)
  const seconds = elapsedTime % 60

  return (
    <div className={cn(
      "text-4xl font-mono font-bold tracking-tight transition-colors",
      isRunning ? "text-primary" : "text-foreground"
    )}>
      {hours > 0 && `${hours.toString().padStart(2, "0")}:`}
      {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
    </div>
  )
}

// Current task panel
function CurrentTaskPanel() {
  const {
    currentTaskId,
    tasks,
    categories,
    timerRunning,
    timerStartedAt,
    startTimer,
    stopTimer,
    resetTimer,
    finishTask,
    finishTaskNoRepeat,
    setCurrentTask,
  } = useStore()
  
  const [elapsedTime, setElapsedTime] = useState(0)
  const [showCongrats, setShowCongrats] = useState(false)
  const [pendingFinish, setPendingFinish] = useState(false)
  const [customDays, setCustomDays] = useState("")
  const [needsDifficulty, setNeedsDifficulty] = useState(false)
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null)

  const currentTask = tasks.find((t) => t.id === currentTaskId)
  const category = currentTask ? categories.find((c) => c.id === currentTask.categoryId) : null

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (timerRunning && timerStartedAt) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - timerStartedAt) / 1000))
      }, 1000)
    } else if (!timerRunning) {
      if (currentTask) {
        setElapsedTime(currentTask.timeSpent)
      } else {
        setElapsedTime(0)
      }
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [timerRunning, timerStartedAt, currentTask])

  const handleFinishClick = () => {
    stopTimer()
    setPendingFinish(true)
    // The difficulty selector is always shown so it can be (re)rated on every review.
    // It is only *required* (blocks scheduling) on the very first completion.
    const isFirstCompletion = !!currentTask && currentTask.repetitionCount === 0 && !currentTask.difficulty
    setNeedsDifficulty(isFirstCompletion)
    setSelectedDifficulty(currentTask?.difficulty ?? null)
    setShowCongrats(true)
  }

  const handleSelectRevision = (days: number) => {
    if (pendingFinish) {
      finishTask(days, selectedDifficulty)
      setPendingFinish(false)
    }
    setShowCongrats(false)
    setElapsedTime(0)
    setCustomDays("")
    setNeedsDifficulty(false)
    setSelectedDifficulty(null)
  }

  const handleFinishNoRepeat = () => {
    if (pendingFinish) {
      finishTaskNoRepeat(selectedDifficulty)
      setPendingFinish(false)
    }
    setShowCongrats(false)
    setElapsedTime(0)
    setCustomDays("")
    setNeedsDifficulty(false)
    setSelectedDifficulty(null)
  }

  const getSuggestedDays = () => {
    if (!currentTask) return [1, 2, 3]
    const count = currentTask.repetitionCount
    if (count >= 4) return [14, 21, 30]
    if (count >= 3) return [7, 14, 21]
    if (count >= 2) return [3, 5, 7]
    if (count >= 1) return [2, 3, 5]
    return [1, 2, 3]
  }

  return (
    <Card className="flex-1 bg-card/80 backdrop-blur border-0 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Current Task
        </CardTitle>
      </CardHeader>
      <CardContent>
        {currentTask ? (
          <div className="space-y-6">
            {/* Task info */}
            <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl p-4">
              <h3 className="font-semibold text-lg text-foreground">{currentTask.title}</h3>
              <div className="flex items-center gap-2 mt-2">
                {category && (
                  <Badge
                    variant="secondary"
                    style={{ backgroundColor: `${category.color}30`, color: category.color }}
                  >
                    {category.name}
                  </Badge>
                )}
                {currentTask.status === "in-progress" && (
                  <Badge variant="outline" className="text-primary border-primary">
                    In Progress
                  </Badge>
                )}
              </div>
            </div>

            {/* Timer */}
            <div className="text-center py-4">
              <Timer elapsedTime={elapsedTime} isRunning={timerRunning} />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              {!timerRunning ? (
                <Button
                  onClick={startTimer}
                  className="h-12 px-6 rounded-full bg-primary hover:bg-primary/90"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start
                </Button>
              ) : (
                <Button
                  onClick={stopTimer}
                  variant="outline"
                  className="h-12 px-6 rounded-full"
                >
                  <Pause className="w-5 h-5 mr-2" />
                  Pause
                </Button>
              )}
              <Button
                onClick={resetTimer}
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
              <Button
                onClick={handleFinishClick}
                className="h-12 px-6 rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
              >
                <Check className="w-5 h-5 mr-2" />
                Finish
              </Button>
            </div>

            {/* Remove task button */}
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentTask(null)}
                className="text-muted-foreground"
              >
                Remove from current
              </Button>
            </div>
          </div>
        ) : (
          <CurrentTaskDropZone />
        )}

        {/* Congratulations Dialog */}
        <Dialog open={showCongrats} onOpenChange={setShowCongrats}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center text-2xl flex items-center justify-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" />
                Congratulations!
                <Sparkles className="w-6 h-6 text-primary" />
              </DialogTitle>
              <DialogDescription className="text-center">
                Great job completing your study session!
              </DialogDescription>
            </DialogHeader>
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-6">
                <Clock className="w-4 h-4 text-primary" />
                <span className="font-medium">
                  Time spent: {Math.floor(elapsedTime / 60)}m {elapsedTime % 60}s
                </span>
              </div>

              {/* Step 1: difficulty (always available; required on first completion) */}
              <div className="mb-6">
                  <p className="text-muted-foreground mb-4">
                    {needsDifficulty ? "How tough was this task?" : "Update how tough it felt this time"}
                  </p>
                  <div className="flex justify-center gap-3">
                    {DIFFICULTY_ORDER.map((level) => {
                      const config = DIFFICULTY_CONFIG[level]
                      const isSelected = selectedDifficulty === level
                      return (
                        <button
                          key={level}
                          onClick={() => setSelectedDifficulty(level)}
                          className={cn(
                            "flex-1 h-24 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all",
                            isSelected
                              ? "scale-105 shadow-md"
                              : "border-border/60 hover:border-border"
                          )}
                          style={
                            isSelected
                              ? { borderColor: config.color, backgroundColor: `${config.color}1a` }
                              : undefined
                          }
                        >
                          <span className="text-3xl" aria-hidden>{config.emoji}</span>
                          <span
                            className="text-sm font-semibold"
                            style={isSelected ? { color: config.color } : undefined}
                          >
                            {config.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
              </div>

              {/* Step 2: revision scheduling (gated until difficulty chosen on first completion) */}
              {(!needsDifficulty || selectedDifficulty) && (
                <>
                  <p className="text-muted-foreground mb-4">
                    When should you review this again?
                  </p>
                  <div className="flex justify-center gap-3 mb-4">
                    {getSuggestedDays().map((days) => (
                      <Button
                        key={days}
                        onClick={() => handleSelectRevision(days)}
                        variant="outline"
                        className="flex-1 h-16 flex-col hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <span className="text-2xl font-bold">{days}</span>
                        <span className="text-xs">
                          {days === 1 ? "day" : "days"}
                        </span>
                      </Button>
                    ))}
                  </div>
                  {/* Custom days input */}
                  <div className="flex items-center gap-2 justify-center">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Custom"
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value)}
                      className="w-24 h-10 text-center"
                    />
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const days = parseInt(customDays)
                        if (days > 0) handleSelectRevision(days)
                      }}
                      disabled={!customDays || parseInt(customDays) <= 0}
                    >
                      Set custom days
                    </Button>
                  </div>

                  {/* Totally finished - no more repetitions */}
                  <div className="mt-6 pt-4 border-t border-border/50">
                    <Button
                      variant="ghost"
                      onClick={handleFinishNoRepeat}
                      className="w-full text-green-600 hover:text-green-700 hover:bg-green-500/10"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      I&apos;ve mastered this — don&apos;t repeat
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

// Week view component
function WeekView({ onOpenCalendar }: { onOpenCalendar: () => void }) {
  const { tasks, categories, events, addTask, deleteTask } = useStore()
  const confirm = useConfirm()
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedEvent, setSelectedEvent] = useState<string>("")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({})

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const handleAddTask = () => {
    if (newTaskTitle.trim() && selectedDate) {
      const eventId = selectedEvent || null
      const catId = selectedEvent 
        ? events.find(e => e.id === selectedEvent)?.categoryId || selectedCategory || null
        : selectedCategory || null
      addTask(newTaskTitle, eventId, catId, selectedDate)
      setNewTaskTitle("")
      setSelectedCategory("")
      setSelectedEvent("")
      setShowAddDialog(false)
    }
  }

  return (
    <Card className="bg-card/80 backdrop-blur border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Week Overview
          </CardTitle>
          <div className="flex items-center justify-between gap-1 sm:justify-end sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenCalendar}
              className="text-xs shrink-0"
            >
              <CalendarIcon className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Full Calendar</span>
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setWeekStart(addDays(weekStart, -7))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs sm:text-sm font-medium min-w-[96px] sm:min-w-[120px] text-center">
                {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d")}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setWeekStart(addDays(weekStart, 7))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 min-w-0">
          {weekDays.map((day) => {
            const dayTasks = tasks.filter(
              (task) => isSameDay(new Date(task.dueDate), day)
            )
            const isToday = isSameDay(day, new Date())
            const dayKey = day.toISOString()
            const isExpanded = expandedDays[dayKey]
            const visibleTasks = isExpanded ? dayTasks : dayTasks.slice(0, 3)

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[120px] rounded-xl p-2 transition-colors",
                  isToday
                    ? "bg-primary/10 border-2 border-primary/30"
                    : "bg-muted/30 border border-transparent hover:border-primary/20"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isToday ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {format(day, "EEE")}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      isToday ? "text-primary" : "text-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>
                <div className="space-y-1">
                  {visibleTasks.map((task) => {
                    const cat = categories.find((c) => c.id === task.categoryId)
                    const diff = task.difficulty ? DIFFICULTY_CONFIG[task.difficulty] : null
                    const accent = diff?.color ?? cat?.color
                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className={cn(
                          "group relative text-xs p-1.5 rounded-lg bg-card truncate cursor-pointer hover:bg-card/80",
                          task.status === "completed" && "opacity-60",
                          task.mastered && "bg-green-500/10"
                        )}
                        style={{
                          borderLeft: accent ? `3px solid ${accent}` : "3px solid transparent",
                        }}
                      >
                        <div className="flex items-center gap-1">
                          {task.mastered ? (
                            <Award className="w-3 h-3 text-green-600 shrink-0" />
                          ) : task.status === "completed" ? (
                            <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                          ) : diff ? (
                            <span className="text-xs shrink-0 leading-none" aria-hidden>{diff.emoji}</span>
                          ) : null}
                          <span className={cn(task.status === "completed" && "line-through")}>{task.title}</span>
                        </div>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            const ok = await confirm({
                              title: "Delete task?",
                              description: `"${task.title}" will be permanently removed.`,
                            })
                            if (ok) deleteTask(task.id)
                          }}
                          className="absolute right-0.5 top-0.5 w-4 h-4 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-[10px] hover:bg-destructive/90"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}
                  {dayTasks.length > 3 && (
                    <button
                      onClick={() =>
                        setExpandedDays((prev) => ({ ...prev, [dayKey]: !prev[dayKey] }))
                      }
                      className="text-xs text-primary font-medium hover:underline cursor-pointer"
                    >
                      {isExpanded ? "Show less" : `+${dayTasks.length - 3} more`}
                    </button>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-6 mt-1 text-xs opacity-50 hover:opacity-100 focus:opacity-100"
                  onClick={() => {
                    setSelectedDate(day)
                    setShowAddDialog(true)
                  }}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            )
          })}
        </div>

        {/* Add task dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Add Task for {selectedDate ? format(selectedDate, "EEEE, MMM d") : ""}
              </DialogTitle>
              <DialogDescription>Create a new study task for this day.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Task Title</Label>
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g., Review Chapter 5"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Event (optional)</Label>
                <Select value={selectedEvent || "none"} onValueChange={(val) => setSelectedEvent(val === "none" ? "" : val)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Link to an event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No event</SelectItem>
                    {events.map((evt) => (
                      <SelectItem key={evt.id} value={evt.id}>
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-3 h-3" />
                          {evt.title}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category (optional)</Label>
                <Select value={selectedCategory || "none"} onValueChange={(val) => setSelectedCategory(val === "none" ? "" : val)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddTask} className="w-full">
                Add Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        <TaskDetailDialog task={selectedTask} open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)} />
      </CardContent>
    </Card>
  )
}

// Full Calendar Page Component
function FullCalendarView({ onClose }: { onClose: () => void }) {
  const { tasks, events, categories, moveTaskToDate, moveEventToDate, deleteTask, addTask } = useStore()
  const confirm = useConfirm()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [mobileDay, setMobileDay] = useState<Date>(startOfDay(new Date()))
  const [mobileFullView, setMobileFullView] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [activeDrag, setActiveDrag] = useState<{ type: "task" | "event"; task?: Task; event?: StudyEvent } | null>(null)
  const isMobile = useIsMobile()
  // On mobile the user can opt into the full grid layout; desktop always uses the grid
  const showGrid = !isMobile || mobileFullView

  const handleDeleteTask = async (id: string) => {
    const t = tasks.find((task) => task.id === id)
    const ok = await confirm({
      title: "Delete task?",
      description: t ? `"${t.title}" will be permanently removed.` : "This task will be permanently removed.",
    })
    if (ok) deleteTask(id)
  }
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("")
  const [selectedEvent, setSelectedEvent] = useState<string>("")

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: addDays(calendarStart, 41) })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current
    if (data?.type === "task") {
      setActiveDrag({ type: "task", task: data.task })
    } else if (data?.type === "event") {
      setActiveDrag({ type: "event", event: data.event })
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null)
    const { active, over } = event
    if (!over) return

    const overId = over.id as string
    if (overId.startsWith("calendar-day-")) {
      const dateStr = overId.replace("calendar-day-", "")
      const newDate = new Date(dateStr)
      
      const data = active.data.current
      if (data?.type === "task") {
        moveTaskToDate(data.task.id, newDate)
      } else if (data?.type === "event") {
        moveEventToDate(data.event.id, newDate)
      }
    }
  }

  const handleAddTask = () => {
    if (newTaskTitle.trim() && selectedDate) {
      const eventId = selectedEvent || null
      const catId = selectedEvent 
        ? events.find(e => e.id === selectedEvent)?.categoryId || selectedCategory || null
        : selectedCategory || null
      addTask(newTaskTitle, eventId, catId, selectedDate)
      setNewTaskTitle("")
      setSelectedCategory("")
      setSelectedEvent("")
      setShowAddDialog(false)
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="fixed inset-0 bg-background z-50 overflow-hidden flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-border/50">
          <div className="container mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Button variant="ghost" size="icon" className="shrink-0" onClick={onClose}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                  <CalendarIcon className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-base sm:text-xl font-bold text-foreground truncate">
                  <span className="hidden sm:inline">Full </span>Calendar
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* Mobile layout toggle: single-day list vs full grid */}
              {isMobile && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setMobileFullView((v) => !v)}
                  aria-label={mobileFullView ? "Switch to day view" : "Switch to full calendar"}
                >
                  {mobileFullView ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <span className="text-sm sm:text-lg font-semibold w-[104px] sm:min-w-[180px] text-center">
                {format(currentMonth, isMobile ? "MMM yyyy" : "MMMM yyyy")}
              </span>
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Calendar Grid - desktop, or mobile when full view is toggled on */}
        {showGrid && (
        <div className="flex-1 overflow-auto p-2 sm:p-4">
          <div className="min-w-0">
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-1 mb-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                <div key={day} className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const dayTasks = tasks.filter((task) => isSameDay(new Date(task.dueDate), day))
                const dayEvents = events.filter((event) => isSameDay(new Date(event.date), day))
                const isToday = isSameDay(day, new Date())
                const isCurrentMonth = isSameMonth(day, currentMonth)

                return (
                  <CalendarDayDropZone
                    key={day.toISOString()}
                    day={day}
                    isToday={isToday}
                    isCurrentMonth={isCurrentMonth}
                    dayTasks={dayTasks}
                    dayEvents={dayEvents}
                    categories={categories}
                    onTaskClick={setSelectedTask}
                    onDeleteTask={handleDeleteTask}
                    onAddClick={(date) => {
                      setSelectedDate(date)
                      setShowAddDialog(true)
                    }}
                  />
                )
              })}
            </div>
          </div>
        </div>
        )}

        {/* Single-day view - mobile (day picker + large list) */}
        {!showGrid && (
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">Pick a day</Label>
            <Select
              value={mobileDay.toISOString()}
              onValueChange={(val) => setMobileDay(startOfDay(new Date(val)))}
            >
              <SelectTrigger className="mt-1.5 h-14 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {eachDayOfInterval({ start: monthStart, end: monthEnd }).map((day) => {
                  const count = tasks.filter((t) => isSameDay(new Date(t.dueDate), day)).length
                  return (
                    <SelectItem key={day.toISOString()} value={day.toISOString()}>
                      <span className="flex items-center gap-2">
                        {format(day, "EEE, MMM d")}
                        {count > 0 && (
                          <span className="text-xs text-muted-foreground">({count})</span>
                        )}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {(() => {
            const dayTasks = tasks.filter((task) => isSameDay(new Date(task.dueDate), mobileDay))
            const dayEvents = events.filter((event) => isSameDay(new Date(event.date), mobileDay))
            const isToday = isSameDay(mobileDay, new Date())
            return (
              <div
                className={cn(
                  "rounded-2xl border p-4 space-y-3",
                  isToday ? "bg-primary/10 border-primary/30" : "bg-card border-border/50"
                )}
              >
                <div className="flex items-center justify-between">
                  <h2 className={cn("text-lg font-bold", isToday && "text-primary")}>
                    {format(mobileDay, "EEEE, MMMM d")}
                  </h2>
                  {isToday && <Badge variant="secondary">Today</Badge>}
                </div>

                {dayEvents.map((event) => (
                  <DraggableEvent key={event.id} event={event} />
                ))}

                {dayTasks.length === 0 && dayEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Nothing scheduled for this day
                  </p>
                ) : (
                  dayTasks.map((task) => (
                    <DraggableCalendarTask
                      key={task.id}
                      task={task}
                      categories={categories}
                      onClick={() => setSelectedTask(task)}
                      onDelete={() => handleDeleteTask(task.id)}
                      large
                    />
                  ))
                )}

                {/* Much bigger add button for the calendar on small screens */}
                <Button
                  className="w-full h-14 text-base rounded-xl mt-2"
                  onClick={() => {
                    setSelectedDate(mobileDay)
                    setShowAddDialog(true)
                  }}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Task
                </Button>
              </div>
            )
          })()}
        </div>
        )}

        {/* Task Detail Dialog */}
        <TaskDetailDialog task={selectedTask} open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)} />

        {/* Add Task Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Add Task for {selectedDate ? format(selectedDate, "EEEE, MMM d") : ""}
              </DialogTitle>
              <DialogDescription>Create a new study task for this day.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Task Title</Label>
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g., Review Chapter 5"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label>Event (optional)</Label>
                <Select value={selectedEvent || "none"} onValueChange={(val) => setSelectedEvent(val === "none" ? "" : val)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Link to an event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No event</SelectItem>
                    {events.map((evt) => (
                      <SelectItem key={evt.id} value={evt.id}>
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-3 h-3" />
                          {evt.title}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category (optional)</Label>
                <Select value={selectedCategory || "none"} onValueChange={(val) => setSelectedCategory(val === "none" ? "" : val)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddTask} className="w-full">
                Add Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Smooth drag preview */}
      <DragOverlay dropAnimation={{ duration: 250, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
        {activeDrag?.type === "task" && activeDrag.task && (
          <div className="rotate-3 scale-105">
            <DraggableCalendarTask
              task={activeDrag.task}
              categories={categories}
              onClick={() => {}}
              onDelete={() => {}}
            />
          </div>
        )}
        {activeDrag?.type === "event" && activeDrag.event && (
          <div className="rotate-3 scale-105">
            <DraggableEvent event={activeDrag.event} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

// Calendar Day Drop Zone
function CalendarDayDropZone({
  day,
  isToday,
  isCurrentMonth,
  dayTasks,
  dayEvents,
  categories,
  onTaskClick,
  onDeleteTask,
  onAddClick,
}: {
  day: Date
  isToday: boolean
  isCurrentMonth: boolean
  dayTasks: Task[]
  dayEvents: StudyEvent[]
  categories: { id: string; name: string; color: string }[]
  onTaskClick: (task: Task) => void
  onDeleteTask: (id: string) => void
  onAddClick: (date: Date) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `calendar-day-${day.toISOString()}`,
  })
  const [isExpanded, setIsExpanded] = useState(false)
  const visibleTasks = isExpanded ? dayTasks : dayTasks.slice(0, 4)

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-[100px] rounded-xl p-2 transition-all border",
        isToday
          ? "bg-primary/10 border-primary/30"
          : isCurrentMonth
          ? "bg-card border-border/50 hover:border-primary/20"
          : "bg-muted/20 border-transparent",
        isOver && "ring-2 ring-primary scale-[1.02]"
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={cn(
            "text-sm font-semibold",
            isToday ? "text-primary" : isCurrentMonth ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {format(day, "d")}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="w-5 h-5 opacity-50 hover:opacity-100"
          onClick={() => onAddClick(day)}
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>
      <div className="space-y-1">
        {/* Events */}
        {dayEvents.map((event) => (
          <DraggableEvent key={event.id} event={event} />
        ))}
        {/* Tasks */}
        {visibleTasks.map((task) => (
          <DraggableCalendarTask
            key={task.id}
            task={task}
            categories={categories}
            onClick={() => onTaskClick(task)}
            onDelete={() => onDeleteTask(task.id)}
          />
        ))}
        {dayTasks.length > 4 && (
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="text-xs text-primary font-medium hover:underline cursor-pointer"
          >
            {isExpanded ? "Show less" : `+${dayTasks.length - 4} more`}
          </button>
        )}
      </div>
    </div>
  )
}

// Events panel
function EventsPanel() {
  const { events, categories, tasks, addEvent, deleteEvent, addTaskToEvent, deleteTask } = useStore()
  const confirm = useConfirm()
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [showAddTaskToEvent, setShowAddTaskToEvent] = useState<string | null>(null)
  const [newEventTitle, setNewEventTitle] = useState("")
  const [newEventDate, setNewEventDate] = useState<Date>()
  const [newEventCategory, setNewEventCategory] = useState<string>("")
  const [newTaskTitle, setNewTaskTitle] = useState("")

  const handleAddEvent = () => {
    if (newEventTitle.trim() && newEventDate) {
      addEvent(newEventTitle, newEventDate, newEventCategory || null)
      setNewEventTitle("")
      setNewEventDate(undefined)
      setNewEventCategory("")
      setShowAddEvent(false)
    }
  }

  const handleAddTaskToEvent = (eventId: string) => {
    if (newTaskTitle.trim()) {
      addTaskToEvent(eventId, newTaskTitle)
      setNewTaskTitle("")
      setShowAddTaskToEvent(null)
    }
  }

  return (
    <Card className="bg-card/80 backdrop-blur border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Study Events
          </CardTitle>
          <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Study Event</DialogTitle>
                <DialogDescription>Add a new exam, deadline, or study goal.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Event Title</Label>
                  <Input
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    placeholder="e.g., Physics Final Exam"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal mt-1.5",
                          !newEventDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {newEventDate ? format(newEventDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newEventDate}
                        onSelect={setNewEventDate}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>Category (optional)</Label>
                  <Select value={newEventCategory || "none"} onValueChange={(val) => setNewEventCategory(val === "none" ? "" : val)}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddEvent} className="w-full">
                  Create Event
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[400px] overflow-y-auto">
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No events yet</p>
            <p className="text-xs mt-1">Create an exam or deadline to get started</p>
          </div>
        ) : (
          events.map((event) => {
            const allEventTasks = tasks.filter((t) => t.eventId === event.id)
            const eventTasks = allEventTasks.filter((t) => t.status !== "completed")
            const completedCount = allEventTasks.length - eventTasks.length
            const category = categories.find((c) => c.id === event.categoryId)

            return (
              <div
                key={event.id}
                className="group relative rounded-xl border border-border/50 overflow-hidden"
              >
                <div
                  className="p-3 bg-gradient-to-r from-primary/5 to-transparent"
                  style={{
                    borderLeft: category ? `4px solid ${category.color}` : "4px solid transparent",
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{event.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(event.date), "EEEE, MMM d")}
                        {completedCount > 0 && (
                          <span className="ml-2 text-green-600">· {completedCount} done</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        const ok = await confirm({
                          title: "Delete event?",
                          description: `"${event.title}" and its linked tasks will be removed.`,
                        })
                        if (ok) deleteEvent(event.id)
                      }}
                      className="w-7 h-7 bg-destructive/10 text-destructive rounded-full flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  {eventTasks.length === 0 && allEventTasks.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-green-600 py-1.5 px-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>All tasks completed!</span>
                    </div>
                  )}
                  {eventTasks.map((task) => (
                    <div
                      key={task.id}
                      className="group/task relative flex items-center gap-2 text-sm py-1.5 px-2 bg-muted/50 rounded-lg"
                    >
                      {task.status === "completed" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      ) : (
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            task.status === "in-progress"
                              ? "bg-yellow-500"
                              : "bg-muted-foreground/30"
                          )}
                        />
                      )}
                      <span className={cn(
                        "flex-1",
                        task.status === "completed" && "line-through text-muted-foreground"
                      )}>
                        {task.title}
                      </span>
                      <button
                        onClick={async () => {
                          const ok = await confirm({
                            title: "Delete task?",
                            description: `"${task.title}" will be permanently removed.`,
                          })
                          if (ok) deleteTask(task.id)
                        }}
                        className="w-6 h-6 bg-destructive/10 text-destructive rounded-full flex items-center justify-center opacity-0 group-hover/task:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {showAddTaskToEvent === event.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Task title"
                        className="h-8 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddTaskToEvent(event.id)
                          if (e.key === "Escape") setShowAddTaskToEvent(null)
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        className="h-8"
                        onClick={() => handleAddTaskToEvent(event.id)}
                      >
                        Add
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setShowAddTaskToEvent(event.id)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add task
                    </Button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

// Categories panel
function CategoriesPanel() {
  const { categories, addCategory, deleteCategory } = useStore()
  const confirm = useConfirm()
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryColor, setNewCategoryColor] = useState("#F5A9A9")
  const [newCategoryDays, setNewCategoryDays] = useState("1")

  const presetColors = [
    "#F5A9A9", // Coral pink
    "#A9D9F5", // Light blue
    "#C5F5A9", // Light green
    "#F5D9A9", // Peach
    "#D9A9F5", // Lavender
    "#A9F5E5", // Mint
  ]

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      addCategory(newCategoryName, newCategoryColor, parseInt(newCategoryDays) || 1)
      setNewCategoryName("")
      setNewCategoryColor("#F5A9A9")
      setNewCategoryDays("1")
      setShowAddCategory(false)
    }
  }

  return (
    <Card className="bg-card/80 backdrop-blur border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Categories
          </CardTitle>
          <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="text-primary hover:bg-primary/10">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Category</DialogTitle>
                <DialogDescription>Add a new subject or topic category.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Category Name</Label>
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g., Biology"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="flex gap-2 mt-1.5">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setNewCategoryColor(color)}
                        className={cn(
                          "w-8 h-8 rounded-full transition-transform hover:scale-110",
                          newCategoryColor === color && "ring-2 ring-primary ring-offset-2"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Default Revision Period (days)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newCategoryDays}
                    onChange={(e) => setNewCategoryDays(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <Button onClick={handleAddCategory} className="w-full">
                  Create Category
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {categories.map((category) => (
          <div
            key={category.id}
            className="group flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <span className="font-medium">{category.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {category.defaultRepetitionDays}d
              </span>
              <button
                onClick={async () => {
                  const ok = await confirm({
                    title: "Delete category?",
                    description: `"${category.name}" will be removed. Tasks keep their data but lose this category.`,
                  })
                  if (ok) deleteCategory(category.id)
                }}
                className="w-7 h-7 bg-destructive/10 text-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// Profile sheet and MobileMenu removed - profile is now a separate page

// Footer component
function Footer() {
  return (
    <footer className="mt-auto py-4 text-center text-xs text-muted-foreground">
      <div className="container mx-auto px-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <span>StudyFlow</span>
        <span className="hidden sm:inline">|</span>
        <span>
          Created by{" "}
          <a
            href="https://filszu.vercel.app?utm_source=planner"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground hover:text-primary transition-colors"
          >
            filszu
          </a>
        </span>
        <span className="hidden sm:inline">|</span>
        <a
          href="https://buymeacoffee.com/filshu"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-500 transition-colors"
        >
          <Coffee className="w-3 h-3" />
          Buy me a coffee
        </a>
      </div>
    </footer>
  )
}

// Main app component (wrapped with the confirm dialog provider)
export default function StudyPlannerApp() {
  return (
    <ConfirmProvider>
      <AppInner />
    </ConfirmProvider>
  )
}

function AppInner() {
  const { setCurrentTask, tasks } = useStore()
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [showFullCalendar, setShowFullCalendar] = useState(false)
  const [showAllDone, setShowAllDone] = useState(false)
  const allDoneShownRef = useRef(false)

  // Today's tasks: celebrate when every one of them is completed
  const todayTasks = tasks.filter((task) => isSameDay(new Date(task.dueDate), new Date()))
  const completedToday = todayTasks.filter((t) => t.status === "completed").length
  const allTodayDone = todayTasks.length > 0 && completedToday === todayTasks.length

  useEffect(() => {
    if (allTodayDone && !allDoneShownRef.current) {
      allDoneShownRef.current = true
      setShowAllDone(true)
    }
    // Reset the latch once there are pending tasks again
    if (!allTodayDone) {
      allDoneShownRef.current = false
    }
  }, [allTodayDone])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current
    if (data?.type === "task") {
      setActiveTask(data.task)
    }
  }

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveTask(null)
    const { over, active } = event
    
    if (over?.id === "current-task-drop") {
      const data = active.data.current
      if (data?.type === "task") {
        setCurrentTask(data.task.id)
      }
    }
  }, [setCurrentTask])

  if (showFullCalendar) {
    return <FullCalendarView onClose={() => setShowFullCalendar(false)} />
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Decorative sparkles */}
        <Sparkle className="fixed top-20 left-10 opacity-30" />
        <Sparkle className="fixed top-40 right-20 opacity-20 w-6 h-6" />
        <Sparkle className="fixed bottom-40 left-1/4 opacity-25 w-5 h-5" />
        <Sparkle className="fixed top-1/3 right-1/3 opacity-15 w-8 h-8" />

        {/* Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-border/50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon.svg" alt="StudyFlow" className="w-10 h-10 rounded-xl" />
              <h1 className="hidden sm:block text-xl font-bold text-foreground">StudyFlow</h1>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <p className="hidden md:block text-sm text-muted-foreground">
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </p>
              <Link href="/stats">
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <BarChart3 className="w-5 h-5" />
                  <span className="sr-only">Statistics</span>
                </Button>
              </Link>
              <Link href="/profile">
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <User className="w-5 h-5" />
                  <span className="sr-only">Profile</span>
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="container mx-auto px-4 py-8 flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left column - Today's tasks and current task */}
            <div className="lg:col-span-5 space-y-6">
              <div className="flex flex-col md:flex-row lg:flex-col gap-6">
                <TodayTasks />
                <CurrentTaskPanel />
              </div>
            </div>

            {/* Right column - Week view, events, categories */}
            <div className="lg:col-span-7 space-y-6">
              <WeekView onOpenCalendar={() => setShowFullCalendar(true)} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <EventsPanel />
                <CategoriesPanel />
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeTask && <DraggableTask task={activeTask} isOverlay />}
      </DragOverlay>

      {/* Celebration when every task for today is complete */}
      <AllTasksCelebration
        open={showAllDone}
        onClose={() => setShowAllDone(false)}
        completedCount={completedToday}
      />
    </DndContext>
  )
}
