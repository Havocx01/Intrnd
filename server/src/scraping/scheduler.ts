import cron from "node-cron";
import { scrapeAllActiveSources } from "./extractor.js";

let task: cron.ScheduledTask | null = null;

export function startScrapeScheduler() {
  if (task) return;

  // Run daily at 3 AM.
  task = cron.schedule("0 3 * * *", async () => {
    console.log("[Scraper] Starting daily university opportunity scrape...");
    try {
      const result = await scrapeAllActiveSources();
      console.log(
        `[Scraper] Done. Sources: ${result.sourcesProcessed}, Opportunities: ${result.totalOpportunities}, New projects: ${result.totalProjectsCreated}`,
      );
      if (result.errors.length > 0) {
        console.warn(`[Scraper] Errors:`, result.errors);
      }
    } catch (err) {
      console.error("[Scraper] Fatal error:", err);
    }
  });

  console.log("[Scraper] Scheduled daily scrape at 3:00 AM.");
}

export function stopScrapeScheduler() {
  if (task) {
    task.stop();
    task = null;
  }
}
