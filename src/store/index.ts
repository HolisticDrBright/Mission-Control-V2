// ============================================================================
// Mission Control V2 - Zustand Store
// Single global store for all UI and entity state
// ============================================================================

import { create } from "zustand";
import type {
  Project,
  Agent,
  AgentStatus,
  Task,
  KanbanStatus,
  InboxMessage,
  ScheduledJob,
  ActivityLogEntry,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Store Interface
// ---------------------------------------------------------------------------

interface MissionControlStore {
  // --- Projects ---
  projects: Project[];
  selectedProjectId: string | null;
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  setSelectedProjectId: (id: string | null) => void;

  // --- Agents ---
  agents: Agent[];
  setAgents: (agents: Agent[]) => void;
  updateAgentStatus: (agentId: string, status: AgentStatus) => void;

  // --- Tasks ---
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  moveTask: (taskId: string, newStatus: KanbanStatus) => void;

  // --- Inbox ---
  inboxMessages: InboxMessage[];
  unreadCount: number;
  setMessages: (messages: InboxMessage[]) => void;
  markRead: (messageId: string) => void;

  // --- Scheduled Jobs ---
  scheduledJobs: ScheduledJob[];
  setJobs: (jobs: ScheduledJob[]) => void;

  // --- Activity Log ---
  activityLog: ActivityLogEntry[];
  addActivity: (entry: ActivityLogEntry) => void;

  // --- UI State ---
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  commandPaletteOpen: boolean;
  toggleCommandPalette: () => void;
  globalSearch: string;
  setGlobalSearch: (query: string) => void;
}

// ---------------------------------------------------------------------------
// Helper: compute unread count from messages array
// ---------------------------------------------------------------------------

function countUnread(messages: InboxMessage[]): number {
  return messages.filter((m) => m.status === "unread").length;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useStore = create<MissionControlStore>((set) => ({
  // --- Projects ---
  projects: [],
  selectedProjectId: null,
  setProjects: (projects) => set({ projects }),
  addProject: (project) =>
    set((s) => ({ projects: [...s.projects, project] })),
  updateProject: (id, patch) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === id ? { ...p, ...patch, updated_at: new Date().toISOString() } : p
      ),
    })),
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),

  // --- Agents ---
  agents: [],
  setAgents: (agents) => set({ agents }),
  updateAgentStatus: (agentId, status) =>
    set((s) => ({
      agents: s.agents.map((a) =>
        a.id === agentId
          ? { ...a, status, updated_at: new Date().toISOString() }
          : a
      ),
    })),

  // --- Tasks ---
  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
  updateTask: (id, patch) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, ...patch, updated_at: new Date().toISOString() } : t
      ),
    })),
  moveTask: (taskId, newStatus) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              kanban_status: newStatus,
              updated_at: new Date().toISOString(),
              started_at:
                newStatus === "in_progress" && !t.started_at
                  ? new Date().toISOString()
                  : t.started_at,
              completed_at:
                newStatus === "done" ? new Date().toISOString() : t.completed_at,
            }
          : t
      ),
    })),

  // --- Inbox ---
  inboxMessages: [],
  unreadCount: 0,
  setMessages: (messages) =>
    set({ inboxMessages: messages, unreadCount: countUnread(messages) }),
  markRead: (messageId) =>
    set((s) => {
      const updated = s.inboxMessages.map((m) =>
        m.id === messageId ? { ...m, status: "read" as const } : m
      );
      return { inboxMessages: updated, unreadCount: countUnread(updated) };
    }),

  // --- Scheduled Jobs ---
  scheduledJobs: [],
  setJobs: (jobs) => set({ scheduledJobs: jobs }),

  // --- Activity Log ---
  activityLog: [],
  addActivity: (entry) =>
    set((s) => ({
      activityLog: [...s.activityLog.slice(-99), entry],
    })),

  // --- UI State ---
  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  commandPaletteOpen: false,
  toggleCommandPalette: () =>
    set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  globalSearch: "",
  setGlobalSearch: (query) => set({ globalSearch: query }),
}));
