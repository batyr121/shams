import { endpoint, vote } from "@/lib/server/endpoints";
export const runtime = "nodejs";
export async function POST(request: Request) {
  return endpoint(() => vote(request));
}
