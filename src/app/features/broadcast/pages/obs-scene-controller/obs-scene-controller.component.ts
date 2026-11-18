import { Component, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ObsScene, ObsWebSocketService } from '../../services/obs-websocket.service';

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

  constructor() {
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
      this.currentScene = await this.obs.currentScene();
      this.selectedScene = this.currentScene;
      this.notice = 'Scene list refreshed.';
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Could not refresh scenes.';
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
