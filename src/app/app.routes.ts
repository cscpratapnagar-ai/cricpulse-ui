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
import { ScorerComponent } from './scorer.component';
import { TeamsComponent } from './teams.component';
import { CreateMatchComponent } from './create-match.component';
import { PublicLiveScoreComponent } from './public-live-score.component';
import { TeamDetailComponent } from './team-detail.component';
import { PlayingXiV2Component } from './playing-xi-v2.component';
import { BulkTeamPlayersV2Component } from './bulk-team-players-v2.component';
import { TossComponent } from './toss.component';

const modulePage = (title: string, description: string) => ({ component: ModulePageComponent, data: { title, description } });

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'live/:id', component: PublicLiveScoreComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard], children: [
      { path: '', component: HomeComponent },
      { path: 'matches', component: MatchesComponent },
      { path: 'matches/new', component: CreateMatchComponent },
      { path: 'matches/:id/playing-xi', component: PlayingXiV2Component },
      { path: 'matches/:id/toss', component: TossComponent },
      { path: 'matches/:id/live', component: LiveCenterComponent },
      { path: 'matches/:id/scorer', component: ScorerComponent },
      { path: 'matches/:id', component: MatchDetailComponent },
      { path: 'live', component: LiveCenterComponent },
      { path: 'scorer', component: ScorerComponent },
      { path: 'teams', component: TeamsComponent },
      { path: 'teams/:id', component: TeamDetailComponent },
      { path: 'teams/:id/players/bulk', component: BulkTeamPlayersV2Component },
      { path: 'players', ...modulePage('Players', 'Build player profiles, track roles, and manage team membership.') },
      { path: 'tournaments', ...modulePage('Tournaments', 'Organize leagues, fixtures, points tables, and knockout stages.') },
      { path: 'analytics', ...modulePage('Analytics', 'Turn scorecards into performance insights for players and teams.') },
      { path: 'leaderboards', ...modulePage('Leaderboards', 'Compare form, rankings, batting, bowling, and tournament performance.') },
      { path: 'settings', ...modulePage('Settings', 'Manage your profile, workspace preferences, and notifications.') },
      { path: 'teams/new', component: CreateTeamComponent },
      { path: 'player/onboarding', component: PlayerOnboardingComponent }
    ] },
  { path: 'matches', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: MatchesComponent }] },
  { path: 'matches/new', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: CreateMatchComponent }] },
  { path: 'matches/:id/playing-xi', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: PlayingXiV2Component }] },
  { path: 'matches/:id/toss', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: TossComponent }] },
  { path: 'matches/:id/live', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: LiveCenterComponent }] },
  { path: 'matches/:id/scorer', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: ScorerComponent }] },
  { path: 'matches/:id', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: MatchDetailComponent }] },
  { path: 'live', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: LiveCenterComponent }] },
  { path: 'scorer', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: ScorerComponent }] },
  { path: 'teams', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: TeamsComponent }] },
  { path: 'teams/new', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: CreateTeamComponent }] },
  { path: 'teams/:id/players/bulk', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: BulkTeamPlayersV2Component }] },
  { path: 'players', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', ...modulePage('Players', 'Build player profiles, track roles, and manage team membership.') }] },
  { path: 'tournaments', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', ...modulePage('Tournaments', 'Organize leagues, fixtures, points tables, and knockout stages.') }] },
  { path: 'analytics', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', ...modulePage('Analytics', 'Turn scorecards into performance insights for players and teams.') }] },
  { path: 'leaderboards', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', ...modulePage('Leaderboards', 'Compare form, rankings, batting, bowling, and tournament performance.') }] },
  { path: 'settings', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', ...modulePage('Settings', 'Manage your profile, workspace preferences, and notifications.') }] },
  { path: 'player/onboarding', component: DashboardComponent, canActivate: [authGuard], children: [{ path: '', component: PlayerOnboardingComponent }] },
  { path: '**', redirectTo: '' }
];
