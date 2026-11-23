import { endpoint, login } from "@/lib/server/endpoints";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return endpoint(() => login(request));
}
