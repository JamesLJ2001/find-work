import { loadDashboardData } from "../../../db/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await loadDashboardData();
  return Response.json(data, {
    headers: {
      "Cache-Control": "public, max-age=30, stale-while-revalidate=300",
    },
  });
}
