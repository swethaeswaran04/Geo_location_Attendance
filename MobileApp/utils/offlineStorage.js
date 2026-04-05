import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "unsynced_attendance";

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const getOfflineRecords = async () => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
};

const saveAllRecords = (records) =>
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));

export const saveOfflineRecord = async (record) => {
  const existing = await getOfflineRecords();

  // Deduplicate by userId + checkInTime before saving
  const isDuplicate = existing.some((r) => r.checkInTime === record.checkInTime);
  if (isDuplicate) return;

  const newRecord = { ...record, localId: generateId(), syncStatus: false };
  await saveAllRecords([...existing, newRecord]);
};

// Patch checkOutTime onto the most recent open check-in record
export const patchCheckOut = async (checkOutTime) => {
  const records = await getOfflineRecords();
  const lastIdx = [...records].reverse().findIndex((r) => !r.checkOutTime);
  if (lastIdx === -1) return false;

  const realIdx = records.length - 1 - lastIdx;
  records[realIdx].checkOutTime = checkOutTime;
  await saveAllRecords(records);
  return true;
};

// Remove only successfully synced records by their localIds
export const removeRecordsByIds = async (localIds) => {
  const records = await getOfflineRecords();
  const remaining = records.filter((r) => !localIds.includes(r.localId));
  await saveAllRecords(remaining);
};

export const clearOfflineRecords = () => AsyncStorage.removeItem(STORAGE_KEY);

export const getUnsyncedCount = async () => {
  const records = await getOfflineRecords();
  return records.length;
};
