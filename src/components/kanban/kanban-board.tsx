"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { format, isPast, isToday } from "date-fns";
import { toast } from "sonner";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import {
  createTaskAction,
  moveTaskAction,
} from "@/lib/actions/workspace";
import { TaskDetailDrawer } from "@/components/tasks/task-detail-drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type KanbanTask = {
  id: string;
  projectId: string;
  number: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | string | null;
  position: number;
  parentId: string | null;
};

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "BACKLOG", label: "Backlog" },
  { id: "TODO", label: "Todo" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "IN_REVIEW", label: "In Review" },
  { id: "DONE", label: "Done" },
];

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  URGENT: "bg-red-500/15 text-red-700 dark:text-red-300",
  HIGH: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  MEDIUM: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  LOW: "bg-slate-500/5 text-slate-500",
};

type OptimisticAction =
  | { type: "move"; taskId: string; status: TaskStatus; position: number }
  | { type: "add"; task: KanbanTask };

function applyOptimistic(tasks: KanbanTask[], action: OptimisticAction) {
  if (action.type === "add") return [...tasks, action.task];
  return tasks.map((task) =>
    task.id === action.taskId
      ? { ...task, status: action.status, position: action.position }
      : task,
  );
}

function TaskCard({
  task,
  onOpen,
}: {
  task: KanbanTask;
  onOpen: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { status: task.status } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const due = task.dueDate ? new Date(task.dueDate) : null;
  const dueTone =
    due && task.status !== "DONE"
      ? isPast(due) && !isToday(due)
        ? "text-danger"
        : isToday(due)
          ? "text-accent"
          : "text-muted"
      : "text-muted";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-md border border-border bg-card p-3 shadow-sm transition hover:border-accent/40",
        isDragging && "opacity-40",
      )}
    >
      <div
        className="mb-1 flex cursor-grab items-center justify-between gap-2 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <span className="text-[11px] text-muted">#{task.number}</span>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase",
            PRIORITY_STYLES[task.priority],
          )}
        >
          {task.priority}
        </span>
      </div>
      <button
        type="button"
        className="w-full text-left"
        onClick={() => onOpen(task.id)}
      >
        <p className="text-sm font-medium leading-snug">{task.title}</p>
        {due ? (
          <p className={cn("mt-2 inline-flex items-center gap-1 text-[11px]", dueTone)}>
            <Calendar className="h-3 w-3" />
            {format(due, "MMM d")}
          </p>
        ) : null}
      </button>
    </div>
  );
}

function Column({
  status,
  label,
  tasks,
  projectId,
  onOpen,
}: {
  status: TaskStatus;
  label: string;
  tasks: KanbanTask[];
  projectId: string;
  onOpen: (id: string) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { status },
  });

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("status", status);
    formData.set("priority", priority);
    if (dueDate) formData.set("dueDate", dueDate);
    startTransition(async () => {
      const result = await createTaskAction(projectId, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setTitle("");
      setDueDate("");
      setPriority("MEDIUM");
      setExpanded(false);
      toast.success("Task created");
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-lg border border-border bg-background/60",
        isOver && "border-accent/60",
      )}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
          {label}
        </h3>
        <span className="text-xs text-muted">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className="flex min-h-[140px] flex-1 flex-col gap-2 px-2 pb-2"
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={onOpen} />
          ))}
        </div>
      </SortableContext>
      <div className="border-t border-border p-2">
        {expanded ? (
          <form onSubmit={onAdd} className="space-y-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              className="h-8 text-xs"
              autoFocus
            />
            <div className="flex gap-1">
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-8 text-xs"
              />
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="h-8 rounded-md border border-border bg-card px-1 text-xs"
              >
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            <div className="flex gap-1">
              <Button type="submit" size="sm" className="flex-1" disabled={pending || !title.trim()}>
                Add
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setExpanded(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => setExpanded(true)}
          >
            <Plus className="h-4 w-4" />
            Add task
          </Button>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({
  projectId,
  initialTasks,
  initialTaskId,
}: {
  projectId: string;
  initialTasks: KanbanTask[];
  initialTaskId?: string | null;
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    initialTaskId ?? null,
  );
  const [optimisticTasks, dispatchOptimistic] = useOptimistic(
    initialTasks,
    applyOptimistic,
  );
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(
      COLUMNS.map((c) => [c.id, [] as KanbanTask[]]),
    ) as Record<TaskStatus, KanbanTask[]>;

    for (const task of [...optimisticTasks].sort((a, b) => a.position - b.position)) {
      if (map[task.status]) map[task.status].push(task);
    }
    return map;
  }, [optimisticTasks]);

  const activeTask = optimisticTasks.find((t) => t.id === activeId) ?? null;

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const task = optimisticTasks.find((t) => t.id === taskId);
    if (!task) return;

    const overId = String(over.id);
    const overTask = optimisticTasks.find((t) => t.id === overId);
    const overStatus =
      (over.data.current?.status as TaskStatus | undefined) ??
      overTask?.status ??
      (COLUMNS.some((c) => c.id === overId) ? (overId as TaskStatus) : task.status);

    const columnTasks = byStatus[overStatus].filter((t) => t.id !== taskId);
    const overIndex = overTask
      ? columnTasks.findIndex((t) => t.id === overTask.id)
      : columnTasks.length;

    const before = columnTasks[overIndex - 1];
    const after = columnTasks[overIndex];
    let position = task.position;
    if (!before && after) position = after.position - 1000;
    else if (before && !after) position = before.position + 1000;
    else if (before && after) position = (before.position + after.position) / 2;
    else position = 1000;

    if (task.status === overStatus && task.position === position) return;

    startTransition(async () => {
      dispatchOptimistic({
        type: "move",
        taskId,
        status: overStatus,
        position,
      });

      const result = await moveTaskAction(taskId, {
        status: overStatus,
        position,
      });

      if (result.error) {
        toast.error(result.error);
        router.refresh();
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map((column) => (
            <Column
              key={column.id}
              status={column.id}
              label={column.label}
              tasks={byStatus[column.id]}
              projectId={projectId}
              onOpen={setSelectedTaskId}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="w-72 rounded-md border border-border bg-card p-3 shadow-lg">
              <p className="text-sm font-medium">{activeTask.title}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <TaskDetailDrawer
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => {
          setSelectedTaskId(null);
          router.refresh();
        }}
      />
    </>
  );
}
