import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { deleteTask, moveTask, updateTask } from "@/lib/services/tasks";
import { moveTaskSchema, updateTaskSchema } from "@/lib/validations/project";
import { handleRbacError } from "@/lib/rbac/api";

type Params = { params: Promise<{ taskId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { taskId } = await params;
    const body = await request.json();

    if (body?.move === true) {
      const parsed = moveTaskSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.flatten(), code: "VALIDATION" },
          { status: 400 },
        );
      }
      const data = await moveTask(session.user.id, taskId, parsed.data);
      return NextResponse.json({ data });
    }

    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten(), code: "VALIDATION" },
        { status: 400 },
      );
    }

    const data = await updateTask(session.user.id, taskId, parsed.data);
    return NextResponse.json({ data });
  } catch (error) {
    return handleRbacError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { taskId } = await params;
    await deleteTask(session.user.id, taskId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRbacError(error);
  }
}
