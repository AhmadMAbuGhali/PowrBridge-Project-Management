"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function RealtimeBridge({ projectId }: { projectId?: string }) {
  const router = useRouter();

  useEffect(() => {
    const source = new EventSource("/api/realtime");

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as {
          type?: string;
          projectId?: string;
        };
        if (!data.type || data.type === "connected") return;

        if (projectId && data.projectId && data.projectId !== projectId) {
          return;
        }

        if (
          data.type === "task.created" ||
          data.type === "task.updated" ||
          data.type === "task.moved" ||
          data.type === "task.deleted"
        ) {
          router.refresh();
        }

        if (data.type === "project.created") {
          toast.message("Workspace updated");
          router.refresh();
        }
      } catch {
        // ignore
      }
    };

    return () => source.close();
  }, [projectId, router]);

  return null;
}
