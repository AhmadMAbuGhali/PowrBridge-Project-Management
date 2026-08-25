"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CalendarTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | string | null;
  number: number;
  project: { id: string; name: string; color: string };
};

export function CalendarView({ tasks }: { tasks: CalendarTask[] }) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor));
    const end = endOfWeek(endOfMonth(cursor));
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const tasksByDay = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const key = format(new Date(task.dueDate), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }
    return map;
  }, [tasks]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted">Tasks with due dates across your workspace</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="icon" onClick={() => setCursor((d) => subMonths(d, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="min-w-36 text-center text-sm font-medium">
            {format(cursor, "MMMM yyyy")}
          </p>
          <Button variant="secondary" size="icon" onClick={() => setCursor((d) => addMonths(d, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="bg-card px-2 py-2 text-center text-xs font-medium text-muted">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayTasks = tasksByDay.get(key) ?? [];
          return (
            <div
              key={key}
              className={cn(
                "min-h-28 bg-card p-2",
                !isSameMonth(day, cursor) && "opacity-40",
                isSameDay(day, new Date()) && "ring-1 ring-inset ring-accent/40",
              )}
            >
              <p className="mb-1 text-xs font-medium">{format(day, "d")}</p>
              <ul className="space-y-1">
                {dayTasks.slice(0, 3).map((task) => (
                  <li key={task.id}>
                    <Link
                      href={`/app/projects/${task.project.id}`}
                      className="block truncate rounded px-1.5 py-0.5 text-[11px] text-foreground hover:opacity-80"
                      style={{ backgroundColor: `${task.project.color}22` }}
                    >
                      #{task.number} {task.title}
                    </Link>
                  </li>
                ))}
                {dayTasks.length > 3 ? (
                  <li className="text-[10px] text-muted">+{dayTasks.length - 3} more</li>
                ) : null}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
