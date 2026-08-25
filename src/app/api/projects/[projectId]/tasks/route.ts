import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createTask, listTasks } from "@/lib/services/tasks";
import { createTaskSchema } from "@/lib/validations/project";
import { handleRbacError } from "@/lib/rbac/api";

type Params = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { projectId } = await params;
    const data = await listTasks(session.user.id, projectId);
    return NextResponse.json({ data });
  } catch (error) {
    return handleRbacError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { projectId } = await params;
    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten(), code: "VALIDATION" },
        { status: 400 },
      );
    }

    const data = await createTask(session.user.id, projectId, parsed.data);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleRbacError(error);
  }
}
