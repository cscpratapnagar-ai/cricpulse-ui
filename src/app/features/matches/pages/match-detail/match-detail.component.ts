import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { API_BASE_URL } from '../../../../core/config/api.config';
import { ActivatedRoute, RouterLink } from '@angular/router';

interface Match {
  id: string;
  name: string;
  format: string;
  status: string;
  scheduledAt?: string;
  teamAId: string;
  teamBId: string;
  teamAName?: string;
  teamBName?: string;
}

interface TacticalInsight {
  title: string;
  signal: string;
  explanation: string;
  tone: 'positive' | 'caution' | 'neutral';
}

interface Matchup {
  batterId: string;
  batterName: string;
  bowlerId: string;
  bowlerName: string;
  ballsFaced: number;
  runs: number;
  fours: number;
  sixes: number;
  dotBalls: number;
  dismissals: number;
  strikeRate: number;
  dotBallPercentage: number;
  sampleLabel: 'EARLY SAMPLE' | 'ESTABLISHED SAMPLE';
}

interface PhaseSummary {
  inningsNumber: number;
  battingTeam: string;
  format: string;
  phase: 'POWERPLAY' | 'MIDDLE' | 'DEATH';
  runs: number;
  wickets: number;
  legalBalls: number;
  dotBalls: number;
  fours: number;
  sixes: number;
  oversCovered: number;
  fromOver: number;
  toOver: number;
  runRate: number;
  dotBallPercentage: number;
  sampleLabel: 'LIMITED SAMPLE' | 'EARLY SAMPLE' | 'RECORDED SAMPLE';
}

interface PhaseInningsGroup {
  inningsNumber: number;
  battingTeam: string;
  phases: PhaseSummary[];
}

interface Partnership {
  inningsNumber: number;
  battingTeam: string;
  partnershipNumber: number;
  batterOneId: string;
  batterOneName: string;
  batterTwoId: string;
  batterTwoName: string;
  runs: number;
  balls: number;
  batterOneRuns: number;
  batterTwoRuns: number;
  startOver: number;
  startBall: number;
  endOver: number;
  endBall: number;
  current: boolean;
  sampleLabel: 'EARLY SAMPLE' | 'ESTABLISHED SAMPLE';
}

interface BowlerOverFigure {
  overNumber: number;
  legalBalls: number;
  runsConceded: number;
  wickets: number;
  maiden: boolean;
}

interface BowlerWicketEvent {
  overNumber: number;
  ballNumber: number;
  dismissal: string;
  dismissedBatter: string;
  creditedToBowler: boolean;
}

interface BowlerSpell {
  inningsNumber: number;
  battingTeam: string;
  bowlerId: string;
  bowlerName: string;
  legalBalls: number;
  overs: string;
  runsConceded: number;
  wickets: number;
  economy: number;
  maidens: number;
  wides: number;
  noBalls: number;
  oversBreakdown: BowlerOverFigure[];
  wicketBreakdown: BowlerWicketEvent[];
}

interface FielderContribution {
  inningsNumber: number;
  bowlingTeam: string;
  fielderId: string;
  fielderName: string;
  catches: number;
  runOuts: number;
  stumpings: number;
  totalDismissalContributions: number;
}

interface MatchIntelligence {
  inningsNumber: number;
  battingTeam: string;
  status: string;
  runs: number;
  wickets: number;
  legalBalls: number;
  totalOvers: number;
  inningsRunRate: number;
  recentRuns: number;
  recentDeliveries: number;
  recentDots: number;
  recentFours: number;
  recentSixes: number;
  recentWickets: number;
  recentRunRate: number;
  momentum: string;
  momentumScore: number;
  projectedScore: number | null;
  pressureIndex: number;
  collapseRisk: number;
  requiredRuns: number | null;
  ballsRemaining: number | null;
  requiredRate: number | null;
  chasePressure: string;
}

@Component({
  selector: 'app-match-detail',
  standalone: true,
  imports: [DecimalPipe, RouterLink],
  templateUrl: './match-detail.component.html',
  styleUrl: './match-detail.component.scss',
})
export class MatchDetailComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly api = API_BASE_URL;
  loading = true;
  error = '';
  intelligenceLoading = false;
  intelligence: MatchIntelligence | null = null;
  matchups: Matchup[] = [];
  matchupsLoading = false;
  matchupsError = false;
  phaseAnalysis: PhaseSummary[] = [];
  phaseAnalysisLoading = false;
  phaseAnalysisError = false;
  partnerships: Partnership[] = [];
  partnershipsLoading = false;
  partnershipsError = false;
  bowlingSpells: BowlerSpell[] = [];
  bowlingSpellsLoading = false;
  bowlingSpellsError = false;
  fieldingAnalysis: FielderContribution[] = [];
  fieldingAnalysisLoading = false;
  fieldingAnalysisError = false;
  match: Match | null = null;

  constructor() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading = false;
      return;
    }
    this.http.get<Match>(`${this.api}/matches/${id}`).subscribe({
      next: (match) => {
        this.match = match;
        this.loading = false;
        this.loadIntelligence(id);
        this.loadMatchups(id);
        this.loadPhaseAnalysis(id);
        this.loadPartnerships(id);
        this.loadBowlingSpells(id);
        this.loadFieldingAnalysis(id);
        if (match.status === 'LIVE') {
          interval(10000)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
              this.loadBowlingSpells(id);
              this.loadFieldingAnalysis(id);
            });
        }
      },
      error: () => {
        this.match = null;
        this.error = 'Match details could not be loaded. Please try again.';
        this.loading = false;
      },
    });
  }

  private loadIntelligence(matchId: string): void {
    this.intelligenceLoading = true;
    this.http.get<MatchIntelligence>(`${this.api}/matches/${matchId}/intelligence`).subscribe({
      next: (value) => {
        this.intelligence = value;
        this.intelligenceLoading = false;
      },
      error: () => {
        this.intelligence = null;
        this.intelligenceLoading = false;
      },
    });
  }

  private loadMatchups(matchId: string): void {
    this.matchupsLoading = true;
    this.matchupsError = false;
    this.http.get<Matchup[]>(`${this.api}/matches/${matchId}/matchups`).subscribe({
      next: (value) => {
        this.matchups = Array.isArray(value) ? value : [];
        this.matchupsLoading = false;
      },
      error: () => {
        this.matchups = [];
        this.matchupsError = true;
        this.matchupsLoading = false;
      },
    });
  }

  private loadPhaseAnalysis(matchId: string): void {
    this.phaseAnalysisLoading = true;
    this.phaseAnalysisError = false;
    this.http.get<PhaseSummary[]>(`${this.api}/matches/${matchId}/phase-analysis`).subscribe({
      next: (value) => {
        this.phaseAnalysis = Array.isArray(value) ? value : [];
        this.phaseAnalysisLoading = false;
      },
      error: () => {
        this.phaseAnalysis = [];
        this.phaseAnalysisError = true;
        this.phaseAnalysisLoading = false;
      },
    });
  }

  private loadPartnerships(matchId: string): void {
    this.partnershipsLoading = true;
    this.partnershipsError = false;
    this.http.get<Partnership[]>(`${this.api}/matches/${matchId}/partnerships`).subscribe({
      next: (value) => {
        this.partnerships = Array.isArray(value) ? value : [];
        this.partnershipsLoading = false;
      },
      error: () => {
        this.partnerships = [];
        this.partnershipsError = true;
        this.partnershipsLoading = false;
      },
    });
  }

  private loadBowlingSpells(matchId: string): void {
    if (this.bowlingSpellsLoading) return;
    this.bowlingSpellsLoading = true;
    this.bowlingSpellsError = false;
    this.http.get<BowlerSpell[]>(`${this.api}/matches/${matchId}/bowling-spells`).subscribe({
      next: (value) => {
        this.bowlingSpells = Array.isArray(value) ? value : [];
        this.bowlingSpellsLoading = false;
      },
      error: () => {
        this.bowlingSpells = [];
        this.bowlingSpellsError = true;
        this.bowlingSpellsLoading = false;
      },
    });
  }

  private loadFieldingAnalysis(matchId: string): void {
    if (this.fieldingAnalysisLoading) return;
    this.fieldingAnalysisLoading = true;
    this.fieldingAnalysisError = false;
    this.http.get<FielderContribution[]>(`${this.api}/matches/${matchId}/fielding-analysis`).subscribe({
      next: (value) => {
        this.fieldingAnalysis = Array.isArray(value) ? value : [];
        this.fieldingAnalysisLoading = false;
      },
      error: () => {
        this.fieldingAnalysis = [];
        this.fieldingAnalysisError = true;
        this.fieldingAnalysisLoading = false;
      },
    });
  }

  dismissalLabel(value: string): string {
    return value.replaceAll('_', ' ');
  }

  phaseInnings(): PhaseInningsGroup[] {
    const groups = new Map<number, PhaseInningsGroup>();
    for (const phase of this.phaseAnalysis) {
      let group = groups.get(phase.inningsNumber);
      if (!group) {
        group = {
          inningsNumber: phase.inningsNumber,
          battingTeam: phase.battingTeam,
          phases: [],
        };
        groups.set(phase.inningsNumber, group);
      }
      group.phases.push(phase);
    }
    return Array.from(groups.values()).sort((a, b) => a.inningsNumber - b.inningsNumber);
  }

  phaseLabel(phase: PhaseSummary['phase']): string {
    if (phase === 'POWERPLAY') return 'Powerplay';
    if (phase === 'MIDDLE') return 'Middle overs';
    return 'Death overs';
  }

  phaseTone(phase: PhaseSummary['phase']): string {
    return phase.toLowerCase();
  }

  intelligenceTone(value: number): string {
    if (value >= 75) return 'high';
    if (value >= 45) return 'mid';
    return 'low';
  }

  pressureLabel(value: number): string {
    if (value >= 70) return 'HIGH';
    if (value >= 45) return 'WATCH';
    return 'LOW';
  }

  collapseLabel(value: number): string {
    if (value >= 70) return 'CRITICAL';
    if (value >= 45) return 'WATCH';
    return 'STABLE';
  }

  momentumTone(value: string): string {
    return value.toLowerCase();
  }

  intelligenceSignal(): string {
    const value = this.intelligence;
    if (!value) return 'Waiting for live scoring data.';
    if (value.collapseRisk >= 70)
      return 'Collapse warning: recent wickets and dot-ball pressure are elevated.';
    if (value.pressureIndex >= 70)
      return 'High pressure phase: the current run rate needs a strong response.';
    if (value.momentumScore >= 75)
      return 'Momentum is accelerating based on the recent scoring phase.';
    if (value.momentumScore <= 35) return 'Momentum has softened across the recent scoring phase.';
    return 'Match conditions are currently balanced across the latest recorded phase.';
  }

  tacticalInsights(): TacticalInsight[] {
    const value = this.intelligence;
    if (!value) return [];

    const isChase = value.requiredRuns !== null && value.requiredRate !== null;
    const battingSignal = isChase
      ? value.requiredRate! > value.recentRunRate + 2
        ? 'Scoring acceleration needed'
        : value.requiredRate! > value.recentRunRate
          ? 'Build scoring pressure'
          : 'Rate is currently manageable'
      : value.projectedScore !== null
        ? `Pace indicator: ${value.projectedScore} runs`
        : 'More scoring data needed';
    const battingExplanation = isChase
      ? value.requiredRate! > value.recentRunRate + 2
        ? 'The required rate is more than two runs per over above the recent rate. Boundary options and strike rotation both matter.'
        : value.requiredRate! > value.recentRunRate
          ? 'The required rate is above the recent rate. Keep the innings moving and avoid allowing dot-ball clusters to build.'
          : 'The recent scoring rate is meeting the chase demand. Preserve wickets while maintaining the current tempo.'
      : value.projectedScore !== null
        ? 'This is a pace-based projection using the recent scoring rate, not a guaranteed final score.'
        : 'A projection will become available after enough legal deliveries are recorded.';
    const battingTone: TacticalInsight['tone'] =
      isChase && value.requiredRate! > value.recentRunRate + 2 ? 'caution' : 'neutral';

    const bowlingSignal =
      value.recentWickets >= 2
        ? 'Recent wickets create an opportunity'
        : value.recentDots >= 5
          ? 'Dot-ball pressure is building'
          : value.recentFours + value.recentSixes >= 3
            ? 'Boundary control is the priority'
            : 'Stay disciplined';
    const bowlingExplanation =
      value.recentWickets >= 2
        ? 'Two or more wickets have fallen in the recent sample. Keep plans simple and make the incoming batter earn the scoring options.'
        : value.recentDots >= 5
          ? 'At least five dot deliveries appear in the recent sample. Maintain line and length rather than forcing a risky change.'
          : value.recentFours + value.recentSixes >= 3
            ? 'The recent sample contains several boundaries. Review the scoring areas and adjust line, length or field with the captain.'
            : 'The recent sample does not show a dominant wicket or boundary pattern. Continue executing the current plan.';
    const bowlingTone: TacticalInsight['tone'] =
      value.recentWickets >= 2 || value.recentDots >= 5
        ? 'positive'
        : value.recentFours + value.recentSixes >= 3
          ? 'caution'
          : 'neutral';

    const pressureSignal =
      value.collapseRisk >= 70
        ? 'High wicket-risk signal'
        : value.pressureIndex >= 70
          ? 'High pressure signal'
          : value.momentumScore >= 75
            ? 'Momentum favours the batting side'
            : value.momentumScore <= 35
              ? 'Momentum has softened'
              : 'No dominant pressure signal';
    const pressureExplanation =
      value.collapseRisk >= 70
        ? 'The recent wicket and dot-ball indicators are elevated. Protect the next partnership and reduce avoidable risk.'
        : value.pressureIndex >= 70
          ? 'The current pressure indicators are elevated. Reassess the required rate, wickets in hand and recent scoring pattern together.'
          : value.momentumScore >= 75
            ? 'Recent scoring indicators are strong. The bowling side may need to interrupt rhythm with a clear field and bowling plan.'
            : value.momentumScore <= 35
              ? 'Recent scoring indicators have slowed. Rotate strike and look for low-risk scoring options.'
              : 'Current indicators are relatively balanced. Re-evaluate after the next meaningful scoring phase.';

    return [
      {
        title: 'Batting approach',
        signal: battingSignal,
        explanation: battingExplanation,
        tone: battingTone,
      },
      {
        title: 'Bowling opportunity',
        signal: bowlingSignal,
        explanation: bowlingExplanation,
        tone: bowlingTone,
      },
      {
        title: 'Match pressure',
        signal: pressureSignal,
        explanation: pressureExplanation,
        tone: value.collapseRisk >= 70 || value.pressureIndex >= 70 ? 'caution' : 'neutral',
      },
    ];
  }

  intelligenceSampleLabel(): string {
    const count = this.intelligence?.recentDeliveries ?? 0;
    return count >= 8 ? 'RECENT SAMPLE' : 'LIMITED SAMPLE';
  }

  displayMatchTitle(value?: string): string {
    const title = value?.trim();
    return title || 'Match overview';
  }

  displayDate(value?: string): string {
    if (!value) return 'Schedule pending';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }
}
