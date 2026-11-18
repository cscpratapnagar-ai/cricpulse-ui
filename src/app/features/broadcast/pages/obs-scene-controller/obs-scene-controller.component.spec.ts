import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ObsWebSocketService } from '../../services/obs-websocket.service';
import { ObsSceneControllerComponent } from './obs-scene-controller.component';

describe('ObsSceneControllerComponent', () => {
  let obs: jasmine.SpyObj<ObsWebSocketService>;

  beforeEach(() => {
    obs = jasmine.createSpyObj<ObsWebSocketService>('ObsWebSocketService', [
      'connect',
      'disconnect',
      'currentScene',
      'refreshScenes',
      'switchScene',
    ]);
    Object.defineProperty(obs, 'connected', { get: () => true });
    obs.connect.and.resolveTo([
      { sceneName: 'Camera', sceneIndex: 0 },
      { sceneName: 'Camera + Score', sceneIndex: 1 },
    ]);
    obs.currentScene.and.resolveTo('Camera');
    obs.refreshScenes.and.resolveTo([
      { sceneName: 'Camera', sceneIndex: 0 },
      { sceneName: 'Camera + Score', sceneIndex: 1 },
    ]);
    obs.switchScene.and.resolveTo();

    TestBed.configureTestingModule({
      imports: [ObsSceneControllerComponent],
      providers: [
        { provide: ObsWebSocketService, useValue: obs },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'match-123' } } },
        },
      ],
    });
  });

  it('uses sensible local OBS defaults and match context', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    expect(component.host).toBe('127.0.0.1');
    expect(component.port).toBe('4455');
    expect(component.connectionUrl).toBe('ws://127.0.0.1:4455');
    expect(component.matchId).toBe('match-123');
  });

  it('loads scenes and current program scene after connecting', async () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.password = 'secret';
    await component.connect();

    expect(obs.connect).toHaveBeenCalledWith('ws://127.0.0.1:4455', 'secret');
    expect(component.scenes.length).toBe(2);
    expect(component.currentScene).toBe('Camera');
    expect(component.selectedScene).toBe('Camera');
    expect(component.notice).toContain('2 scenes');
  });

  it('switches only when the selected scene differs from current scene', async () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.scenes = [{ sceneName: 'Camera + Score', sceneIndex: 1 }];
    component.currentScene = 'Camera';
    component.selectedScene = 'Camera + Score';

    await component.switchScene();

    expect(obs.switchScene).toHaveBeenCalledWith('Camera + Score');
    expect(obs.currentScene).toHaveBeenCalled();
    expect(component.notice).toContain('Camera');
  });

  it('reports connection failures and resets scene state', async () => {
    obs.connect.and.rejectWith(new Error('Connection refused'));
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    await component.connect();

    expect(component.error).toBe('Connection refused');
    expect(component.scenes).toEqual([]);
    expect(component.currentScene).toBe('');
  });

  it('disconnects on manual action and component teardown', () => {
    const fixture = TestBed.createComponent(ObsSceneControllerComponent);
    fixture.componentInstance.disconnect();
    fixture.destroy();

    expect(obs.disconnect).toHaveBeenCalledTimes(2);
  });
});
