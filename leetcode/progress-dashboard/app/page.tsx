import { loadDashboardData } from "../db/dashboard";
import { Dashboard } from "./components/Dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await loadDashboardData();
  return <Dashboard initialData={data} />;
}
