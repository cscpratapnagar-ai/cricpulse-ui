export interface VersionedLiveScore { eventVersion?: number; }

/** Accept only monotonically newer score versions. */
export function shouldAcceptLiveScoreVersion(
  incoming: VersionedLiveScore,
  currentVersion: number | undefined
): boolean {
  if (incoming.eventVersion === undefined) return currentVersion === undefined;
  if (!Number.isSafeInteger(incoming.eventVersion) || incoming.eventVersion < 0) return false;
  return currentVersion === undefined || incoming.eventVersion > currentVersion;
}
