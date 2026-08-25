import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { createProject, listProjects } from "@/lib/services/projects";
import { createProjectSchema } from "@/lib/validations/project";
import { handleRbacError } from "@/lib/rbac/api";

export async function GET() {
  try {
    const session = await requireSession();
    const organizationId = session.user.activeOrganizationId;
    if (!organizationId) {
      return NextResponse.json({ data: [] });
    }
    const data = await listProjects(session.user.id, organizationId);
    return NextResponse.json({ data });
  } catch (error) {
    return handleRbacError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const organizationId = session.user.activeOrganizationId;
    if (!organizationId) {
      return NextResponse.json(
        { error: "No active organization", code: "NO_ORG" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten(), code: "VALIDATION" },
        { status: 400 },
      );
    }

    const data = await createProject(
      session.user.id,
      organizationId,
      parsed.data,
    );
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleRbacError(error);
  }
}
