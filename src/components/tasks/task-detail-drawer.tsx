"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import {
  addCommentAction,
  deleteTaskAction,
  getTaskDetailAction,
  updateTaskAction,
} from "@/lib/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TaskDetail = {
  id: string;
  projectId: string;
  number: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | Date | null;
  comments: Array<{
    id: string;
    body: string;
    createdAt: string | Date;
    author: { id: string; name: string | null; email: string };
    replies: Array<{
      id: string;
      body: string;
      createdAt: string | Date;
      author: { id: string; name: string | null; email: string };
    }>;
  }>;
  attachments: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    url: string;
    createdAt: string | Date;
  }>;
};

const STATUSES: TaskStatus[] = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "CANCELLED",
];

const PRIORITIES: TaskPriority[] = ["URGENT", "HIGH", "MEDIUM", "LOW"];

export function TaskDetailDrawer({
  taskId,
  open,
  onClose,
}: {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [pending, startTransition] = useTransition();
  const [comment, setComment] = useState("");

  const load = useCallback(
    (id: string) => {
      startTransition(async () => {
        const result = await getTaskDetailAction(id);
        if (result.error || !result.data) {
          toast.error(result.error ?? "Could not load task");
          onClose();
          return;
        }
        setTask(result.data as TaskDetail);
      });
    },
    [onClose],
  );

  useEffect(() => {
    if (!open || !taskId) return;
    load(taskId);
  }, [open, taskId, load]);

  if (!open) return null;

  function save(patch: Record<string, unknown>) {
    if (!task) return;
    startTransition(async () => {
      const result = await updateTaskAction(task.id, patch);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.data) {
        setTask((prev) =>
          prev
            ? {
                ...prev,
                title: result.data!.title,
                description: result.data!.description,
                status: result.data!.status,
                priority: result.data!.priority,
                dueDate: result.data!.dueDate,
              }
            : prev,
        );
      }
      toast.success("Task updated");
    });
  }

  function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!task || !comment.trim()) return;
    const formData = new FormData();
    formData.set("body", comment.trim());
    startTransition(async () => {
      const result = await addCommentAction(task.id, formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setComment("");
      load(task.id);
    });
  }

  function onDelete() {
    if (!task) return;
    startTransition(async () => {
      const result = await deleteTaskAction(task.id, task.projectId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Task deleted");
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close task details"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm text-muted">
            {task ? `#${task.number}` : "Loading…"}
          </p>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {task ? (
          <div className="flex-1 space-y-5 overflow-y-auto p-4">
            <Input
              key={`title-${task.id}-${task.title}`}
              defaultValue={task.title}
              className="h-auto border-0 bg-transparent px-0 text-xl font-semibold shadow-none focus-visible:ring-0"
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value !== task.title) {
                  save({ title: e.target.value.trim() });
                }
              }}
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select
                  className="h-10 w-full rounded-md border border-border bg-background px-2 text-sm"
                  value={task.status}
                  onChange={(e) => save({ status: e.target.value })}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <select
                  className="h-10 w-full rounded-md border border-border bg-background px-2 text-sm"
                  value={task.priority}
                  onChange={(e) => save({ priority: e.target.value })}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Due date</Label>
                <Input
                  type="date"
                  value={
                    task.dueDate
                      ? format(new Date(task.dueDate), "yyyy-MM-dd")
                      : ""
                  }
                  onChange={(e) =>
                    save({ dueDate: e.target.value ? e.target.value : null })
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea
                key={`desc-${task.id}`}
                className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                defaultValue={task.description ?? ""}
                placeholder="Add details…"
                onBlur={(e) => {
                  const next = e.target.value;
                  if (next !== (task.description ?? "")) {
                    save({ description: next || null });
                  }
                }}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Attachments</h3>
                <label className="cursor-pointer text-xs text-accent hover:underline">
                  Upload
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file || !task) return;
                      startTransition(async () => {
                        const body = new FormData();
                        body.set("file", file);
                        const res = await fetch(
                          `/api/tasks/${task.id}/attachments`,
                          { method: "POST", body },
                        );
                        if (!res.ok) {
                          const json = (await res.json().catch(() => null)) as
                            | { error?: string }
                            | null;
                          toast.error(json?.error ?? "Upload failed");
                          return;
                        }
                        toast.success("File uploaded");
                        load(task.id);
                      });
                    }}
                  />
                </label>
              </div>
              <ul className="space-y-2">
                {(task.attachments ?? []).length === 0 ? (
                  <li className="text-sm text-muted">No files yet</li>
                ) : (
                  (task.attachments ?? []).map((file) => (
                    <li
                      key={file.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate hover:underline"
                      >
                        {file.fileName}
                      </a>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted">
                          {Math.max(1, Math.round(file.fileSize / 1024))} KB
                        </span>
                        <button
                          type="button"
                          className="text-[11px] text-danger hover:underline"
                          onClick={() => {
                            startTransition(async () => {
                              const res = await fetch(
                                `/api/tasks/${task.id}/attachments`,
                                {
                                  method: "DELETE",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    attachmentId: file.id,
                                  }),
                                },
                              );
                              if (!res.ok) {
                                toast.error("Could not delete file");
                                return;
                              }
                              load(task.id);
                            });
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Comments</h3>
              <ul className="space-y-3">
                {task.comments.length === 0 ? (
                  <li className="text-sm text-muted">No comments yet</li>
                ) : (
                  task.comments.map((c) => (
                    <li key={c.id} className="rounded-md border border-border p-3">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-xs font-medium">
                          {c.author.name || c.author.email}
                        </span>
                        <span className="text-[11px] text-muted">
                          {formatDistanceToNow(new Date(c.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{c.body}</p>
                    </li>
                  ))
                )}
              </ul>
              <form onSubmit={submitComment} className="flex gap-2">
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Write a comment…"
                />
                <Button type="submit" disabled={pending || !comment.trim()}>
                  Post
                </Button>
              </form>
            </div>

            <Button
              variant="danger"
              className="w-full"
              disabled={pending}
              onClick={onDelete}
            >
              Delete task
            </Button>
          </div>
        ) : (
          <div className="p-6 text-sm text-muted">Loading task…</div>
        )}
      </aside>
    </div>
  );
}
