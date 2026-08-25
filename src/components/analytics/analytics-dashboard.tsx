type Analytics = {
  projectCount: number;
  taskTotal: number;
  taskDone: number;
  taskOverdue: number;
  completionRate: number;
  velocity: { completedThisWeek: number; createdThisWeek: number };
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
  workload: Array<{
    user: { id: string; name: string | null; email: string };
    openTasks: number;
  }>;
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export function AnalyticsDashboard({ data }: { data: Analytics }) {
  const statusEntries = Object.entries(data.tasksByStatus);
  const maxStatus = Math.max(1, ...statusEntries.map(([, n]) => n));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted">
          Velocity, completion, and workload across your organization
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Projects" value={data.projectCount} />
        <Stat label="Completion" value={`${data.completionRate}%`} />
        <Stat label="Overdue" value={data.taskOverdue} />
        <Stat
          label="Weekly velocity"
          value={`${data.velocity.completedThisWeek}/${data.velocity.createdThisWeek}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 text-sm font-semibold">Tasks by status</h2>
          <ul className="space-y-3">
            {statusEntries.map(([status, count]) => (
              <li key={status}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-muted">{status.replaceAll("_", " ")}</span>
                  <span>{count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${(count / maxStatus) * 100}%` }}
                  />
                </div>
              </li>
            ))}
            {statusEntries.length === 0 ? (
              <li className="text-sm text-muted">No tasks yet</li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-4 text-sm font-semibold">Workload</h2>
          <ul className="space-y-3">
            {data.workload.length === 0 ? (
              <li className="text-sm text-muted">No assignees with open tasks</li>
            ) : (
              data.workload.map((row) => (
                <li key={row.user.id} className="flex items-center justify-between text-sm">
                  <span>{row.user.name || row.user.email}</span>
                  <span className="text-muted">{row.openTasks} open</span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
