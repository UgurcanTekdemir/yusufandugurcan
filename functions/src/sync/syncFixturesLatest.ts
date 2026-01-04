import * as functions from "firebase-functions";
import { getSyncState, updateSyncState } from "../repositories/syncState.repository";
import { incrementCacheVersion } from "../repositories/cacheVersion.repository";

/**
 * Sync latest fixtures from SportMonks API
 * This function is called by Cloud Scheduler
 */
export async function syncFixturesLatest(): Promise<void> {
  const startTime = Date.now();
  functions.logger.info("Starting syncFixturesLatest");

  try {
    // Get last sync timestamp from Firestore
    const syncState = await getSyncState();
    const lastSyncAt = syncState?.lastSyncAt;

    // Convert Timestamp to ISO string for API call
    let sinceParam: string | undefined;
    if (lastSyncAt) {
      sinceParam = lastSyncAt.toDate().toISOString();
      functions.logger.info(`Syncing fixtures since: ${sinceParam}`);
    } else {
      functions.logger.info("First sync: fetching all latest fixtures");
    }

    // Get SportMonks API token from environment
    // Try functions.config() first (v1), then process.env (v2/modern)
    const apiToken =
      (functions.config().sportmonks?.api_token as string | undefined) ||
      process.env.SPORTMONKS_API_TOKEN;
    if (!apiToken) {
      throw new Error(
        "SPORTMONKS_API_TOKEN not configured. Set via functions.config or process.env"
      );
    }

    // Call SportMonks API
    const baseUrl = "https://api.sportmonks.com/v3";
    const url = new URL(`${baseUrl}/core/fixtures/latest`);
    url.searchParams.set("api_token", apiToken);
    if (sinceParam) {
      url.searchParams.set("since", sinceParam);
    }

    functions.logger.info(`Calling SportMonks API: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `SportMonks API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = await response.json();
    const fixtures = (data?.data || []) as unknown[];

    functions.logger.info(`Received ${fixtures.length} fixtures from SportMonks API`);

    // If fixtures were returned, update cache version and sync state
    if (fixtures.length > 0) {
      functions.logger.info(`Found ${fixtures.length} updated fixtures, invalidating cache`);

      // Increment cache version to invalidate cache
      const newCacheVersion = await incrementCacheVersion();
      functions.logger.info(`Cache version incremented to: ${newCacheVersion}`);

      // Update sync state with current timestamp
      await updateSyncState({
        lastSyncAt: admin.firestore.Timestamp.now(),
        cacheVersion: newCacheVersion,
      });

      functions.logger.info("Sync state updated");
    } else {
      functions.logger.info("No updates found, skipping cache invalidation");
      
      // Still update lastSyncAt even if no updates to track last check time
      if (!lastSyncAt) {
        await updateSyncState({
          lastSyncAt: admin.firestore.Timestamp.now(),
        });
      }
    }

    const duration = Date.now() - startTime;
    functions.logger.info(`syncFixturesLatest completed in ${duration}ms`);
  } catch (error) {
    const duration = Date.now() - startTime;
    functions.logger.error(`syncFixturesLatest failed after ${duration}ms:`, error);
    
    // Don't throw error to prevent scheduled function from retrying immediately
    // Errors are logged for monitoring
    if (error instanceof Error) {
      functions.logger.error(`Error message: ${error.message}`);
    }
  }
}

