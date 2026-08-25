type RealtimeEvent = {
  type: string;
  organizationId?: string;
  projectId?: string;
  payload?: unknown;
  at: string;
};

type Listener = (event: RealtimeEvent) => void;

const globalForBus = globalThis as unknown as {
  __powrbridgeBus?: {
    listeners: Set<Listener>;
  };
};

function getBus() {
  if (!globalForBus.__powrbridgeBus) {
    globalForBus.__powrbridgeBus = { listeners: new Set() };
  }
  return globalForBus.__powrbridgeBus;
}

export function publishRealtime(event: Omit<RealtimeEvent, "at">) {
  const full: RealtimeEvent = { ...event, at: new Date().toISOString() };
  for (const listener of getBus().listeners) {
    try {
      listener(full);
    } catch {
      // ignore broken listeners
    }
  }
  return full;
}

export function subscribeRealtime(listener: Listener) {
  const bus = getBus();
  bus.listeners.add(listener);
  return () => {
    bus.listeners.delete(listener);
  };
}
