import { Component, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ObsScene, ObsWebSocketService } from '../../services/obs-websocket.service';

type ScenePresetKey = 'main' | 'score' | 'camera' | 'break';

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

  constructor() {
    this.loadPreferences();
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
      const saved = JSON.parse(raw) as { presets?: ScenePreset[]; favorites?: string[] };
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
        JSON.stringify({ presets: this.presets, favorites: this.favoriteSceneNames }),
      );
    } catch {
      this.notice = 'Preferences could not be saved in this browser.';
    }
  }

  async switchScene(): Promise<void> {
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
    this.obs.disconnect();
    this.password = '';
  }
}
