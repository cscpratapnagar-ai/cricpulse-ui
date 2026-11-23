import { HttpClient, HttpContext } from '@angular/common/http';
import { Component, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, catchError, of } from 'rxjs';
import { API_ORIGIN } from '../../../../core/config/api.config';
import { SKIP_GLOBAL_LOADING } from '../../../../core/interceptors/loading.interceptor';
import { LiveScore, LiveScoreService } from '../../../../core/services/live-score.service';
import { ObsConnectionState, ObsScene, ObsWebSocketService } from '../../services/obs-websocket.service';

type ScenePresetKey = 'main' | 'score' | 'camera' | 'break';

type AutomationEvent =
  | 'FOUR'
  | 'SIX'
  | 'WICKET'
  | 'OVER_COMPLETE'
  | 'MILESTONE'
  | 'INNINGS_BREAK'
  | 'RESULT';

interface AutomationRule {
  event: AutomationEvent;
  label: string;
  sceneName: string;
  enabled: boolean;
  priority: number;
  cooldownSeconds: number;
}

interface AutomationFeedState {
  match: { status?: string; name?: string; currentInningsId?: string | null };
  innings: Array<{ score: ObsAutomationScore }>;
}

interface AutomationScoreMessage {
  source?: string;
  matchId?: string;
  score?: ObsAutomationScore;
  match?: { status?: string; resultText?: string | null; name?: string };
}

interface ObsAutomationScore {
  inningsId: string;
  runs: number;
  wickets: number;
  legalBalls: number;
  status?: string;
  eventVersion?: number;
  eventId?: string;
  sequenceNo?: number;
  recentBalls?: Array<{
    deliveryId: string;
    totalRuns: number;
    legalDelivery: boolean;
    wicketType?: string | null;
  }>;
}

interface AutomationProfile {
  id: string;
  name: string;
  rules: AutomationRule[];
  returnScene: string;
  returnDelay: number;
}

interface ScenePreset {
  key: ScenePresetKey;
  label: string;
  sceneName: string;
}

@Component({
  selector: 'app-obs-scene-controller',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './obs-scene-controller.component.html',
  styleUrl: './obs-scene-controller.component.scss',
})
export class ObsSceneControllerComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  readonly obs = inject(ObsWebSocketService);
  private readonly http = inject(HttpClient);
  private readonly liveScore = inject(LiveScoreService);
  private readonly obsSubscriptions = new Subscription();
  readonly matchId = this.route.snapshot.paramMap.get('id') || '';
  protocol: 'ws' | 'wss' = 'ws';
  host = '127.0.0.1';
  port = '4455';
  password = '';
  scenes: ObsScene[] = [];
  currentScene = '';
  selectedScene = '';
  connecting = false;
  connectionState: ObsConnectionState = 'DISCONNECTED';
  switching = false;
  error = '';
  notice = '';

  readonly presetLabels: Record<ScenePresetKey, string> = {
    main: 'Main Broadcast',
    score: 'Scoreboard',
    camera: 'Camera',
    break: 'Break / Interval',
  };
  presets: ScenePreset[] = Object.entries(this.presetLabels).map(([key, label]) => ({
    key: key as ScenePresetKey,
    label,
    sceneName: '',
  }));
  favoriteSceneNames: string[] = [];
  private readonly preferencesKey = `cricpulse.obs-scene-presets.${this.matchId}`;
  automationEnabled = false;
  automationReturnScene = '';
  automationReturnDelay = 8;
  automationStatus = 'Automation is off.';
  automationProfiles: AutomationProfile[] = [];
  activeAutomationProfileId = '';
  newAutomationProfileName = '';
  automationRules: AutomationRule[] = [
    {
      event: 'FOUR',
      label: 'Four',
      sceneName: '',
      enabled: true,
      priority: 70,
      cooldownSeconds: 3,
    },
    { event: 'SIX', label: 'Six', sceneName: '', enabled: true, priority: 80, cooldownSeconds: 3 },
    {
      event: 'WICKET',
      label: 'Wicket',
      sceneName: '',
      enabled: true,
      priority: 100,
      cooldownSeconds: 5,
    },
    {
      event: 'OVER_COMPLETE',
      label: 'Over complete',
      sceneName: '',
      enabled: true,
      priority: 40,
      cooldownSeconds: 2,
    },
    {
      event: 'MILESTONE',
      label: 'Milestone',
      sceneName: '',
      enabled: true,
      priority: 50,
      cooldownSeconds: 5,
    },
    {
      event: 'INNINGS_BREAK',
      label: 'Innings break',
      sceneName: '',
      enabled: true,
      priority: 90,
      cooldownSeconds: 10,
    },
    {
      event: 'RESULT',
      label: 'Match result',
      sceneName: '',
      enabled: true,
      priority: 100,
      cooldownSeconds: 10,
    },
  ];
  private automationChannel?: BroadcastChannel;
  private automationRelay?: WebSocket;
  private automationRelayReconnect?: ReturnType<typeof setTimeout>;
  private automationRelayDelay = 1000;
  private automationScoreSubscription?: Subscription;
  private automationPollTimer?: ReturnType<typeof setInterval>;
  private automationFeedInFlight = false;
  private automationWatchedInningsId = '';
  private automationReturnTimer?: ReturnType<typeof setTimeout>;
  private automationBaseScene = '';
  private automationTransitionVersion = 0;
  private automationSwitchQueue: Promise<void> = Promise.resolve();
  private previousAutomationScore: ObsAutomationScore | null = null;
  private previousAutomationMatchStatus = '';
  private readonly processedAutomationEvents = new Set<string>();
  private readonly automationLastTriggeredAt = new Map<AutomationEvent, number>();

  constructor() {
    this.loadPreferences();
    if (this.automationEnabled) this.startAutomationFeeds();
    this.obsSubscriptions.add(
      this.obs.connectionState$.subscribe((state) => {
        this.connectionState = state;
        if (state === 'RECONNECTING') {
          this.connecting = false;
          this.notice = 'OBS connection lost. Reconnecting automatically…';
        }
      }),
    );
    this.obsSubscriptions.add(
      this.obs.reconnected$.subscribe((scenes) => {
        this.scenes = scenes;
        this.reconcilePreferences();
        void this.obs.currentScene().then((scene) => {
          this.currentScene = scene;
          this.selectedScene = scene;
          this.error = '';
          this.notice = 'OBS connection restored. Scene control is ready.';
        }).catch((error: unknown) => {
          this.error = error instanceof Error ? error.message : 'OBS reconnected, but scene state could not be loaded.';
        });
      }),
    );
    this.obsSubscriptions.add(
      this.obs.sceneChanged$.subscribe((sceneName) => {
        this.currentScene = sceneName;
        this.selectedScene = sceneName;
        this.notice = `OBS program scene changed to “${sceneName}”.`;
      }),
    );
    this.obsSubscriptions.add(
      this.obs.connectionLost$.subscribe((message) => {
        this.error = message;
        this.notice = '';
        this.connecting = false;
        this.switching = false;
        this.invalidateAutomationTransitions();
      }),
    );
  }

  get connectionUrl(): string {
    return `${this.protocol}://${this.host.trim() || '127.0.0.1'}:${this.port.trim() || '4455'}`;
  }

  async connect(): Promise<void> {
    if (this.connecting) return;
    this.error = '';
    this.notice = '';
    this.connecting = true;
    try {
      this.scenes = await this.obs.connect(this.connectionUrl, this.password);
      this.reconcilePreferences();
      this.currentScene = await this.obs.currentScene();
      this.selectedScene = this.currentScene;
      this.notice = `Connected · ${this.scenes.length} scenes found`;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Could not connect to OBS.';
      this.scenes = [];
      this.currentScene = '';
      this.selectedScene = '';
    } finally {
      this.connecting = false;
    }
  }

  disconnect(): void {
    this.invalidateAutomationTransitions();
    this.obs.disconnect();
    this.scenes = [];
    this.currentScene = '';
    this.selectedScene = '';
    this.notice = 'Disconnected from OBS.';
    this.error = '';
  }

  async refresh(): Promise<void> {
    if (!this.obs.connected) return;
    this.error = '';
    try {
      this.scenes = await this.obs.refreshScenes();
      this.reconcilePreferences();
      this.currentScene = await this.obs.currentScene();
      this.selectedScene = this.currentScene;
      this.notice = 'Scene list refreshed.';
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Could not refresh scenes.';
    }
  }

  assignSelectedToPreset(key: ScenePresetKey): void {
    if (
      !this.selectedScene ||
      !this.scenes.some((scene) => scene.sceneName === this.selectedScene)
    ) {
      this.error = 'Select a valid OBS scene before assigning a preset.';
      return;
    }
    this.presets = this.presets.map((preset) =>
      preset.key === key ? { ...preset, sceneName: this.selectedScene } : preset,
    );
    this.persistPreferences();
    this.notice = `${this.presetLabels[key]} preset saved as “${this.selectedScene}”.`;
    this.error = '';
  }

  async switchPreset(key: ScenePresetKey): Promise<void> {
    const preset = this.presets.find((item) => item.key === key);
    if (!preset?.sceneName || !this.scenes.some((scene) => scene.sceneName === preset.sceneName)) {
      this.error = `Assign an available OBS scene to the ${this.presetLabels[key]} preset first.`;
      return;
    }
    this.selectedScene = preset.sceneName;
    await this.switchScene();
  }

  toggleFavorite(sceneName: string): void {
    if (!this.scenes.some((scene) => scene.sceneName === sceneName)) return;
    this.favoriteSceneNames = this.favoriteSceneNames.includes(sceneName)
      ? this.favoriteSceneNames.filter((name) => name !== sceneName)
      : [...this.favoriteSceneNames, sceneName];
    this.persistPreferences();
  }

  get favoriteScenes(): ObsScene[] {
    return this.scenes.filter((scene) => this.favoriteSceneNames.includes(scene.sceneName));
  }

  isFavorite(sceneName: string): boolean {
    return this.favoriteSceneNames.includes(sceneName);
  }

  private reconcilePreferences(): void {
    const available = new Set(this.scenes.map((scene) => scene.sceneName));
    this.presets = this.presets.map((preset) => ({
      ...preset,
      sceneName: available.has(preset.sceneName) ? preset.sceneName : '',
    }));
    this.favoriteSceneNames = this.favoriteSceneNames.filter((name) => available.has(name));
    this.persistPreferences();
  }

  private loadPreferences(): void {
    try {
      const raw = localStorage.getItem(this.preferencesKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        presets?: ScenePreset[];
        favorites?: string[];
        automationEnabled?: boolean;
        automationReturnScene?: string;
        automationReturnDelay?: number;
        automationRules?: AutomationRule[];
        automationProfiles?: AutomationProfile[];
        activeAutomationProfileId?: string;
      };
      this.automationEnabled = saved.automationEnabled === true;
      if (Array.isArray(saved.automationProfiles)) {
        this.automationProfiles = saved.automationProfiles
          .filter(
            (profile) =>
              !!profile && typeof profile.id === 'string' && typeof profile.name === 'string',
          )
          .map((profile) => ({
            id: profile.id,
            name: profile.name.slice(0, 40),
            rules: this.automationRules.map((rule) => {
              const stored = profile.rules?.find((item) => item.event === rule.event);
              return {
                ...rule,
                ...stored,
                sceneName: typeof stored?.sceneName === 'string' ? stored.sceneName : '',
                enabled: stored?.enabled !== false,
                priority: Math.min(100, Math.max(1, Number(stored?.priority) || rule.priority)),
                cooldownSeconds: Math.min(120, Math.max(0, Number(stored?.cooldownSeconds) || 0)),
              };
            }),
            returnScene: typeof profile.returnScene === 'string' ? profile.returnScene : '',
            returnDelay: Math.min(30, Math.max(2, Number(profile.returnDelay) || 8)),
          }));
      }
      this.activeAutomationProfileId =
        typeof saved.activeAutomationProfileId === 'string' &&
        this.automationProfiles.some((profile) => profile.id === saved.activeAutomationProfileId)
          ? saved.activeAutomationProfileId
          : '';
      this.automationReturnScene =
        typeof saved.automationReturnScene === 'string' ? saved.automationReturnScene : '';
      this.automationReturnDelay = Math.min(
        30,
        Math.max(2, Number(saved.automationReturnDelay) || 8),
      );
      if (Array.isArray(saved.automationRules)) {
        this.automationRules = this.automationRules.map((rule) => {
          const savedRule = saved.automationRules?.find((item) => item.event === rule.event);
          return {
            ...rule,
            ...savedRule,
            sceneName: typeof savedRule?.sceneName === 'string' ? savedRule.sceneName : '',
            enabled: savedRule?.enabled !== false,
            priority: Math.min(100, Math.max(1, Number(savedRule?.priority) || rule.priority)),
            cooldownSeconds: Math.min(120, Math.max(0, Number(savedRule?.cooldownSeconds) || 0)),
          };
        });
      }
      if (Array.isArray(saved.presets)) {
        this.presets = this.presets.map((preset) => {
          const stored = saved.presets?.find((item) => item.key === preset.key);
          return {
            ...preset,
            sceneName: typeof stored?.sceneName === 'string' ? stored.sceneName : '',
          };
        });
      }
      if (Array.isArray(saved.favorites)) {
        this.favoriteSceneNames = saved.favorites.filter(
          (name): name is string => typeof name === 'string',
        );
      }
    } catch {
      this.presets = this.presets.map((preset) => ({ ...preset, sceneName: '' }));
      this.favoriteSceneNames = [];
    }
  }

  private persistPreferences(): void {
    try {
      localStorage.setItem(
        this.preferencesKey,
        JSON.stringify({
          presets: this.presets,
          favorites: this.favoriteSceneNames,
          automationEnabled: this.automationEnabled,
          automationReturnScene: this.automationReturnScene,
          automationReturnDelay: this.automationReturnDelay,
          automationRules: this.automationRules,
          automationProfiles: this.automationProfiles,
          activeAutomationProfileId: this.activeAutomationProfileId,
        }),
      );
    } catch {
      this.notice = 'Preferences could not be saved in this browser.';
    }
  }

  setAutomationEnabled(enabled: boolean): void {
    this.automationEnabled = enabled;
    this.persistPreferences();
    if (enabled) {
      this.previousAutomationScore = null;
      this.previousAutomationMatchStatus = '';
      this.startAutomationFeeds();
      this.automationStatus = 'Automation enabled. Waiting for the next match event.';
    } else {
      this.stopAutomationFeeds();
      this.invalidateAutomationTransitions();
      this.automationStatus = 'Automation is off.';
    }
  }

  saveAutomationProfile(): void {
    const name = this.newAutomationProfileName.trim().slice(0, 40);
    if (!name) {
      this.error = 'Enter a profile name before saving.';
      return;
    }
    const id = `profile-${Date.now()}-${this.automationProfiles.length}`;
    this.automationProfiles = [
      ...this.automationProfiles,
      {
        id,
        name,
        rules: this.automationRules.map((rule) => ({ ...rule })),
        returnScene: this.automationReturnScene,
        returnDelay: this.automationReturnDelay,
      },
    ];
    this.activeAutomationProfileId = id;
    this.newAutomationProfileName = '';
    this.persistPreferences();
    this.error = '';
    this.automationStatus = `Profile “${name}” saved.`;
  }

  duplicateAutomationProfile(): void {
    const name = this.newAutomationProfileName.trim().slice(0, 40);
    if (!name) {
      this.error = 'Enter a name for the duplicated profile.';
      return;
    }
    const source = this.automationProfiles.find(
      (profile) => profile.id === this.activeAutomationProfileId,
    );
    const id = `profile-${Date.now()}-${this.automationProfiles.length}`;
    const duplicate: AutomationProfile = {
      id,
      name,
      rules: (source?.rules || this.automationRules).map((rule) => ({ ...rule })),
      returnScene: source?.returnScene ?? this.automationReturnScene,
      returnDelay: source?.returnDelay ?? this.automationReturnDelay,
    };
    this.automationProfiles = [...this.automationProfiles, duplicate];
    this.activeAutomationProfileId = id;
    this.newAutomationProfileName = '';
    this.persistPreferences();
    this.error = '';
    this.automationStatus = `Profile duplicated as “${name}”.`;
  }

  resetAutomationRules(): void {
    this.automationRules = this.automationRules.map((rule, index) => ({
      ...rule,
      sceneName: '',
      enabled: true,
      priority: [70, 80, 100, 40, 50, 90, 100][index] || 50,
      cooldownSeconds: [3, 3, 5, 2, 5, 10, 10][index] || 0,
    }));
    this.activeAutomationProfileId = '';
    this.persistPreferences();
    this.automationStatus = 'Default event rules restored. Assign scenes and save when ready.';
  }

  applyAutomationProfile(id: string): void {
    const profile = this.automationProfiles.find((item) => item.id === id);
    if (!profile) return;
    const available = new Set(this.scenes.map((scene) => scene.sceneName));
    this.automationRules = this.automationRules.map((defaultRule) => {
      const rule = profile.rules.find((item) => item.event === defaultRule.event);
      return {
        ...defaultRule,
        ...rule,
        sceneName: rule && available.has(rule.sceneName) ? rule.sceneName : '',
      };
    });
    this.automationReturnScene = available.has(profile.returnScene) ? profile.returnScene : '';
    this.automationReturnDelay = Math.min(30, Math.max(2, profile.returnDelay || 8));
    this.activeAutomationProfileId = profile.id;
    this.persistPreferences();
    this.automationStatus = `Profile “${profile.name}” applied.`;
    this.error = '';
  }

  deleteAutomationProfile(id: string): void {
    const profile = this.automationProfiles.find((item) => item.id === id);
    if (!profile) return;
    this.automationProfiles = this.automationProfiles.filter((item) => item.id !== id);
    if (this.activeAutomationProfileId === id) this.activeAutomationProfileId = '';
    this.persistPreferences();
    this.automationStatus = `Profile “${profile.name}” deleted.`;
  }

  saveAutomationRules(): void {
    const available = new Set(this.scenes.map((scene) => scene.sceneName));
    this.automationRules = this.automationRules.map((rule) => ({
      ...rule,
      sceneName: available.has(rule.sceneName) ? rule.sceneName : '',
      priority: Math.min(100, Math.max(1, Number(rule.priority) || 1)),
      cooldownSeconds: Math.min(120, Math.max(0, Number(rule.cooldownSeconds) || 0)),
    }));
    if (this.automationReturnScene && !available.has(this.automationReturnScene))
      this.automationReturnScene = '';
    this.automationReturnDelay = Math.min(30, Math.max(2, Number(this.automationReturnDelay) || 8));
    const activeProfile = this.automationProfiles.find(
      (profile) => profile.id === this.activeAutomationProfileId,
    );
    if (activeProfile) {
      this.automationProfiles = this.automationProfiles.map((profile) =>
        profile.id === activeProfile.id
          ? {
              ...profile,
              rules: this.automationRules.map((rule) => ({ ...rule })),
              returnScene: this.automationReturnScene,
              returnDelay: this.automationReturnDelay,
            }
          : profile,
      );
    }
    this.persistPreferences();
    this.automationStatus = activeProfile
      ? `Rules saved to “${activeProfile.name}”.`
      : 'Event scene rules saved.';
  }

  onAutomationScore(score: ObsAutomationScore, match?: AutomationScoreMessage['match']): void {
    const previous = this.previousAutomationScore;
    const events = this.detectAutomationEvents(score, previous, match?.status);
    this.previousAutomationScore = score;
    if (match?.status) this.previousAutomationMatchStatus = match.status;
    if (!this.automationEnabled || !this.obs.connected || !events.length) return;
    const identity =
      score.eventId ||
      String(
        score.eventVersion ??
          score.sequenceNo ??
          `${score.inningsId}:${score.runs}:${score.wickets}:${score.legalBalls}`,
      );
    if (this.processedAutomationEvents.has(identity)) return;
    this.processedAutomationEvents.add(identity);
    if (this.processedAutomationEvents.size > 100) {
      const oldest = this.processedAutomationEvents.values().next().value;
      if (oldest) this.processedAutomationEvents.delete(oldest);
    }
    const now = Date.now();
    const candidates = events
      .map((event) => this.automationRules.find((rule) => rule.event === event))
      .filter((rule): rule is AutomationRule => !!rule && rule.enabled)
      .sort((a, b) => b.priority - a.priority);
    for (const rule of candidates) {
      const lastTriggered = this.automationLastTriggeredAt.get(rule.event) || 0;
      if (now - lastTriggered < rule.cooldownSeconds * 1000) continue;
      if (!rule.sceneName || !this.scenes.some((scene) => scene.sceneName === rule.sceneName))
        continue;
      this.automationLastTriggeredAt.set(rule.event, now);
      void this.runAutomationScene(rule.sceneName, rule.label);
      return;
    }
    const disabled = events.every(
      (event) => !this.automationRules.find((rule) => rule.event === event)?.enabled,
    );
    this.automationStatus = disabled
      ? 'Detected event rules are disabled.'
      : 'Detected events were skipped by cooldown or have no assigned scene.';
  }

  private detectAutomationEvents(
    score: ObsAutomationScore,
    previous: ObsAutomationScore | null,
    matchStatus?: string,
  ): AutomationEvent[] {
    if (!previous) return [];
    const events: AutomationEvent[] = [];
    if (previous.inningsId !== score.inningsId) return ['INNINGS_BREAK'];
    const latest = score.recentBalls?.at(-1);
    const priorDeliveryId = previous.recentBalls?.at(-1)?.deliveryId;
    const newDelivery = !!latest && latest.deliveryId !== priorDeliveryId;
    if (matchStatus === 'COMPLETED' && this.previousAutomationMatchStatus !== 'COMPLETED')
      events.push('RESULT');
    if (score.status === 'COMPLETED' && previous.status !== 'COMPLETED')
      events.push('INNINGS_BREAK');
    if (score.wickets > previous.wickets || (newDelivery && !!latest?.wicketType))
      events.push('WICKET');
    if (newDelivery && latest?.legalDelivery && latest.totalRuns === 6) events.push('SIX');
    if (newDelivery && latest?.legalDelivery && latest.totalRuns === 4) events.push('FOUR');
    if (
      score.runs > previous.runs &&
      [25, 50, 75, 100, 125, 150, 175, 200, 250, 300, 400, 500].some(
        (milestone) => previous.runs < milestone && score.runs >= milestone,
      )
    )
      events.push('MILESTONE');
    if (newDelivery && latest?.legalDelivery && score.legalBalls > 0 && score.legalBalls % 6 === 0)
      events.push('OVER_COMPLETE');
    return [...new Set(events)];
  }

  private runAutomationScene(sceneName: string, eventLabel: string): Promise<void> {
    if (!this.obs.connected || this.switching || !this.automationEnabled) return Promise.resolve();
    if (!this.automationBaseScene)
      this.automationBaseScene = this.automationReturnScene || this.currentScene;
    if (this.automationReturnTimer) clearTimeout(this.automationReturnTimer);
    this.automationReturnTimer = undefined;
    const transitionVersion = ++this.automationTransitionVersion;

    const transition = async (): Promise<void> => {
      if (
        transitionVersion !== this.automationTransitionVersion ||
        !this.automationEnabled ||
        !this.obs.connected
      )
        return;
      try {
        await this.obs.switchScene(sceneName);
        if (transitionVersion !== this.automationTransitionVersion) return;
        this.currentScene = sceneName;
        this.selectedScene = sceneName;
        this.automationStatus = `Auto switched to ${sceneName} · ${eventLabel}.`;
        this.automationReturnTimer = setTimeout(() => {
          this.automationReturnTimer = undefined;
          if (
            transitionVersion !== this.automationTransitionVersion ||
            !this.automationEnabled ||
            !this.obs.connected
          )
            return;
          const target = this.automationReturnScene || this.automationBaseScene;
          if (!target || target === sceneName) return;
          void this.obs
            .switchScene(target)
            .then(() => {
              if (transitionVersion !== this.automationTransitionVersion) return;
              this.currentScene = target;
              this.selectedScene = target;
              this.automationStatus = `Returned to ${target}.`;
              this.automationBaseScene = '';
            })
            .catch(() => {
              if (transitionVersion === this.automationTransitionVersion)
                this.automationStatus = 'Automatic return failed. Check OBS connection.';
            });
        }, this.automationReturnDelay * 1000);
      } catch (error) {
        if (transitionVersion === this.automationTransitionVersion) {
          this.automationStatus =
            error instanceof Error ? error.message : 'Automatic scene switch failed.';
        }
      }
    };

    this.automationSwitchQueue = this.automationSwitchQueue.then(transition, transition);
    return this.automationSwitchQueue;
  }

  private invalidateAutomationTransitions(): void {
    this.automationTransitionVersion += 1;
    if (this.automationReturnTimer) clearTimeout(this.automationReturnTimer);
    this.automationReturnTimer = undefined;
    this.automationBaseScene = '';
  }

  private startAutomationFeeds(): void {
    if (typeof BroadcastChannel !== 'undefined' && !this.automationChannel) {
      this.automationChannel = new BroadcastChannel('cricpulse-live-score');
      this.automationChannel.onmessage = (event: MessageEvent<AutomationScoreMessage>) =>
        this.acceptAutomationMessage(event.data);
    }
    if (!this.automationRelay && typeof WebSocket !== 'undefined') this.connectAutomationRelay();
    if (!this.automationPollTimer) {
      void this.refreshAutomationFeed();
      this.automationPollTimer = setInterval(() => void this.refreshAutomationFeed(), 15000);
    }
  }

  private refreshAutomationFeed(): void {
    if (!this.automationEnabled || !this.matchId || this.automationFeedInFlight) return;
    this.automationFeedInFlight = true;
    const context = new HttpContext().set(SKIP_GLOBAL_LOADING, true);
    this.http
      .get<AutomationFeedState>(
        API_ORIGIN + '/api/public/matches/' + this.matchId + '/broadcast-state',
        { context },
      )
      .pipe(catchError(() => of(null)))
      .subscribe((state) => {
        this.automationFeedInFlight = false;
        if (!state || !this.automationEnabled) return;
        const innings = state.innings || [];
        const currentId =
          state.match.currentInningsId ||
          innings.find((item) => item.score.status === 'LIVE')?.score.inningsId ||
          innings.at(-1)?.score.inningsId ||
          '';
        const snapshot = innings.find((item) => item.score.inningsId === currentId)?.score;
        if (snapshot) this.onAutomationScore(snapshot, state.match);
        if (!currentId || currentId === this.automationWatchedInningsId) return;
        this.automationScoreSubscription?.unsubscribe();
        this.automationWatchedInningsId = currentId;
        this.automationScoreSubscription = this.liveScore.watch(currentId).subscribe({
          next: (score: LiveScore) => {
            if (this.automationEnabled && score.matchId === this.matchId)
              this.onAutomationScore(score, state.match);
          },
          error: () => {
            this.automationWatchedInningsId = '';
          },
        });
      });
  }

  private acceptAutomationMessage(message: AutomationScoreMessage): void {
    if (
      message?.source !== 'cricpulse-scorer' ||
      message.matchId !== this.matchId ||
      !message.score?.inningsId
    )
      return;
    this.onAutomationScore(message.score, message.match);
  }

  private connectAutomationRelay(): void {
    if (!this.automationEnabled || this.automationRelay || typeof WebSocket === 'undefined') return;
    try {
      const socket = new WebSocket('ws://127.0.0.1:8765/ws');
      this.automationRelay = socket;
      socket.onmessage = (event: MessageEvent) => {
        try {
          this.acceptAutomationMessage(JSON.parse(String(event.data)));
        } catch {
          /* Ignore invalid relay payloads. */
        }
      };
      socket.onopen = () => {
        if (this.automationRelay === socket) this.automationRelayDelay = 1000;
      };
      socket.onclose = () => {
        if (this.automationRelay !== socket) return;
        this.automationRelay = undefined;
        this.scheduleAutomationRelayReconnect();
      };
      socket.onerror = () => socket.close();
    } catch {
      this.scheduleAutomationRelayReconnect();
    }
  }

  private scheduleAutomationRelayReconnect(): void {
    if (!this.automationEnabled || this.automationRelayReconnect) return;
    const delay = this.automationRelayDelay;
    this.automationRelayDelay = Math.min(this.automationRelayDelay * 2, 15000);
    this.automationRelayReconnect = setTimeout(() => {
      this.automationRelayReconnect = undefined;
      this.connectAutomationRelay();
    }, delay);
  }

  private stopAutomationFeeds(): void {
    this.automationChannel?.close();
    this.automationChannel = undefined;
    if (this.automationRelayReconnect) clearTimeout(this.automationRelayReconnect);
    this.automationRelayReconnect = undefined;
    this.automationRelay?.close();
    this.automationRelay = undefined;
    this.automationRelayDelay = 1000;
  }

  async switchScene(): Promise<void> {
    this.invalidateAutomationTransitions();
    if (
      !this.obs.connected ||
      !this.selectedScene ||
      this.selectedScene === this.currentScene ||
      this.switching
    )
      return;
    this.error = '';
    this.notice = '';
    this.switching = true;
    try {
      await this.obs.switchScene(this.selectedScene);
      // OBS SceneChanged events provide the authoritative scene; query as a fallback.
      this.currentScene = await this.obs.currentScene();
      this.selectedScene = this.currentScene;
      this.notice = `Switched to “${this.currentScene}”.`;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Scene switch failed.';
    } finally {
      this.switching = false;
    }
  }

  ngOnDestroy(): void {
    this.obsSubscriptions.unsubscribe();
    this.stopAutomationFeeds();
    this.invalidateAutomationTransitions();
    this.obs.disconnect();
    this.password = '';
  }
}
