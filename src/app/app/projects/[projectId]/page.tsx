import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth/session";
import { getProject } from "@/lib/services/projects";
import { listTasks } from "@/lib/services/tasks";
import { listProjectActivity } from "@/lib/services/activity";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { RealtimeBridge } from "@/components/realtime-bridge";
import { NotFoundError, AuthorizationError } from "@/lib/rbac/guard";

type PageProps = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ task?: string }>;
};

export default async function ProjectBoardPage({ params, searchParams }: PageProps) {
  const { projectId } = await params;
  const { task: taskId } = await searchParams;
  const session = await requireSession();

  let project;
  let tasks;
  let activity;

  try {
    [project, tasks, activity] = await Promise.all([
      getProject(session.user.id, projectId),
      listTasks(session.user.id, projectId),
      listProjectActivity(projectId, 25),
    ]);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      notFound();
    }
    throw error;
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/app"
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Projects
          </Link>
          <div className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: project.color }}
            />
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          </div>
          {project.description ? (
            <p className="max-w-2xl text-sm text-muted">{project.description}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
        <KanbanBoard
          projectId={project.id}
          initialTasks={tasks}
          initialTaskId={taskId}
        />
        <ActivityFeed items={activity} />
      </div>
      <RealtimeBridge projectId={project.id} />
    </div>
  );
}
