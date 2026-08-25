import { formatDistanceToNow } from "date-fns";

type ActivityItem = {
  id: string;
  action: string;
  entityType: string;
  createdAt: Date | string;
  metadata: unknown;
  actor: { id: string; name: string | null; email: string };
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Activity</h2>
      </div>
      <ul className="max-h-80 overflow-y-auto">
        {items.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-muted">
            No activity yet
          </li>
        ) : (
          items.map((item) => {
            const meta = (item.metadata ?? {}) as Record<string, unknown>;
            const title =
              typeof meta.title === "string"
                ? meta.title
                : typeof meta.name === "string"
                  ? meta.name
                  : item.entityType;
            return (
              <li
                key={item.id}
                className="border-b border-border px-4 py-3 last:border-0"
              >
                <p className="text-sm">
                  <span className="font-medium">
                    {item.actor.name || item.actor.email}
                  </span>{" "}
                  <span className="text-muted">
                    {item.action.toLowerCase().replaceAll("_", " ")}
                  </span>{" "}
                  <span>{title}</span>
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  {formatDistanceToNow(new Date(item.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}
