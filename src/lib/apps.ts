export type DailyApp = {
  slug: string;
  name: string;
  description: string;
};

export const dailyApps: DailyApp[] = [
  {
    slug: "quick-notes",
    name: "Quick Notes",
    description: "Capture short notes and reminders without opening a heavy workspace."
  },
  {
    slug: "habit-tracker",
    name: "Habit Tracker",
    description: "Track simple daily habits and keep a lightweight streak history."
  },
  {
    slug: "idea-vault",
    name: "Idea Vault",
    description: "Save rough ideas, prompts, and half-formed projects in one place."
  },
  {
    slug: "tiny-crm",
    name: "Tiny CRM",
    description: "Keep a small list of people, follow-ups, and relationship notes."
  },
  {
    slug: "seo-opportunity",
    name: "SEO Opportunity Dashboard",
    description:
      "Turn DataForSEO pulls into a visual content opportunity dashboard, roadmap, and competitor research workspace."
  }
];

export function getDailyApp(slug: string) {
  return dailyApps.find((app) => app.slug === slug);
}
