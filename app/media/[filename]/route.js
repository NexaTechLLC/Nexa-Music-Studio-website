import { serveMedia } from "../../../lib/nexa-core.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request, context) {
  const { filename } = await context.params;
  return serveMedia(request, filename);
}
