import { resolvePublicFile, servePage } from "../../lib/nexa-core.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request, context) {
  const { slug = [] } = await context.params;
  return servePage(resolvePublicFile(slug), request);
}
