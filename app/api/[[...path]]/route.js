import { handleApi } from "../../../lib/nexa-core.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request, context) {
  const { path = [] } = await context.params;
  return handleApi(request, path);
}

export async function POST(request, context) {
  const { path = [] } = await context.params;
  return handleApi(request, path);
}
