import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadNotificationCount,
} from "@/lib/services/notifications";
import { handleRbacError } from "@/lib/rbac/api";

export async function GET() {
  try {
    const session = await requireSession();
    const [items, unread] = await Promise.all([
      listNotifications(session.user.id),
      unreadNotificationCount(session.user.id),
    ]);
    return NextResponse.json({ data: items, meta: { unread } });
  } catch (error) {
    return handleRbacError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    const body = (await request.json()) as {
      notificationId?: string;
      all?: boolean;
    };

    if (body.all) {
      await markAllNotificationsRead(session.user.id);
    } else if (body.notificationId) {
      await markNotificationRead(session.user.id, body.notificationId);
    } else {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const unread = await unreadNotificationCount(session.user.id);
    return NextResponse.json({ success: true, meta: { unread } });
  } catch (error) {
    return handleRbacError(error);
  }
}
