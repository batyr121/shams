import { endpoint, adminData } from "@/lib/server/endpoints";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return endpoint(adminData);
}
