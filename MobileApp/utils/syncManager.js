import NetInfo from "@react-native-community/netinfo";
import { syncAttendance } from "../services/api";
import { getOfflineRecords, removeRecordsByIds } from "./offlineStorage";

export const isOnline = async () => {
  const state = await NetInfo.fetch();
  return !!(state.isConnected && state.isInternetReachable);
};

/**
 * Fetches all unsynced local records, sends them to the backend,
 * then removes only the records that were successfully synced.
 *
 * Returns { synced, skipped, failed } or null if offline / nothing to sync.
 */
export const syncOfflineRecords = async () => {
  const online = await isOnline();
  if (!online) return null;

  const records = await getOfflineRecords();
  if (records.length === 0) return null;

  // Strip localId before sending to backend
  const payload = records.map(({ localId, ...rest }) => rest);

  const result = await syncAttendance(payload);

  // Only remove records that were not rejected by the backend
  // Backend returns failed count — if all succeeded or skipped, clear all
  const failedCount = result.failed ?? 0;
  if (failedCount === 0) {
    // All records processed — remove everything
    const allIds = records.map((r) => r.localId);
    await removeRecordsByIds(allIds);
  } else {
    // Partial success — remove only synced + skipped, keep failed ones
    const processedCount = (result.synced ?? 0) + (result.skipped ?? 0);
    const idsToRemove = records.slice(0, processedCount).map((r) => r.localId);
    await removeRecordsByIds(idsToRemove);
  }

  return result;
};
