import { HttpClient, HttpContext } from '@angular/common/http';
import { Component, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, catchError, of } from 'rxjs';
import { API_ORIGIN } from '../../../../core/config/api.config';
import { SKIP_GLOBAL_LOADING } from '../../../../core/interceptors/loading.interceptor';
import { LiveScore, LiveScoreService } from '../../../../core/services/live-score.service';
import { ObsScene, ObsWebSocketService } from '../../services/obs-websocket.service';

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
  automationRules: AutomationRule[] = [
    { event: 'FOUR', label: 'Four', sceneName: '' },
    { event: 'SIX', label: 'Six', sceneName: '' },
    { event: 'WICKET', label: 'Wicket', sceneName: '' },
    { event: 'OVER_COMPLETE', label: 'Over complete', sceneName: '' },
    { event: 'MILESTONE', label: 'Milestone', sceneName: '' },
    { event: 'INNINGS_BREAK', label: 'Innings break', sceneName: '' },
    { event: 'RESULT', label: 'Match result', sceneName: '' },
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
  private previousAutomationScore: ObsAutomationScore | null = null;
  private previousAutomationMatchStatus = '';
  private readonly processedAutomationEvents = new Set<string>();

  constructor() {
    this.loadPreferences();
    if (this.automationEnabled) this.startAutomationFeeds();
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
      };
      this.automationEnabled = saved.automationEnabled === true;
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
            sceneName: typeof savedRule?.sceneName === 'string' ? savedRule.sceneName : '',
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
      if (this.automationReturnTimer) clearTimeout(this.automationReturnTimer);
      this.automationReturnTimer = undefined;
      this.automationStatus = 'Automation is off.';
    }
  }

  saveAutomationRules(): void {
    const available = new Set(this.scenes.map((scene) => scene.sceneName));
    this.automationRules = this.automationRules.map((rule) => ({
      ...rule,
      sceneName: available.has(rule.sceneName) ? rule.sceneName : '',
    }));
    if (this.automationReturnScene && !available.has(this.automationReturnScene))
      this.automationReturnScene = '';
    this.automationReturnDelay = Math.min(30, Math.max(2, Number(this.automationReturnDelay) || 8));
    this.persistPreferences();
    this.automationStatus = 'Event scene rules saved.';
  }

  onAutomationScore(score: ObsAutomationScore, match?: AutomationScoreMessage['match']): void {
    const previous = this.previousAutomationScore;
    const event = this.detectAutomationEvent(score, previous, match?.status);
    this.previousAutomationScore = score;
    if (match?.status) this.previousAutomationMatchStatus = match.status;
    if (!this.automationEnabled || !this.obs.connected || !event) return;
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
    const rule = this.automationRules.find((item) => item.event === event);
    if (!rule?.sceneName || !this.scenes.some((scene) => scene.sceneName === rule.sceneName)) {
      this.automationStatus = `${rule?.label || event} detected · no scene is assigned.`;
      return;
    }
    void this.runAutomationScene(rule.sceneName, rule.label);
  }

  private detectAutomationEvent(
    score: ObsAutomationScore,
    previous: ObsAutomationScore | null,
    matchStatus?: string,
  ): AutomationEvent | null {
    if (!previous) return null;
    if (previous.inningsId !== score.inningsId) return 'INNINGS_BREAK';
    const latest = score.recentBalls?.at(-1);
    const priorDeliveryId = previous.recentBalls?.at(-1)?.deliveryId;
    const newDelivery = !!latest && latest.deliveryId !== priorDeliveryId;
    if (matchStatus === 'COMPLETED' && this.previousAutomationMatchStatus !== 'COMPLETED')
      return 'RESULT';
    if (score.status === 'COMPLETED' && previous.status !== 'COMPLETED') return 'INNINGS_BREAK';
    if (score.wickets > previous.wickets || (newDelivery && !!latest?.wicketType)) return 'WICKET';
    if (newDelivery && latest?.legalDelivery && latest.totalRuns === 6) return 'SIX';
    if (newDelivery && latest?.legalDelivery && latest.totalRuns === 4) return 'FOUR';
    if (
      score.runs > previous.runs &&
      [25, 50, 75, 100, 125, 150, 175, 200, 250, 300, 400, 500].some(
        (m) => previous.runs < m && score.runs >= m,
      )
    )
      return 'MILESTONE';
    if (newDelivery && latest?.legalDelivery && score.legalBalls > 0 && score.legalBalls % 6 === 0)
      return 'OVER_COMPLETE';
    return null;
  }

  private async runAutomationScene(sceneName: string, eventLabel: string): Promise<void> {
    if (!this.obs.connected || this.switching) return;
    if (!this.automationBaseScene)
      this.automationBaseScene = this.automationReturnScene || this.currentScene;
    if (this.automationReturnTimer) clearTimeout(this.automationReturnTimer);
    try {
      await this.obs.switchScene(sceneName);
      this.currentScene = sceneName;
      this.selectedScene = sceneName;
      this.automationStatus = `Auto switched to ${sceneName} · ${eventLabel}.`;
      this.automationReturnTimer = setTimeout(() => {
        const target = this.automationReturnScene || this.automationBaseScene;
        if (target && target !== sceneName && this.obs.connected) {
          void this.obs
            .switchScene(target)
            .then(() => {
              this.currentScene = target;
              this.selectedScene = target;
              this.automationStatus = `Returned to ${target}.`;
            })
            .catch(() => {
              this.automationStatus = 'Automatic return failed. Check OBS connection.';
            });
        }
        this.automationReturnTimer = undefined;
      }, this.automationReturnDelay * 1000);
    } catch (error) {
      this.automationStatus =
        error instanceof Error ? error.message : 'Automatic scene switch failed.';
    }
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
    if (this.automationReturnTimer) clearTimeout(this.automationReturnTimer);
    this.automationReturnTimer = undefined;
    this.automationBaseScene = '';
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
    if (this.automationReturnTimer) clearTimeout(this.automationReturnTimer);
    this.obs.disconnect();
    this.password = '';
  }
}
