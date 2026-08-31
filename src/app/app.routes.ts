import { Routes } from '@angular/router';
import { LandingComponent } from './landing.component';
import { LoginComponent } from './login.component';
import { SignupComponent } from './signup.component';
import { DashboardComponent } from './dashboard.component';
import { HomeComponent } from './home.component';
import { authGuard } from './auth';
import { CreateTeamComponent } from './create-team.component';
import { PlayerOnboardingComponent } from './player-onboarding.component';
import { ModulePageComponent } from './module-page.component';
import { MatchesComponent } from './matches.component';
import { MatchDetailComponent } from './match-detail.component';
import { LiveCenterComponent } from './live-center.component';
import { LiveMatchEntryComponent } from './live-match-entry.component';
import { ScorerComponent } from './scorer.component';
import { LiveScoringV2Component } from './live-scoring-v2.component';
import { TeamsComponent } from './teams.component';
import { CreateMatchComponent } from './create-match.component';
import { PublicLiveScoreComponent } from './public-live-score.component';
import { TeamDetailComponent } from './team-detail.component';
import { PlayingXiV2Component } from './playing-xi-v2.component';
import { BulkTeamPlayersV2Component } from './bulk-team-players-v2.component';
import { TossComponent } from './toss.component';
import { OpeningPlayersComponent } from './opening-players.component';
import { MatchResultComponent } from './match-result.component';
import { MatchScorecardComponent } from './match-scorecard.component';
import { MatchStatisticsComponent } from './match-statistics.component';
import { PlayerStatisticsComponent } from './player-statistics.component';
import { PlayerProfileComponent } from './player-profile.component';
import { PlayerFormComponent } from './player-form.component';
import { PlayerComparisonComponent } from './player-comparison.component';
import { TournamentsComponent } from './tournaments.component';
import { TournamentDetailComponent } from './tournament-detail.component';
import { TournamentScheduleComponent } from './tournament-schedule.component';
import { TournamentQualificationComponent } from './tournament-qualification.component';
import { TournamentAnalyticsComponent } from './tournament-analytics.component';
import { LeaderboardsComponent } from './leaderboards.component';
import { AnalyticsComponent } from './analytics.component';
import { PlayersComponent } from './players.component';
import { SettingsComponent } from './settings.component';
import { NotificationsComponent } from './notifications.component';
const modulePage = (title: string, description: string) => ({ component: ModulePageComponent, data: { title, description } });
export const routes: Routes = [
  { path: '', component: LandingComponent }, { path: 'login', component: LoginComponent }, { path: 'signup', component: SignupComponent }, { path: 'live/:id', component: PublicLiveScoreComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard], children: [
    { path: '', component: HomeComponent }, { path: 'matches', component: MatchesComponent }, { path: 'matches/new', component: CreateMatchComponent }, { path: 'matches/:id/playing-xi', component: PlayingXiV2Component }, { path: 'matches/:id/toss', component: TossComponent }, { path: 'matches/:id/opening-players', component: OpeningPlayersComponent }, { path: 'matches/:id/live-scoring', component: LiveScoringV2Component }, { path: 'matches/:id/result', component: MatchResultComponent }, { path: 'matches/:id/scorecard', component: MatchScorecardComponent }, { path: 'matches/:id/statistics', component: MatchStatisticsComponent }, { path: 'matches/:id/live', component: LiveMatchEntryComponent }, { path: 'matches/:id/scorer', component: ScorerComponent }, { path: 'matches/:id/overview', component: MatchDetailComponent }, { path: 'matches/:id', component: MatchDetailComponent },
    { path: 'teams', component: TeamsComponent }, { path: 'teams/new', component: CreateTeamComponent }, { path: 'teams/:id/players/bulk', component: BulkTeamPlayersV2Component }, { path: 'teams/:id', component: TeamDetailComponent }, { path: 'players/statistics', component: PlayerStatisticsComponent }, { path: 'players/compare', component: PlayerComparisonComponent }, { path: 'players/:id/form', component: PlayerFormComponent }, { path: 'players/:id', component: PlayerProfileComponent }, { path: 'players', component: PlayersComponent }, { path: 'tournaments/:id/qualification', component: TournamentQualificationComponent }, { path: 'tournaments/:id/schedule', component: TournamentScheduleComponent }, { path: 'tournaments/:id/analytics', component: TournamentAnalyticsComponent }, { path: 'tournaments/:id', component: TournamentDetailComponent }, { path: 'tournaments', component: TournamentsComponent }, { path: 'analytics', component: AnalyticsComponent }, { path: 'leaderboards', component: LeaderboardsComponent }, { path: 'settings', component: SettingsComponent }, { path: 'notifications', component: NotificationsComponent }, { path: 'player/onboarding', component: PlayerOnboardingComponent }
  ]},
  // Direct Live Scoring V2 entry points. Keep the canonical match route while allowing deep links from dashboards, notifications and external workflows.
  { path: 'live-scoring/:id', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: LiveScoringV2Component }] },
  { path: 'scoring/:id', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: LiveScoringV2Component }] },
  { path: 'matches', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: MatchesComponent }] }, { path: 'matches/new', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: CreateMatchComponent }] }, { path: 'matches/:id/playing-xi', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: PlayingXiV2Component }] }, { path: 'matches/:id/toss', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: TossComponent }] }, { path: 'matches/:id/opening-players', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: OpeningPlayersComponent }] }, { path: 'matches/:id/live-scoring', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: LiveScoringV2Component }] }, { path: 'matches/:id/result', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: MatchResultComponent }] }, { path: 'matches/:id/scorecard', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: MatchScorecardComponent }] }, { path: 'matches/:id/statistics', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: MatchStatisticsComponent }] }, { path: 'matches/:id/live', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: LiveMatchEntryComponent }] }, { path: 'matches/:id/scorer', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: ScorerComponent }] }, { path: 'matches/:id/overview', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: MatchDetailComponent }] }, { path: 'matches/:id', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: MatchDetailComponent }] },
  { path: 'players/statistics', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: PlayerStatisticsComponent }] }, { path: 'players/compare', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: PlayerComparisonComponent }] }, { path: 'players/:id/form', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: PlayerFormComponent }] }, { path: 'players/:id', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: PlayerProfileComponent }] }, { path: 'tournaments/:id/qualification', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: TournamentQualificationComponent }] }, { path: 'tournaments/:id/schedule', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: TournamentScheduleComponent }] }, { path: 'tournaments/:id/analytics', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: TournamentAnalyticsComponent }] }, { path: 'tournaments/:id', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: TournamentDetailComponent }] }, { path: 'tournaments', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: TournamentsComponent }] }, { path: 'live', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: LiveCenterComponent }] }, { path: 'scorer', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: ScorerComponent }] }, { path: 'teams', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: TeamsComponent }] }, { path: 'teams/new', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: CreateTeamComponent }] }, { path: 'teams/:id/players/bulk', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: BulkTeamPlayersV2Component }] }, { path: 'teams/:id', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: TeamDetailComponent }] }, { path: 'players', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: PlayersComponent }] }, { path: 'analytics', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: AnalyticsComponent }] }, { path: 'leaderboards', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: LeaderboardsComponent }] }, { path: 'settings', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: SettingsComponent }] }, { path: 'notifications', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: NotificationsComponent }] }, { path: 'player/onboarding', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: PlayerOnboardingComponent }] }, { path: '**', redirectTo: '' }
];
