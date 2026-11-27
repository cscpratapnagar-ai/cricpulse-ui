export interface VersionedLiveScore { eventVersion?: number; }
export function shouldAcceptLiveScoreVersion(incoming: VersionedLiveScore, currentVersion: number | undefined): boolean;
