import { endpoint, session } from "@/lib/server/endpoints";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return endpoint(session);
}
