import { loadDashboardData } from "../../../db/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await loadDashboardData();
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="leetcode-progress.json"',
    },
  });
}
