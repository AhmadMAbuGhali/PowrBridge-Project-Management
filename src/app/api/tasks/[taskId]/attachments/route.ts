import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import {
  deleteAttachment,
  listAttachments,
  uploadAttachment,
} from "@/lib/services/attachments";
import { handleRbacError } from "@/lib/rbac/api";

type Params = { params: Promise<{ taskId: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { taskId } = await params;
    const data = await listAttachments(session.user.id, taskId);
    return NextResponse.json({ data });
  } catch (error) {
    return handleRbacError(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    const { taskId } = await params;
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const data = await uploadAttachment(session.user.id, taskId, {
      name: file.name,
      type: file.type,
      size: file.size,
      bytes,
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleRbacError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const session = await requireSession();
    await params;
    const body = (await request.json()) as { attachmentId?: string };
    if (!body.attachmentId) {
      return NextResponse.json(
        { error: "attachmentId is required" },
        { status: 400 },
      );
    }
    await deleteAttachment(session.user.id, body.attachmentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRbacError(error);
  }
}
