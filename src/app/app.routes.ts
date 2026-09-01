import { Routes } from '@angular/router';

import { AccountProfileComponent } from './features/account/pages/profile/account-profile.component';
import { AnalyticsComponent } from './features/analytics/pages/analytics/analytics.component';
import { LeaderboardsComponent } from './features/analytics/pages/leaderboards/leaderboards.component';
import { LoginComponent } from './features/auth/pages/login/login.component';
import { SignupComponent } from './features/auth/pages/signup/signup.component';
import { LiveCenterComponent } from './features/live/pages/live-center/live-center.component';
import { LiveMatchEntryComponent } from './features/live/pages/live-match-entry/live-match-entry.component';
import { LiveScoringV2Component } from './features/live/pages/live-scoring/live-scoring.component';
import { OpeningPlayersComponent } from './features/live/pages/opening-players/opening-players.component';
import { PlayingXiV2Component } from './features/live/pages/playing-xi/playing-xi.component';
import { ScorerComponent } from './features/live/pages/scorer/scorer.component';
import { TossComponent } from './features/live/pages/toss/toss.component';
import { CreateMatchComponent } from './features/matches/pages/create-match/create-match.component';
import { MatchDetailComponent } from './features/matches/pages/match-detail/match-detail.component';
import { MatchesComponent } from './features/matches/pages/match-list/matches.component';
import { MatchResultComponent } from './features/matches/pages/result/match-result.component';
import { MatchScorecardComponent } from './features/matches/pages/scorecard/match-scorecard.component';
import { MatchStatisticsComponent } from './features/matches/pages/statistics/match-statistics.component';
import { PlayerOnboardingComponent } from './features/players/pages/onboarding/player-onboarding.component';
import { PlayerComparisonComponent } from './features/players/pages/player-comparison/player-comparison.component';
import { PlayerFormComponent } from './features/players/pages/player-form/player-form.component';
import { PlayersComponent } from './features/players/pages/player-list/players.component';
import { PlayerProfileComponent } from './features/players/pages/player-profile/player-profile.component';
import { PlayerStatisticsComponent } from './features/players/pages/player-statistics/player-statistics.component';
import { HomeComponent } from './features/public/pages/home/home.component';
import { LandingComponent } from './features/public/pages/landing/landing.component';
import { PublicLiveScoreComponent } from './features/public/pages/live-score/public-live-score.component';
import { SettingsComponent } from './features/settings/pages/settings/settings.component';
import { NotFoundComponent } from './features/system/pages/not-found/not-found.component';
import { NotificationsComponent } from './features/system/pages/notifications/notifications.component';
import { StateGalleryComponent } from './features/system/pages/ui-states/state-gallery.component';
import { BulkTeamPlayersV2Component } from './features/teams/pages/bulk-players/bulk-team-players.component';
import { CreateTeamComponent } from './features/teams/pages/create-team/create-team.component';
import { TeamDetailComponent } from './features/teams/pages/team-detail/team-detail.component';
import { TeamsComponent } from './features/teams/pages/team-list/teams.component';
import { TournamentAnalyticsComponent } from './features/tournaments/pages/analytics/tournament-analytics.component';
import { CreateTournamentComponent } from './features/tournaments/pages/create-tournament/create-tournament.component';
import { TournamentQualificationComponent } from './features/tournaments/pages/qualification/tournament-qualification.component';
import { TournamentScheduleComponent } from './features/tournaments/pages/schedule/tournament-schedule.component';
import { TournamentDetailComponent } from './features/tournaments/pages/tournament-detail/tournament-detail.component';
import { TournamentsComponent } from './features/tournaments/pages/tournament-list/tournaments.component';
import { authGuard } from './core/auth/auth';
import { DashboardComponent } from './layout/dashboard/dashboard.component';

const dashboardChildren: Routes = [
  { path: '', component: HomeComponent },
  { path: 'matches', component: MatchesComponent },
  { path: 'matches/new', component: CreateMatchComponent },
  { path: 'matches/:id/playing-xi', component: PlayingXiV2Component },
  { path: 'matches/:id/toss', component: TossComponent },
  { path: 'matches/:id/opening-players', component: OpeningPlayersComponent },
  { path: 'matches/:id/live-scoring', component: LiveScoringV2Component },
  { path: 'matches/:id/result', component: MatchResultComponent },
  { path: 'matches/:id/scorecard', component: MatchScorecardComponent },
  { path: 'matches/:id/statistics', component: MatchStatisticsComponent },
  { path: 'matches/:id/live', component: LiveMatchEntryComponent },
  { path: 'matches/:id/scorer', component: ScorerComponent },
  { path: 'matches/:id/overview', redirectTo: 'matches/:id', pathMatch: 'full' },
  { path: 'matches/:id', component: MatchDetailComponent },
  { path: 'teams', component: TeamsComponent },
  { path: 'teams/new', component: CreateTeamComponent },
  { path: 'teams/:id/players/bulk', component: BulkTeamPlayersV2Component },
  { path: 'teams/:id', component: TeamDetailComponent },
  { path: 'players/statistics', component: PlayerStatisticsComponent },
  { path: 'players/compare', component: PlayerComparisonComponent },
  { path: 'players/:id/form', component: PlayerFormComponent },
  { path: 'players/:id', component: PlayerProfileComponent },
  { path: 'players', component: PlayersComponent },
  { path: 'player/onboarding', component: PlayerOnboardingComponent },
  { path: 'tournaments/new', component: CreateTournamentComponent },
  { path: 'tournaments/:id/qualification', component: TournamentQualificationComponent },
  { path: 'tournaments/:id/schedule', component: TournamentScheduleComponent },
  { path: 'tournaments/:id/analytics', component: TournamentAnalyticsComponent },
  { path: 'tournaments/:id', component: TournamentDetailComponent },
  { path: 'tournaments', component: TournamentsComponent },
  { path: 'live', component: LiveCenterComponent },
  { path: 'scorer', component: ScorerComponent },
  { path: 'analytics', component: AnalyticsComponent },
  { path: 'leaderboards', component: LeaderboardsComponent },
  { path: 'settings', component: SettingsComponent },
  { path: 'notifications', component: NotificationsComponent },
  { path: 'account', component: AccountProfileComponent },
  { path: 'ui-states', component: StateGalleryComponent },
];

const dashboardRoute = (children: Routes = dashboardChildren) => ({
  component: DashboardComponent,
  canActivate: [authGuard],
  children,
});

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'live/:id', component: PublicLiveScoreComponent },
  { path: 'dashboard', ...dashboardRoute() },
  // Legacy scoring URLs remain as compatibility redirects; all new navigation uses the canonical match lifecycle route.
  { path: 'live-scoring/:id', redirectTo: 'matches/:id/live-scoring', pathMatch: 'full' },
  { path: 'scoring/:id', redirectTo: 'matches/:id/live-scoring', pathMatch: 'full' },
  ...dashboardChildren
    .filter((route) => route.path)
    .map((route) => ({
      path: route.path,
      ...dashboardRoute([{ ...route, path: '' }]),
    })),
  { path: '**', component: NotFoundComponent },
];
