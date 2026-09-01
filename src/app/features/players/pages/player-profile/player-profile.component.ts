import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
interface Player {
  id: string;
  name: string;
  battingStyle: string;
  bowlingStyle: string;
  playingRole: string | null;
  jerseyNumber: number | null;
  city: string | null;
  bio: string | null;
  profilePhotoUrl: string | null;
}
interface MatchPerformance {
  matchId: string;
  matchName: string;
  format: string;
  status: string;
  scheduledAt: string | null;
  completedAt: string | null;
  teamName: string | null;
  opponentName: string | null;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  dismissals: number;
  bowlingBalls: number;
  runsConceded: number;
  wickets: number;
}
interface TrendPoint {
  matchId: string;
  matchName: string;
  playedAt: string | null;
  runs: number;
  wickets: number;
  strikeRate: number;
  economy: number;
}
interface PerformanceTrend {
  points: TrendPoint[];
}
interface Career {
  playerId: string;
  playerName: string;
  matches: number;
  battingInnings: number;
  runs: number;
  highestScore: number;
  dismissals: number;
  fours: number;
  sixes: number;
  battingBalls: number;
  battingAverage: number;
  strikeRate: number;
  bowlingBalls: number;
  runsConceded: number;
  wickets: number;
  bestWickets: number;
  economy: number;
}
@Component({
  selector: 'app-player-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './player-profile.component.html',
  styleUrl: './player-profile.component.scss',
})
export class PlayerProfileComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  readonly api = 'http://localhost:8080/api';
  playerId = this.route.snapshot.paramMap.get('id') || '';
  loading = true;
  player: Player | null = null;
  career: Career = {
    playerId: '',
    playerName: '',
    matches: 0,
    battingInnings: 0,
    runs: 0,
    highestScore: 0,
    dismissals: 0,
    fours: 0,
    sixes: 0,
    battingBalls: 0,
    battingAverage: 0,
    strikeRate: 0,
    bowlingBalls: 0,
    runsConceded: 0,
    wickets: 0,
    bestWickets: 0,
    economy: 0,
  };
  constructor() {
    if (this.playerId) this.load();
    else this.loading = false;
  }
  load() {
    this.http.get<Player>(`${this.api}/players/${this.playerId}`).subscribe({
      next: (p) => {
        this.player = p;
        this.loadCareer();
      },
      error: () => (this.loading = false),
    });
  }
  private loadCareer() {
    this.http.get<Career>(`${this.api}/players/${this.playerId}/statistics`).subscribe({
      next: (s) => {
        this.career = s || this.career;
        this.loading = false;
        this.loadHistory();
        this.loadTrend();
      },
      error: () => {
        this.loading = false;
        this.loadHistory();
        this.loadTrend();
      },
    });
  }
  recentMatches: MatchPerformance[] = [];
  recentLoading = false;
  trend: PerformanceTrend = { points: [] };
  trendLoading = false;
  trendLimit = 10;
  private loadHistory() {
    this.recentLoading = true;
    this.http
      .get<MatchPerformance[]>(`${this.api}/players/${this.playerId}/recent-matches?limit=10`)
      .subscribe({
        next: (r) => {
          this.recentMatches = r || [];
          this.recentLoading = false;
        },
        error: () => (this.recentLoading = false),
      });
  }
  private loadTrend() {
    this.trendLoading = true;
    this.http
      .get<PerformanceTrend>(
        `${this.api}/players/${this.playerId}/performance-trend?limit=${this.trendLimit}`,
      )
      .subscribe({
        next: (r) => {
          this.trend = r || { points: [] };
          this.trendLoading = false;
        },
        error: () => (this.trendLoading = false),
      });
  }
  setTrendLimit(limit: number) {
    this.trendLimit = limit;
    this.loadTrend();
  }
  get maxTrendRuns() {
    return Math.max(1, ...this.trend.points.map((p) => p.runs));
  }
  get maxTrendWickets() {
    return Math.max(1, ...this.trend.points.map((p) => p.wickets));
  }
  chartHeight(value: number, max: number) {
    return Math.max(8, Math.round((value / max) * 100));
  }
  matchDate(match: MatchPerformance) {
    const d = match.completedAt || match.scheduledAt;
    return d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—';
  }
  activeTab: 'overview' | 'analytics' | 'performance' | 'career' = 'overview';
  photoFailed = false;
  copied = false;
  setTab(tab: 'overview' | 'analytics' | 'performance' | 'career') {
    this.activeTab = tab;
  }
  onTabKeydown(event: KeyboardEvent) {
    const tabs: ['overview', 'analytics', 'performance', 'career'] = [
      'overview',
      'analytics',
      'performance',
      'career',
    ];
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let i = tabs.indexOf(this.activeTab);
    if (event.key === 'ArrowRight') i = (i + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') i = (i - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') i = 0;
    else i = tabs.length - 1;
    this.setTab(tabs[i]);
  }
  async copyProfileLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      this.copied = true;
      setTimeout(() => (this.copied = false), 1800);
    } catch {}
  }
  get hasPerformanceData() {
    return this.career.matches > 0 || this.career.runs > 0 || this.career.wickets > 0;
  }
  get achievements() {
    return [
      {
        icon: '◈',
        title: 'First appearance',
        description: 'Play the first recorded match.',
        unlocked: this.career.matches >= 1,
      },
      {
        icon: '↗',
        title: 'Run maker',
        description: 'Reach 100 career runs.',
        unlocked: this.career.runs >= 100,
      },
      {
        icon: '✦',
        title: 'Boundary force',
        description: 'Hit 10 career boundaries.',
        unlocked: this.career.fours + this.career.sixes >= 10,
      },
      {
        icon: '◉',
        title: 'Wicket taker',
        description: 'Take 10 career wickets.',
        unlocked: this.career.wickets >= 10,
      },
      {
        icon: '★',
        title: 'Match experience',
        description: 'Appear in 10 recorded matches.',
        unlocked: this.career.matches >= 10,
      },
      {
        icon: '⌁',
        title: 'Scoring pace',
        description: 'Maintain a 100+ strike rate.',
        unlocked: this.career.strikeRate >= 100,
      },
    ];
  }
  get battingImpact() {
    return Math.min(100, Math.round((this.career.strikeRate || 0) / 2));
  }
  get bowlingImpact() {
    return Math.min(100, Math.round((this.career.wickets || 0) * 8));
  }
  get boundaryImpact() {
    return Math.min(100, Math.round(((this.career.fours || 0) + (this.career.sixes || 0) * 2) * 4));
  }
  get careerInsightTitle() {
    return this.career.runs >= this.career.wickets * 25
      ? 'Batting is the primary impact'
      : 'Bowling is the primary impact';
  }
  get careerInsight() {
    return this.career.runs >= this.career.wickets * 25
      ? 'The career profile currently shows stronger contribution with the bat, supported by scoring rate and boundary output.'
      : 'The career profile currently shows a stronger bowling influence, driven by wicket-taking contribution and economy.';
  }
  get initials() {
    return (this.player?.name || 'P')
      .split(' ')
      .map((x) => x[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }
  get roleLabel() {
    return (this.player?.playingRole || 'PLAYER').replaceAll('_', ' ');
  }
  get battingSummary() {
    return `${this.career.runs} runs at ${this.format(this.career.strikeRate)} strike rate`;
  }
  get bowlingSummary() {
    return `${this.career.wickets} wickets at ${this.format(this.career.economy)} economy across ${this.overs(this.career.bowlingBalls)} overs.`;
  }
  styleLabel(v: string) {
    return (v || '')
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/\b\w/g, (x) => x.toUpperCase());
  }
  format(v: number) {
    return Number(v || 0).toFixed(2);
  }
  overs(balls: number) {
    return `${Math.floor((balls || 0) / 6)}.${(balls || 0) % 6}`;
  }
}
