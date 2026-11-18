import { LiveScore } from './live-score.service';
import { QueuedDelivery } from './offline-scoring.store';

/**
 * Refuse queue replay unless command, payload and active scoring session agree.
 * Legacy commands may be safely bound by the store to their restored match.
 */
export function offlineQueueIdentityError(
  command: QueuedDelivery,
  activeMatchId: string,
  activeInningsId: string,
): string | null {
  if (!activeMatchId || !activeInningsId) return 'The active match or innings identity is missing.';
  if (command.matchId !== activeMatchId)
    return 'The queued delivery belongs to a different match or has no verified match identity.';
  if (command.inningsId !== activeInningsId)
    return 'The queued delivery belongs to a different innings.';
  if (command.payload?.inningsId !== activeInningsId)
    return 'The queued delivery payload innings does not match its queue record.';
  return null;
}

function strikeChangingRuns(p: QueuedDelivery['payload']): number {
  switch (p.extraType ?? '') {
    case 'WIDE':
      return Math.max(0, p.extraRuns - 1);
    case 'NO_BALL':
      return p.batRuns + Math.max(0, p.extraRuns - 1);
    case 'BYE':
    case 'LEG_BYE':
      return p.extraRuns;
    case 'PENALTY':
      return 0;
    default:
      return p.batRuns;
  }
}

function bowlerWicket(type: string | null): boolean {
  return !!type && ['BOWLED', 'CAUGHT', 'LBW', 'STUMPED', 'HIT_WICKET'].includes(type);
}

/** Deterministic local projection that mirrors the backend delivery rules for the scorer flow. */
export function projectOfflineDelivery(score: LiveScore, command: QueuedDelivery): LiveScore {
  const p = command.payload;
  if (command.matchId && score.matchId && command.matchId !== score.matchId) {
    throw new Error('The pending delivery belongs to a different match.');
  }
  if (
    command.inningsId !== score.inningsId ||
    score.inningsId !== p.inningsId ||
    score.status !== 'LIVE'
  ) {
    throw new Error('The saved innings is not available for offline scoring.');
  }
  if (p.strikerId !== score.strikerId || p.nonStrikerId !== score.nonStrikerId) {
    throw new Error('The pending delivery does not match the saved batting state.');
  }
  const expectedOver = Math.floor(score.legalBalls / 6);
  const expectedBall = (score.legalBalls % 6) + 1;
  if (p.overNumber !== expectedOver || p.ballNumber !== expectedBall) {
    throw new Error('The pending delivery position does not match the saved innings state.');
  }
  const legal = p.extraType !== 'WIDE' && p.extraType !== 'NO_BALL';
  const oldLegal = score.legalBalls;
  const newLegal = oldLegal + (legal ? 1 : 0);
  const total = p.batRuns + p.extraRuns;
  const newWickets = score.wickets + (p.wicketType ? 1 : 0);
  let striker: string | null = score.strikerId ?? null;
  let nonStriker: string | null = score.nonStrikerId ?? null;
  if (strikeChangingRuns(p) % 2 !== 0) [striker, nonStriker] = [nonStriker, striker];

  const dismissed = p.dismissedPlayerId ?? (p.wicketType ? p.strikerId : null);
  if (p.wicketType) {
    if (newWickets >= 10) {
      if (dismissed === striker) striker = null;
      if (dismissed === nonStriker) nonStriker = null;
    } else {
      if (!p.newBatterId)
        throw new Error('A new batter is required to project this wicket offline.');
      if (dismissed === striker) striker = p.newBatterId;
      if (dismissed === nonStriker) nonStriker = p.newBatterId;
    }
  }
  if (legal && newLegal > 0 && newLegal % 6 === 0 && newWickets < 10) {
    [striker, nonStriker] = [nonStriker, striker];
  }

  const batters = [...(score.batters ?? [])];
  const batterIndex = batters.findIndex((b) => b.playerId === p.strikerId);
  const oldBatter =
    batterIndex >= 0
      ? batters[batterIndex]
      : {
          playerId: p.strikerId,
          runs: 0,
          ballsFaced: 0,
          fours: 0,
          sixes: 0,
          out: false,
        };
  const updatedBatter = {
    ...oldBatter,
    runs: oldBatter.runs + p.batRuns,
    ballsFaced: oldBatter.ballsFaced + (legal ? 1 : 0),
    fours: oldBatter.fours + (p.batRuns === 4 ? 1 : 0),
    sixes: oldBatter.sixes + (p.batRuns === 6 ? 1 : 0),
    out: oldBatter.out || (!!p.wicketType && dismissed === p.strikerId),
    dismissalType:
      p.wicketType && dismissed === p.strikerId ? p.wicketType : oldBatter.dismissalType,
  };
  if (batterIndex >= 0) batters[batterIndex] = updatedBatter;
  else batters.push(updatedBatter);
  if (p.wicketType && dismissed && dismissed !== p.strikerId) {
    const dismissedIndex = batters.findIndex((b) => b.playerId === dismissed);
    if (dismissedIndex >= 0)
      batters[dismissedIndex] = {
        ...batters[dismissedIndex],
        out: true,
        dismissalType: p.wicketType,
      };
    else
      batters.push({
        playerId: dismissed,
        runs: 0,
        ballsFaced: 0,
        fours: 0,
        sixes: 0,
        out: true,
        dismissalType: p.wicketType,
      });
  }
  if (p.newBatterId && !batters.some((b) => b.playerId === p.newBatterId)) {
    batters.push({
      playerId: p.newBatterId,
      runs: 0,
      ballsFaced: 0,
      fours: 0,
      sixes: 0,
      out: false,
    });
  }

  const conceded = ['BYE', 'LEG_BYE'].includes(p.extraType ?? '') ? 0 : total;
  const bowlers = [...(score.bowlers ?? [])];
  const bowlerIndex = bowlers.findIndex((b) => b.playerId === p.bowlerId);
  const oldBowler =
    bowlerIndex >= 0
      ? bowlers[bowlerIndex]
      : {
          playerId: p.bowlerId,
          legalBalls: 0,
          runsConceded: 0,
          wickets: 0,
          wides: 0,
          noBalls: 0,
        };
  const updatedBowler = {
    ...oldBowler,
    legalBalls: oldBowler.legalBalls + (legal ? 1 : 0),
    runsConceded: oldBowler.runsConceded + conceded,
    wickets: oldBowler.wickets + (bowlerWicket(p.wicketType) ? 1 : 0),
    wides: oldBowler.wides + (p.extraType === 'WIDE' ? p.extraRuns : 0),
    noBalls: oldBowler.noBalls + (p.extraType === 'NO_BALL' ? p.extraRuns : 0),
  };
  if (bowlerIndex >= 0) bowlers[bowlerIndex] = updatedBowler;
  else bowlers.push(updatedBowler);

  const overNumber = Math.floor(oldLegal / 6);
  const overs = [...(score.overs ?? [])];
  const overIndex = overs.findIndex((o) => o.overNumber === overNumber);
  const oldOver =
    overIndex >= 0
      ? overs[overIndex]
      : {
          overNumber,
          bowlerId: p.bowlerId,
          runs: 0,
          wickets: 0,
          legalBalls: 0,
          wides: 0,
          noBalls: 0,
          byes: 0,
          legByes: 0,
          completed: false,
        };
  const updatedOver = {
    ...oldOver,
    bowlerId: p.bowlerId,
    runs: oldOver.runs + total,
    wickets: oldOver.wickets + (p.wicketType ? 1 : 0),
    legalBalls: oldOver.legalBalls + (legal ? 1 : 0),
    wides: oldOver.wides + (p.extraType === 'WIDE' ? p.extraRuns : 0),
    noBalls: oldOver.noBalls + (p.extraType === 'NO_BALL' ? p.extraRuns : 0),
    byes: oldOver.byes + (p.extraType === 'BYE' ? p.extraRuns : 0),
    legByes: oldOver.legByes + (p.extraType === 'LEG_BYE' ? p.extraRuns : 0),
    completed: oldOver.legalBalls + (legal ? 1 : 0) >= 6,
  };
  if (overIndex >= 0) overs[overIndex] = updatedOver;
  else overs.push(updatedOver);

  const partnership = p.wicketType
    ? { batterOneId: striker ?? '', batterTwoId: nonStriker ?? '', runs: 0, balls: 0 }
    : score.partnership
      ? {
          ...score.partnership,
          runs: score.partnership.runs + total,
          balls: score.partnership.balls + (legal ? 1 : 0),
        }
      : {
          batterOneId: striker ?? '',
          batterTwoId: nonStriker ?? '',
          runs: total,
          balls: legal ? 1 : 0,
        };

  const ball = {
    deliveryId: command.commandId,
    overNumber,
    ballNumber: Math.floor(oldLegal % 6) + 1,
    strikerId: p.strikerId,
    nonStrikerId: p.nonStrikerId,
    bowlerId: p.bowlerId,
    batRuns: p.batRuns,
    extraRuns: p.extraRuns,
    extraType: p.extraType,
    wicketType: p.wicketType,
    legalDelivery: legal,
    totalRuns: total,
  };
  const recentBalls = [...(score.recentBalls ?? []), ball].slice(-12);
  const fallOfWickets = [...(score.fallOfWickets ?? [])];
  if (p.wicketType && dismissed) {
    fallOfWickets.push({
      wicketNumber: newWickets,
      playerId: dismissed,
      runs: score.runs + total,
      overNumber,
      ballNumber: Math.floor(oldLegal % 6) + 1,
    });
  }
  const completed =
    newWickets >= 10 ||
    (!!score.totalOvers && newLegal >= score.totalOvers * 6) ||
    (!!score.targetRuns && score.inningsNumber === 2 && score.runs + total >= score.targetRuns);
  return {
    ...score,
    runs: score.runs + total,
    wickets: newWickets,
    legalBalls: newLegal,
    currentOver: Math.floor(newLegal / 6),
    currentBall: newLegal % 6,
    strikerId: striker,
    nonStrikerId: nonStriker,
    currentBowlerId: p.bowlerId,
    status: completed ? 'COMPLETED' : 'LIVE',
    batters,
    bowlers,
    overs,
    recentBalls,
    partnership,
    fallOfWickets,
  };
}

/**
 * Network, throttling and server availability failures are retryable.
 * Client/domain errors require scorer reconciliation instead of blind replay.
 */
/** Match an offline command to a server recent-ball record without guessing from totals. */
export function offlineDeliveryMatchesRecentBall(
  command: QueuedDelivery,
  ball: NonNullable<LiveScore['recentBalls']>[number],
): boolean {
  const p = command.payload;
  const legalDelivery = p.legalDelivery ?? (p.extraType !== 'WIDE' && p.extraType !== 'NO_BALL');
  return (
    ball.overNumber === p.overNumber &&
    ball.ballNumber === p.ballNumber &&
    ball.strikerId === p.strikerId &&
    ball.nonStrikerId === p.nonStrikerId &&
    ball.bowlerId === p.bowlerId &&
    ball.batRuns === p.batRuns &&
    ball.extraRuns === p.extraRuns &&
    (ball.extraType || null) === (p.extraType || null) &&
    (ball.wicketType || null) === (p.wicketType || null) &&
    ball.legalDelivery === legalDelivery &&
    ball.totalRuns === p.batRuns + p.extraRuns
  );
}

export function isTransientOfflineSyncStatus(status: unknown): boolean {
  const normalized = Number(status ?? 0);
  return (
    normalized === 0 ||
    normalized === 408 ||
    normalized === 425 ||
    normalized === 429 ||
    (normalized >= 500 && normalized < 600)
  );
}

/**
 * Detect a multi-device fork before replay starts. Two legal deliveries recorded
 * at the same innings position cannot both be valid; retain the entire queue for
 * manual reconciliation rather than syncing one branch and partially merging.
 * Repeated wides/no-balls at the same position remain valid because they do not
 * advance the legal-ball cursor.
 */
/** Return human-readable over.ball positions containing duplicate legal deliveries. */
export function getOfflineQueueConflictPositions(queue: QueuedDelivery[]): string[] {
  const counts = new Map<string, number>();
  for (const command of queue) {
    const p = command.payload;
    const legal = p.legalDelivery ?? (p.extraType !== 'WIDE' && p.extraType !== 'NO_BALL');
    if (!legal) continue;
    const position = `${p.overNumber + 1}.${p.ballNumber}`;
    counts.set(position, (counts.get(position) || 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([position]) => position);
}

export function hasOfflineQueuePositionConflict(queue: QueuedDelivery[]): boolean {
  const legalPositions = new Set<string>();
  for (const command of queue) {
    const p = command.payload;
    const legal = p.legalDelivery ?? (p.extraType !== 'WIDE' && p.extraType !== 'NO_BALL');
    if (!legal) continue;
    const key = `${p.overNumber}:${p.ballNumber}`;
    if (legalPositions.has(key)) return true;
    legalPositions.add(key);
  }
  return false;
}

export interface OfflineQueueRestoreResult {
  score: LiveScore;
  restoredDeliveries: number;
  blocked: boolean;
  error: string | null;
}

/**
 * Restore a pending queue atomically in memory. If any delivery is unsafe,
 * return the untouched snapshot rather than a partially projected score.
 */
export function restoreOfflineQueueProjection(
  snapshot: LiveScore,
  queue: QueuedDelivery[],
  activeMatchId: string,
  activeInningsId: string,
): OfflineQueueRestoreResult {
  if (hasOfflineQueuePositionConflict(queue)) {
    return {
      score: snapshot,
      restoredDeliveries: 0,
      blocked: true,
      error: 'Multiple devices recorded different legal deliveries at the same ball position.',
    };
  }
  if (queue.some((item) => item.syncStatus === 'BLOCKED')) {
    return {
      score: snapshot,
      restoredDeliveries: 0,
      blocked: true,
      error: 'The saved offline queue is marked blocked and requires reconciliation.',
    };
  }

  let projected = snapshot;
  for (const item of queue) {
    const identityError = offlineQueueIdentityError(item, activeMatchId, activeInningsId);
    if (identityError) {
      return { score: snapshot, restoredDeliveries: 0, blocked: true, error: identityError };
    }
    try {
      projected = projectOfflineDelivery(projected, item);
    } catch (error: unknown) {
      return {
        score: snapshot,
        restoredDeliveries: 0,
        blocked: true,
        error:
          error instanceof Error ? error.message : 'Saved offline deliveries need reconciliation.',
      };
    }
  }
  return { score: projected, restoredDeliveries: queue.length, blocked: false, error: null };
}
