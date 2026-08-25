"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const json = (await res.json()) as {
        data: NotificationItem[];
        meta: { unread: number };
      };
      setItems(json.data);
      setUnread(json.meta.unread);
    });
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/realtime");
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { type?: string };
        if (
          data.type === "connected" ||
          data.type?.startsWith("task.") ||
          data.type === "project.created"
        ) {
          load();
        }
      } catch {
        // ignore malformed frames
      }
    };
    return () => source.close();
  }, [load]);

  async function markAll() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    load();
  }

  async function markOne(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId: id }),
    });
    load();
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        onClick={() => {
          setOpen((v) => !v);
          load();
        }}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent" />
        ) : null}
      </Button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-medium">Notifications</p>
            <button
              type="button"
              className="text-xs text-accent hover:underline"
              onClick={() => void markAll()}
            >
              Mark all read
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-3 py-8 text-center text-sm text-muted">
                You&apos;re all caught up
              </li>
            ) : (
              items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href ?? "/app"}
                    onClick={() => void markOne(item.id)}
                    className={cn(
                      "block border-b border-border px-3 py-3 hover:bg-background",
                      !item.readAt && "bg-accent/5",
                    )}
                  >
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.body ? (
                      <p className="text-xs text-muted">{item.body}</p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-muted">
                      {formatDistanceToNow(new Date(item.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
