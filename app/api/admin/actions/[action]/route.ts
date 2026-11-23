import { endpoint, action } from "@/lib/server/endpoints";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  return endpoint(async () => action(request, (await context.params).action));
}
