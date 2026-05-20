import type { Metadata } from "next";
import { requireCurrentUser } from "@/lib/auth";
import { getSeoDashboardData } from "@/lib/seo/storage";
import { SeoDashboardClient } from "./seo-dashboard-client";
import "./seo-dashboard.css";

export const metadata: Metadata = {
  title: "SEO Opportunity Dashboard"
};

export default async function SeoOpportunityPage() {
  const user = await requireCurrentUser();
  const data = await getSeoDashboardData(user.id);

  return (
    <div className="seo-root">
      <SeoDashboardClient initialData={data} userLabel={user.name || user.email} />
    </div>
  );
}
