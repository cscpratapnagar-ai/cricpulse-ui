/** Accept only monotonically newer score versions. */
export function shouldAcceptLiveScoreVersion(incoming, currentVersion) {
  if (incoming.eventVersion === undefined) return currentVersion === undefined;
  if (!Number.isSafeInteger(incoming.eventVersion) || incoming.eventVersion < 0) return false;
  return currentVersion === undefined || incoming.eventVersion > currentVersion;
}
