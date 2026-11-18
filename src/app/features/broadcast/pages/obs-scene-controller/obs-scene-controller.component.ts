import { Component, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
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

  get connectionUrl(): string {
    return `${this.protocol}://${this.host.trim() || '127.0.0.1'}:${this.port.trim() || '4455'}`;
  }

  async connect(): Promise<void> {
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
    if (!this.obs.connected || !this.selectedScene || this.selectedScene === this.currentScene)
      return;
    this.error = '';
    this.notice = '';
    this.switching = true;
    try {
      await this.obs.switchScene(this.selectedScene);
      this.currentScene = await this.obs.currentScene();
      this.notice = `Switched to “${this.currentScene}”.`;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Scene switch failed.';
    } finally {
      this.switching = false;
    }
  }

  ngOnDestroy(): void {
    this.obs.disconnect();
    this.password = '';
  }
}
