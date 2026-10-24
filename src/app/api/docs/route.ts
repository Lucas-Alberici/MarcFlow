import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/api-auth";
import { getApiDocs } from "@/lib/swagger";

export async function GET(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_SWAGGER_ENABLED !== "true") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const spec = getApiDocs();
  return NextResponse.json(spec);
}
