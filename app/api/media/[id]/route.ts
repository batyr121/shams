import { endpoint, media } from "@/lib/server/endpoints";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return endpoint(async () => media((await context.params).id));
}
