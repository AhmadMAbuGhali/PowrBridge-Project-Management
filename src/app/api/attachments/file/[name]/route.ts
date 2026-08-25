import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ name: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { name } = await params;
  const safe = decodeURIComponent(name).replaceAll("..", "");
  const filePath = path.join(process.cwd(), "storage", "uploads", safe);

  try {
    const data = await readFile(filePath);
    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `inline; filename="${safe.split("__").pop() ?? safe}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
