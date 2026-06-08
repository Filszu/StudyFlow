import { create } from "zustand"
import { persist } from "zustand/middleware"
import { addDays, startOfDay, isSameDay } from "date-fns"

export interface Category {
  id: string
  name: string
  color: string
  defaultRepetitionDays: number
}

export interface CompletionRecord {
  completedAt: Date
  timeSpent: number
  nextRevisionDays: number
}

export type Difficulty = "easy" | "mid" | "tough"

export interface Task {
  id: string
  title: string
  categoryId: string | null
  eventId: string | null
  dueDate: Date
  completedAt: Date | null
  timeSpent: number // in seconds
  status: "todo" | "in-progress" | "completed"
  repetitionCount: number
  nextRepetitionDays: number
  completionHistory: CompletionRecord[]
  difficulty: Difficulty | null
  mastered: boolean
}

export interface StudyEvent {
  id: string
  title: string
  date: Date
  categoryId: string | null
  tasks: string[] // task ids
}

interface AppState {
  categories: Category[]
  tasks: Task[]
  events: StudyEvent[]
  currentTaskId: string | null
  timerRunning: boolean
  timerStartedAt: number | null
  userName: string
  themeColor: string
  
  // Actions
  addCategory: (name: string, color: string, defaultRepetitionDays?: number) => void
  updateCategory: (id: string, updates: Partial<Category>) => void
  deleteCategory: (id: string) => void
  
  addTask: (title: string, eventId: string | null, categoryId: string | null, dueDate?: Date) => string
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  moveTaskToDate: (taskId: string, newDate: Date) => void
  
  addEvent: (title: string, date: Date, categoryId: string | null) => void
  updateEvent: (id: string, updates: Partial<StudyEvent>) => void
  deleteEvent: (id: string) => void
  addTaskToEvent: (eventId: string, taskTitle: string) => void
  moveEventToDate: (eventId: string, newDate: Date) => void
  
  setCurrentTask: (taskId: string | null) => void
  startTimer: () => void
  stopTimer: () => void
  resetTimer: () => void
  finishTask: (nextRevisionDays: number, difficulty?: Difficulty | null) => void
  finishTaskNoRepeat: (difficulty?: Difficulty | null) => void
  setUserName: (name: string) => void
  setThemeColor: (color: string) => void
  importData: (data: { categories?: Category[]; tasks?: Task[]; events?: StudyEvent[] }) => void
  
  getTasksForDate: (date: Date) => Task[]
  getTasksForWeek: (startDate: Date) => Task[]
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      categories: [
        { id: "cat-1", name: "Physics", color: "#F5A9A9", defaultRepetitionDays: 1 },
        { id: "cat-2", name: "Mathematics", color: "#A9D9F5", defaultRepetitionDays: 2 },
        { id: "cat-3", name: "Chemistry", color: "#C5F5A9", defaultRepetitionDays: 1 },
      ],
      tasks: [],
      events: [],
      currentTaskId: null,
      timerRunning: false,
      timerStartedAt: null,
      userName: "",
      themeColor: "coral",

      addCategory: (name, color, defaultRepetitionDays = 1) => {
        const newCategory: Category = {
          id: `cat-${Date.now()}`,
          name,
          color,
          defaultRepetitionDays,
        }
        set((state) => ({ categories: [...state.categories, newCategory] }))
      },

      updateCategory: (id, updates) => {
        set((state) => ({
          categories: state.categories.map((cat) =>
            cat.id === id ? { ...cat, ...updates } : cat
          ),
        }))
      },

      deleteCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter((cat) => cat.id !== id),
        }))
      },

      addTask: (title, eventId, categoryId, dueDate = new Date()) => {
        const newTask: Task = {
          id: `task-${Date.now()}`,
          title,
          categoryId,
          eventId,
          dueDate: startOfDay(dueDate),
          completedAt: null,
          timeSpent: 0,
          status: "todo",
          repetitionCount: 0,
          nextRepetitionDays: 1,
          completionHistory: [],
          difficulty: null,
          mastered: false,
        }
        set((state) => ({ tasks: [...state.tasks, newTask] }))
        
        // If task belongs to an event, add it to the event's task list
        if (eventId) {
          set((state) => ({
            events: state.events.map((event) =>
              event.id === eventId
                ? { ...event, tasks: [...event.tasks, newTask.id] }
                : event
            ),
          }))
        }
        
        return newTask.id
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, ...updates } : task
          ),
        }))
      },

      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
          events: state.events.map((event) => ({
            ...event,
            tasks: event.tasks.filter((taskId) => taskId !== id),
          })),
          currentTaskId: state.currentTaskId === id ? null : state.currentTaskId,
        }))
      },

      moveTaskToDate: (taskId, newDate) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId ? { ...task, dueDate: startOfDay(newDate) } : task
          ),
        }))
      },

      addEvent: (title, date, categoryId) => {
        const newEvent: StudyEvent = {
          id: `event-${Date.now()}`,
          title,
          date: startOfDay(date),
          categoryId,
          tasks: [],
        }
        set((state) => ({ events: [...state.events, newEvent] }))
      },

      updateEvent: (id, updates) => {
        set((state) => ({
          events: state.events.map((event) =>
            event.id === id ? { ...event, ...updates } : event
          ),
        }))
      },

      deleteEvent: (id) => {
        const event = get().events.find((e) => e.id === id)
        if (event) {
          // Also delete all tasks associated with this event
          set((state) => ({
            events: state.events.filter((e) => e.id !== id),
            tasks: state.tasks.filter((task) => task.eventId !== id),
          }))
        }
      },

      addTaskToEvent: (eventId, taskTitle) => {
        const event = get().events.find((e) => e.id === eventId)
        if (event) {
          get().addTask(taskTitle, eventId, event.categoryId, event.date)
        }
      },

      moveEventToDate: (eventId, newDate) => {
        set((state) => ({
          events: state.events.map((event) =>
            event.id === eventId ? { ...event, date: startOfDay(newDate) } : event
          ),
        }))
      },

      setCurrentTask: (taskId) => {
        set({ currentTaskId: taskId })
      },

      startTimer: () => {
        const currentTaskId = get().currentTaskId
        if (currentTaskId) {
          set({
            timerRunning: true,
            timerStartedAt: Date.now(),
          })
          get().updateTask(currentTaskId, { status: "in-progress" })
        }
      },

      stopTimer: () => {
        const { timerStartedAt, currentTaskId, tasks } = get()
        if (timerStartedAt && currentTaskId) {
          const elapsed = Math.floor((Date.now() - timerStartedAt) / 1000)
          const task = tasks.find((t) => t.id === currentTaskId)
          if (task) {
            get().updateTask(currentTaskId, {
              timeSpent: task.timeSpent + elapsed,
            })
          }
        }
        set({ timerRunning: false, timerStartedAt: null })
      },

      resetTimer: () => {
        const { currentTaskId } = get()
        if (currentTaskId) {
          get().updateTask(currentTaskId, { timeSpent: 0 })
        }
        set({ timerRunning: false, timerStartedAt: null })
      },

      finishTask: (nextRevisionDays, difficulty) => {
        const { currentTaskId, timerStartedAt, tasks } = get()
        if (!currentTaskId) return

        const task = tasks.find((t) => t.id === currentTaskId)
        if (!task) return

        // Difficulty is selected on the first completion and then carried forward
        const resolvedDifficulty = difficulty ?? task.difficulty ?? null

        // Calculate total time spent including current session
        let totalTimeSpent = task.timeSpent
        if (timerStartedAt) {
          totalTimeSpent += Math.floor((Date.now() - timerStartedAt) / 1000)
        }

        // Create completion record
        const completionRecord: CompletionRecord = {
          completedAt: new Date(),
          timeSpent: totalTimeSpent,
          nextRevisionDays,
        }

        // Update current task as completed with history
        get().updateTask(currentTaskId, {
          status: "completed",
          completedAt: new Date(),
          timeSpent: totalTimeSpent,
          completionHistory: [...(task.completionHistory || []), completionRecord],
          difficulty: resolvedDifficulty,
        })

        // Create new task for next revision
        const newDueDate = addDays(startOfDay(new Date()), nextRevisionDays)
        const newRepetitionCount = task.repetitionCount + 1
        
        // Calculate next suggested revision based on spaced repetition
        let nextDays = nextRevisionDays
        if (newRepetitionCount >= 5) nextDays = 30
        else if (newRepetitionCount >= 4) nextDays = 14
        else if (newRepetitionCount >= 3) nextDays = 7
        else if (newRepetitionCount >= 2) nextDays = 3

        const newTask: Task = {
          id: `task-${Date.now()}`,
          title: task.title,
          categoryId: task.categoryId,
          eventId: task.eventId,
          dueDate: newDueDate,
          completedAt: null,
          timeSpent: 0,
          status: "todo",
          repetitionCount: newRepetitionCount,
          nextRepetitionDays: nextDays,
          completionHistory: [...(task.completionHistory || []), completionRecord],
          difficulty: resolvedDifficulty,
          mastered: false,
        }

        set((state) => ({
          tasks: [...state.tasks, newTask],
          currentTaskId: null,
          timerRunning: false,
          timerStartedAt: null,
        }))
      },

      finishTaskNoRepeat: (difficulty) => {
        const { currentTaskId, timerStartedAt, tasks } = get()
        if (!currentTaskId) return

        const task = tasks.find((t) => t.id === currentTaskId)
        if (!task) return

        const resolvedDifficulty = difficulty ?? task.difficulty ?? null

        // Calculate total time spent including current session
        let totalTimeSpent = task.timeSpent
        if (timerStartedAt) {
          totalTimeSpent += Math.floor((Date.now() - timerStartedAt) / 1000)
        }

        const completionRecord: CompletionRecord = {
          completedAt: new Date(),
          timeSpent: totalTimeSpent,
          nextRevisionDays: 0,
        }

        // Mark the task as completed AND mastered — no follow-up task is created
        get().updateTask(currentTaskId, {
          status: "completed",
          completedAt: new Date(),
          timeSpent: totalTimeSpent,
          completionHistory: [...(task.completionHistory || []), completionRecord],
          difficulty: resolvedDifficulty,
          mastered: true,
        })

        set({
          currentTaskId: null,
          timerRunning: false,
          timerStartedAt: null,
        })
      },

      getTasksForDate: (date) => {
        return get().tasks.filter(
          (task) =>
            isSameDay(new Date(task.dueDate), date)
        )
      },

      getTasksForWeek: (startDate) => {
        const weekEnd = addDays(startDate, 7)
        return get().tasks.filter((task) => {
          const taskDate = new Date(task.dueDate)
          return taskDate >= startDate && taskDate < weekEnd
        })
      },

      setUserName: (name) => {
        set({ userName: name })
      },

      setThemeColor: (color) => {
        set({ themeColor: color })
      },

      importData: (data) => {
        set((state) => ({
          categories: data.categories || state.categories,
          tasks: data.tasks || state.tasks,
          events: data.events || state.events,
        }))
      },
    }),
    {
      name: "study-planner-storage",
      partialize: (state) => ({
        categories: state.categories,
        tasks: state.tasks,
        events: state.events,
        userName: state.userName,
        themeColor: state.themeColor,
      }),
    }
  )
)
