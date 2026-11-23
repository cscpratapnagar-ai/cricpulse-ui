import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { ObsWebSocketService } from '../../services/obs-websocket.service';
import { LiveScoreService } from '../../../../core/services/live-score.service';
import { ObsSceneControllerComponent } from './obs-scene-controller.component';

describe('ObsSceneControllerComponent', () => {
  let obs: jasmine.SpyObj<ObsWebSocketService>;
  let sceneChanged$: Subject<string>;
  let connectionLost$: Subject<string>;
  let reconnected$: Subject<Array<{ sceneName: string; sceneIndex: number }>>;
  let connectionState$: BehaviorSubject<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING'>;

  beforeEach(() => {
    localStorage.removeItem('cricpulse.obs-scene-presets.match-123');
    obs = jasmine.createSpyObj<ObsWebSocketService>('ObsWebSocketService', [
      'connect',
      'disconnect',
      'currentScene',
      'refreshScenes',
      'switchScene',
    ]);
    sceneChanged$ = new Subject<string>();
    connectionLost$ = new Subject<string>();
    reconnected$ = new Subject<Array<{ sceneName: string; sceneIndex: number }>>();
    connectionState$ = new BehaviorSubject<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING'>(
      'DISCONNECTED',
    );
    Object.defineProperty(obs, 'connected', { get: () => true });
    Object.defineProperty(obs, 'sceneChanged$', { value: sceneChanged$ });
    Object.defineProperty(obs, 'connectionLost
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
        { provide: HttpClient, useValue: jasmine.createSpyObj<HttpClient>('HttpClient', ['get']) },
        {
          provide: LiveScoreService,
          useValue: jasmine.createSpyObj<LiveScoreService>('LiveScoreService', ['watch']),
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'match-123' } } },
        },
      ],
    });
  });

  it('restores saved presets and favorites for this match from browser storage', () => {
    localStorage.setItem(
      'cricpulse.obs-scene-presets.match-123',
      JSON.stringify({
        presets: [{ key: 'score', label: 'Scoreboard', sceneName: 'Camera + Score' }],
        favorites: ['Camera'],
      }),
    );

    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;

    expect(component.presets.find((preset) => preset.key === 'score')?.sceneName).toBe(
      'Camera + Score',
    );
    expect(component.favoriteSceneNames).toEqual(['Camera']);
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

  it('synchronizes selection when OBS changes its program scene externally', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.currentScene = 'Camera';
    component.selectedScene = 'Camera + Score';

    sceneChanged$.next('Camera + Score');

    expect(component.currentScene).toBe('Camera + Score');
    expect(component.selectedScene).toBe('Camera + Score');
    expect(component.notice).toContain('Camera + Score');
  });

  it('reports connection loss and clears active operation states', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.connecting = true;
    component.switching = true;

    connectionLost$.next('OBS connection closed. Reconnect to restore scene control.');

    expect(component.error).toContain('Reconnect');
    expect(component.notice).toBe('');
    expect(component.connecting).toBeFalse();
    expect(component.switching).toBeFalse();
  });

  it('switches only when the selected scene differs from current scene', async () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.scenes = [{ sceneName: 'Camera + Score', sceneIndex: 1 }];
    component.currentScene = 'Camera';
    obs.currentScene.and.resolveTo('Camera + Score');
    component.selectedScene = 'Camera + Score';

    await component.switchScene();

    expect(obs.switchScene).toHaveBeenCalledWith('Camera + Score');
    expect(obs.currentScene).toHaveBeenCalled();
    expect(component.notice).toContain('Camera');
  });

  it('assigns a preset to the selected scene and persists it', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.scenes = [
      { sceneName: 'Camera', sceneIndex: 0 },
      { sceneName: 'Camera + Score', sceneIndex: 1 },
    ];
    component.selectedScene = 'Camera + Score';

    component.assignSelectedToPreset('main');

    expect(component.presets.find((preset) => preset.key === 'main')?.sceneName).toBe(
      'Camera + Score',
    );
    expect(localStorage.getItem('cricpulse.obs-scene-presets.match-123')).toContain(
      'Camera + Score',
    );
  });

  it('switches to an assigned preset and rejects missing assignments', async () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.scenes = [{ sceneName: 'Camera + Score', sceneIndex: 1 }];
    component.presets = component.presets.map((preset) =>
      preset.key === 'score' ? { ...preset, sceneName: 'Camera + Score' } : preset,
    );

    await component.switchPreset('score');
    expect(obs.switchScene).toHaveBeenCalledWith('Camera + Score');

    await component.switchPreset('break');
    expect(component.error).toContain('Assign an available OBS scene');
  });

  it('toggles favorites and returns only available favorite scenes', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.scenes = [
      { sceneName: 'Camera', sceneIndex: 0 },
      { sceneName: 'Camera + Score', sceneIndex: 1 },
    ];

    component.toggleFavorite('Camera');
    component.toggleFavorite('Camera + Score');
    expect(component.favoriteScenes.map((scene) => scene.sceneName)).toEqual([
      'Camera',
      'Camera + Score',
    ]);

    component.toggleFavorite('Camera');
    expect(component.favoriteScenes.map((scene) => scene.sceneName)).toEqual(['Camera + Score']);
  });

  it('clears preset and favorite references when scenes disappear on refresh', async () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.presets = component.presets.map((preset) =>
      preset.key === 'main' ? { ...preset, sceneName: 'Deleted Scene' } : preset,
    );
    component.favoriteSceneNames = ['Deleted Scene'];
    obs.refreshScenes.and.resolveTo([{ sceneName: 'Camera', sceneIndex: 0 }]);
    component.currentScene = 'Camera';
    component.selectedScene = 'Camera';

    await component.refresh();

    expect(component.presets.find((preset) => preset.key === 'main')?.sceneName).toBe('');
    expect(component.favoriteSceneNames).toEqual([]);
  });

  it('keeps event automation disabled by default and persists configured rules', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    expect(component.automationEnabled).toBeFalse();
    component.scenes = [
      { sceneName: 'Camera', sceneIndex: 0 },
      { sceneName: 'Wicket', sceneIndex: 1 },
    ];
    component.automationRules = component.automationRules.map((rule) =>
      rule.event === 'WICKET' ? { ...rule, sceneName: 'Wicket' } : rule,
    );
    component.automationReturnScene = 'Camera';
    component.automationReturnDelay = 10;
    component.saveAutomationRules();
    const saved = JSON.parse(localStorage.getItem('cricpulse.obs-scene-presets.match-123') || '{}');
    expect(saved.automationEnabled).toBeFalse();
    expect(saved.automationReturnScene).toBe('Camera');
    expect(saved.automationReturnDelay).toBe(10);
    expect(
      saved.automationRules.find((rule: { event: string }) => rule.event === 'WICKET').sceneName,
    ).toBe('Wicket');
  });

  it('supports disabling rules, priority, cooldown, and persists advanced settings', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.scenes = [{ sceneName: 'Wicket', sceneIndex: 0 }];
    component.automationRules = component.automationRules.map((rule) =>
      rule.event === 'WICKET'
        ? { ...rule, sceneName: 'Wicket', enabled: false, priority: 95, cooldownSeconds: 30 }
        : rule,
    );
    component.saveAutomationRules();
    const saved = JSON.parse(localStorage.getItem('cricpulse.obs-scene-presets.match-123') || '{}');
    const wicket = saved.automationRules.find((rule: { event: string }) => rule.event === 'WICKET');
    expect(wicket.enabled).toBeFalse();
    expect(wicket.priority).toBe(95);
    expect(wicket.cooldownSeconds).toBe(30);
  });

  it('resets advanced automation rules to safe defaults', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.automationRules[0].enabled = false;
    component.automationRules[0].priority = 1;
    component.automationRules[0].cooldownSeconds = 99;
    component.resetAutomationRules();
    expect(component.automationRules[0].enabled).toBeTrue();
    expect(component.automationRules[0].priority).toBe(70);
    expect(component.automationRules[0].cooldownSeconds).toBe(3);
  });

  it('duplicates the active automation profile under a new name', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.newAutomationProfileName = 'Copy';
    component.saveAutomationProfile();
    const originalId = component.activeAutomationProfileId;
    component.newAutomationProfileName = 'Copy 2';
    component.duplicateAutomationProfile();
    expect(component.automationProfiles.length).toBe(2);
    expect(component.activeAutomationProfileId).not.toBe(originalId);
    expect(component.automationProfiles[1].name).toBe('Copy 2');
  });

  it('saves, applies, and deletes match-scoped automation profiles', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.scenes = [
      { sceneName: 'Camera', sceneIndex: 0 },
      { sceneName: 'Wicket', sceneIndex: 1 },
    ];
    component.newAutomationProfileName = 'T20 Match';
    component.automationRules = component.automationRules.map((rule) =>
      rule.event === 'WICKET' ? { ...rule, sceneName: 'Wicket' } : rule,
    );
    component.automationReturnScene = 'Camera';
    component.automationReturnDelay = 12;
    component.saveAutomationProfile();

    expect(component.automationProfiles.length).toBe(1);
    const profileId = component.activeAutomationProfileId;
    component.automationRules = component.automationRules.map((rule) => ({
      ...rule,
      sceneName: '',
    }));
    component.applyAutomationProfile(profileId);
    expect(component.automationRules.find((rule) => rule.event === 'WICKET')?.sceneName).toBe(
      'Wicket',
    );
    expect(component.automationReturnScene).toBe('Camera');
    expect(component.automationReturnDelay).toBe(12);

    component.deleteAutomationProfile(profileId);
    expect(component.automationProfiles).toEqual([]);
    expect(component.activeAutomationProfileId).toBe('');
  });

  it('cancels automatic return when the operator manually switches scenes', async () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.currentScene = 'Event Scene';
    component.selectedScene = 'Manual Scene';
    component['automationBaseScene'] = 'Main Scene';
    component['automationReturnTimer'] = setTimeout(() => undefined, 5000);
    await component.switchScene();
    expect(component['automationReturnTimer']).toBeUndefined();
    expect(component['automationBaseScene']).toBe('');
    expect(obs.switchScene).toHaveBeenCalledWith('Manual Scene');
  });
  it('automatically switches to a configured scene for a new six event', async () => {
    const fixture = TestBed.createComponent(ObsSceneControllerComponent);
    const component = fixture.componentInstance;
    component.automationEnabled = true;
    component.scenes = [
      { sceneName: 'Camera', sceneIndex: 0 },
      { sceneName: 'Six', sceneIndex: 1 },
    ];
    component.currentScene = 'Camera';
    component.automationRules = component.automationRules.map((rule) =>
      rule.event === 'SIX' ? { ...rule, sceneName: 'Six' } : rule,
    );
    const baseline = {
      inningsId: 'inn-1',
      runs: 10,
      wickets: 0,
      legalBalls: 1,
      eventVersion: 1,
      recentBalls: [{ deliveryId: 'd-1', totalRuns: 1, legalDelivery: true }],
    };
    component.onAutomationScore(baseline);
    component.onAutomationScore({
      ...baseline,
      runs: 16,
      legalBalls: 2,
      eventVersion: 2,
      recentBalls: [{ deliveryId: 'd-2', totalRuns: 6, legalDelivery: true }],
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(obs.switchScene).toHaveBeenCalledWith('Six');
    expect(component.automationStatus).toContain('Six');
    fixture.destroy();
  });

  it('uses the highest-priority rule when one delivery triggers multiple events', async () => {
    const fixture = TestBed.createComponent(ObsSceneControllerComponent);
    const component = fixture.componentInstance;
    component.automationEnabled = true;
    component.scenes = [
      { sceneName: 'Wicket', sceneIndex: 0 },
      { sceneName: 'Over', sceneIndex: 1 },
    ];
    component.automationRules = component.automationRules.map((rule) => {
      if (rule.event === 'WICKET')
        return { ...rule, sceneName: 'Wicket', priority: 100, cooldownSeconds: 0 };
      if (rule.event === 'OVER_COMPLETE')
        return { ...rule, sceneName: 'Over', priority: 40, cooldownSeconds: 0 };
      return rule;
    });
    const baseline = {
      inningsId: 'inn-1',
      runs: 20,
      wickets: 0,
      legalBalls: 5,
      eventVersion: 1,
      recentBalls: [{ deliveryId: 'd-5', totalRuns: 0, legalDelivery: true }],
    };
    component.onAutomationScore(baseline);
    component.onAutomationScore({
      ...baseline,
      wickets: 1,
      legalBalls: 6,
      eventVersion: 2,
      recentBalls: [{ deliveryId: 'd-6', totalRuns: 0, legalDelivery: true, wicketType: 'bowled' }],
    });
    await Promise.resolve();
    expect(obs.switchScene).toHaveBeenCalledOnceWith('Wicket');
    fixture.destroy();
  });

  it('ignores scorer messages from another match', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.automationEnabled = true;
    const message = {
      source: 'cricpulse-scorer',
      matchId: 'other-match',
      score: { inningsId: 'inn-1', runs: 10, wickets: 0, legalBalls: 1 },
    };
    (
      component as unknown as { acceptAutomationMessage: (value: typeof message) => void }
    ).acceptAutomationMessage(message);
    expect(component['previousAutomationScore']).toBeNull();
  });
  it('serializes rapid automation events and applies only the latest requested scene', async () => {
    const fixture = TestBed.createComponent(ObsSceneControllerComponent);
    const component = fixture.componentInstance;
    component.automationEnabled = true;
    component.currentScene = 'Camera';
    let finishFirst!: () => void;
    obs.switchScene.and.callFake((sceneName: string) => {
      if (sceneName === 'Wicket') return new Promise<void>((resolve) => (finishFirst = resolve));
      return Promise.resolve();
    });
    const runAutomation = (
      component as unknown as {
        runAutomationScene: (scene: string, label: string) => Promise<void>;
      }
    ).runAutomationScene.bind(component);

    const first = runAutomation('Wicket', 'Wicket');
    await Promise.resolve();
    const latest = runAutomation('Six', 'Six');

    expect(obs.switchScene).toHaveBeenCalledOnceWith('Wicket');
    finishFirst();
    await first;
    await latest;

    expect(obs.switchScene.calls.allArgs()).toEqual([['Wicket'], ['Six']]);
    expect(component.currentScene).toBe('Six');
    expect(component.automationStatus).toContain('Six');
    fixture.destroy();
  });

  it('prevents an in-flight automation response from overwriting a manual scene choice', async () => {
    const fixture = TestBed.createComponent(ObsSceneControllerComponent);
    const component = fixture.componentInstance;
    component.automationEnabled = true;
    component.currentScene = 'Camera';
    let finishAutomation!: () => void;
    obs.switchScene.and.callFake((sceneName: string) => {
      if (sceneName === 'Wicket')
        return new Promise<void>((resolve) => (finishAutomation = resolve));
      return Promise.resolve();
    });
    obs.currentScene.and.resolveTo('Manual');
    const runAutomation = (
      component as unknown as {
        runAutomationScene: (scene: string, label: string) => Promise<void>;
      }
    ).runAutomationScene.bind(component);

    const automation = runAutomation('Wicket', 'Wicket');
    await Promise.resolve();
    component.selectedScene = 'Manual';
    const manual = component.switchScene();
    finishAutomation();
    await automation;
    await manual;

    expect(obs.switchScene.calls.allArgs()).toEqual([['Wicket'], ['Manual']]);
    expect(component.currentScene).toBe('Manual');
    expect(component.automationStatus).not.toContain('Auto switched');
    expect(component['automationReturnTimer']).toBeUndefined();
    fixture.destroy();
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
, { value: connectionLost$ });
    Object.defineProperty(obs, 'reconnected
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
        { provide: HttpClient, useValue: jasmine.createSpyObj<HttpClient>('HttpClient', ['get']) },
        {
          provide: LiveScoreService,
          useValue: jasmine.createSpyObj<LiveScoreService>('LiveScoreService', ['watch']),
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'match-123' } } },
        },
      ],
    });
  });

  it('restores saved presets and favorites for this match from browser storage', () => {
    localStorage.setItem(
      'cricpulse.obs-scene-presets.match-123',
      JSON.stringify({
        presets: [{ key: 'score', label: 'Scoreboard', sceneName: 'Camera + Score' }],
        favorites: ['Camera'],
      }),
    );

    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;

    expect(component.presets.find((preset) => preset.key === 'score')?.sceneName).toBe(
      'Camera + Score',
    );
    expect(component.favoriteSceneNames).toEqual(['Camera']);
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

  it('synchronizes selection when OBS changes its program scene externally', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.currentScene = 'Camera';
    component.selectedScene = 'Camera + Score';

    sceneChanged$.next('Camera + Score');

    expect(component.currentScene).toBe('Camera + Score');
    expect(component.selectedScene).toBe('Camera + Score');
    expect(component.notice).toContain('Camera + Score');
  });

  it('reports connection loss and clears active operation states', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.connecting = true;
    component.switching = true;

    connectionLost$.next('OBS connection closed. Reconnect to restore scene control.');

    expect(component.error).toContain('Reconnect');
    expect(component.notice).toBe('');
    expect(component.connecting).toBeFalse();
    expect(component.switching).toBeFalse();
  });

  it('switches only when the selected scene differs from current scene', async () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.scenes = [{ sceneName: 'Camera + Score', sceneIndex: 1 }];
    component.currentScene = 'Camera';
    obs.currentScene.and.resolveTo('Camera + Score');
    component.selectedScene = 'Camera + Score';

    await component.switchScene();

    expect(obs.switchScene).toHaveBeenCalledWith('Camera + Score');
    expect(obs.currentScene).toHaveBeenCalled();
    expect(component.notice).toContain('Camera');
  });

  it('assigns a preset to the selected scene and persists it', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.scenes = [
      { sceneName: 'Camera', sceneIndex: 0 },
      { sceneName: 'Camera + Score', sceneIndex: 1 },
    ];
    component.selectedScene = 'Camera + Score';

    component.assignSelectedToPreset('main');

    expect(component.presets.find((preset) => preset.key === 'main')?.sceneName).toBe(
      'Camera + Score',
    );
    expect(localStorage.getItem('cricpulse.obs-scene-presets.match-123')).toContain(
      'Camera + Score',
    );
  });

  it('switches to an assigned preset and rejects missing assignments', async () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.scenes = [{ sceneName: 'Camera + Score', sceneIndex: 1 }];
    component.presets = component.presets.map((preset) =>
      preset.key === 'score' ? { ...preset, sceneName: 'Camera + Score' } : preset,
    );

    await component.switchPreset('score');
    expect(obs.switchScene).toHaveBeenCalledWith('Camera + Score');

    await component.switchPreset('break');
    expect(component.error).toContain('Assign an available OBS scene');
  });

  it('toggles favorites and returns only available favorite scenes', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.scenes = [
      { sceneName: 'Camera', sceneIndex: 0 },
      { sceneName: 'Camera + Score', sceneIndex: 1 },
    ];

    component.toggleFavorite('Camera');
    component.toggleFavorite('Camera + Score');
    expect(component.favoriteScenes.map((scene) => scene.sceneName)).toEqual([
      'Camera',
      'Camera + Score',
    ]);

    component.toggleFavorite('Camera');
    expect(component.favoriteScenes.map((scene) => scene.sceneName)).toEqual(['Camera + Score']);
  });

  it('clears preset and favorite references when scenes disappear on refresh', async () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.presets = component.presets.map((preset) =>
      preset.key === 'main' ? { ...preset, sceneName: 'Deleted Scene' } : preset,
    );
    component.favoriteSceneNames = ['Deleted Scene'];
    obs.refreshScenes.and.resolveTo([{ sceneName: 'Camera', sceneIndex: 0 }]);
    component.currentScene = 'Camera';
    component.selectedScene = 'Camera';

    await component.refresh();

    expect(component.presets.find((preset) => preset.key === 'main')?.sceneName).toBe('');
    expect(component.favoriteSceneNames).toEqual([]);
  });

  it('keeps event automation disabled by default and persists configured rules', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    expect(component.automationEnabled).toBeFalse();
    component.scenes = [
      { sceneName: 'Camera', sceneIndex: 0 },
      { sceneName: 'Wicket', sceneIndex: 1 },
    ];
    component.automationRules = component.automationRules.map((rule) =>
      rule.event === 'WICKET' ? { ...rule, sceneName: 'Wicket' } : rule,
    );
    component.automationReturnScene = 'Camera';
    component.automationReturnDelay = 10;
    component.saveAutomationRules();
    const saved = JSON.parse(localStorage.getItem('cricpulse.obs-scene-presets.match-123') || '{}');
    expect(saved.automationEnabled).toBeFalse();
    expect(saved.automationReturnScene).toBe('Camera');
    expect(saved.automationReturnDelay).toBe(10);
    expect(
      saved.automationRules.find((rule: { event: string }) => rule.event === 'WICKET').sceneName,
    ).toBe('Wicket');
  });

  it('supports disabling rules, priority, cooldown, and persists advanced settings', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.scenes = [{ sceneName: 'Wicket', sceneIndex: 0 }];
    component.automationRules = component.automationRules.map((rule) =>
      rule.event === 'WICKET'
        ? { ...rule, sceneName: 'Wicket', enabled: false, priority: 95, cooldownSeconds: 30 }
        : rule,
    );
    component.saveAutomationRules();
    const saved = JSON.parse(localStorage.getItem('cricpulse.obs-scene-presets.match-123') || '{}');
    const wicket = saved.automationRules.find((rule: { event: string }) => rule.event === 'WICKET');
    expect(wicket.enabled).toBeFalse();
    expect(wicket.priority).toBe(95);
    expect(wicket.cooldownSeconds).toBe(30);
  });

  it('resets advanced automation rules to safe defaults', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.automationRules[0].enabled = false;
    component.automationRules[0].priority = 1;
    component.automationRules[0].cooldownSeconds = 99;
    component.resetAutomationRules();
    expect(component.automationRules[0].enabled).toBeTrue();
    expect(component.automationRules[0].priority).toBe(70);
    expect(component.automationRules[0].cooldownSeconds).toBe(3);
  });

  it('duplicates the active automation profile under a new name', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.newAutomationProfileName = 'Copy';
    component.saveAutomationProfile();
    const originalId = component.activeAutomationProfileId;
    component.newAutomationProfileName = 'Copy 2';
    component.duplicateAutomationProfile();
    expect(component.automationProfiles.length).toBe(2);
    expect(component.activeAutomationProfileId).not.toBe(originalId);
    expect(component.automationProfiles[1].name).toBe('Copy 2');
  });

  it('saves, applies, and deletes match-scoped automation profiles', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.scenes = [
      { sceneName: 'Camera', sceneIndex: 0 },
      { sceneName: 'Wicket', sceneIndex: 1 },
    ];
    component.newAutomationProfileName = 'T20 Match';
    component.automationRules = component.automationRules.map((rule) =>
      rule.event === 'WICKET' ? { ...rule, sceneName: 'Wicket' } : rule,
    );
    component.automationReturnScene = 'Camera';
    component.automationReturnDelay = 12;
    component.saveAutomationProfile();

    expect(component.automationProfiles.length).toBe(1);
    const profileId = component.activeAutomationProfileId;
    component.automationRules = component.automationRules.map((rule) => ({
      ...rule,
      sceneName: '',
    }));
    component.applyAutomationProfile(profileId);
    expect(component.automationRules.find((rule) => rule.event === 'WICKET')?.sceneName).toBe(
      'Wicket',
    );
    expect(component.automationReturnScene).toBe('Camera');
    expect(component.automationReturnDelay).toBe(12);

    component.deleteAutomationProfile(profileId);
    expect(component.automationProfiles).toEqual([]);
    expect(component.activeAutomationProfileId).toBe('');
  });

  it('cancels automatic return when the operator manually switches scenes', async () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.currentScene = 'Event Scene';
    component.selectedScene = 'Manual Scene';
    component['automationBaseScene'] = 'Main Scene';
    component['automationReturnTimer'] = setTimeout(() => undefined, 5000);
    await component.switchScene();
    expect(component['automationReturnTimer']).toBeUndefined();
    expect(component['automationBaseScene']).toBe('');
    expect(obs.switchScene).toHaveBeenCalledWith('Manual Scene');
  });
  it('automatically switches to a configured scene for a new six event', async () => {
    const fixture = TestBed.createComponent(ObsSceneControllerComponent);
    const component = fixture.componentInstance;
    component.automationEnabled = true;
    component.scenes = [
      { sceneName: 'Camera', sceneIndex: 0 },
      { sceneName: 'Six', sceneIndex: 1 },
    ];
    component.currentScene = 'Camera';
    component.automationRules = component.automationRules.map((rule) =>
      rule.event === 'SIX' ? { ...rule, sceneName: 'Six' } : rule,
    );
    const baseline = {
      inningsId: 'inn-1',
      runs: 10,
      wickets: 0,
      legalBalls: 1,
      eventVersion: 1,
      recentBalls: [{ deliveryId: 'd-1', totalRuns: 1, legalDelivery: true }],
    };
    component.onAutomationScore(baseline);
    component.onAutomationScore({
      ...baseline,
      runs: 16,
      legalBalls: 2,
      eventVersion: 2,
      recentBalls: [{ deliveryId: 'd-2', totalRuns: 6, legalDelivery: true }],
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(obs.switchScene).toHaveBeenCalledWith('Six');
    expect(component.automationStatus).toContain('Six');
    fixture.destroy();
  });

  it('uses the highest-priority rule when one delivery triggers multiple events', async () => {
    const fixture = TestBed.createComponent(ObsSceneControllerComponent);
    const component = fixture.componentInstance;
    component.automationEnabled = true;
    component.scenes = [
      { sceneName: 'Wicket', sceneIndex: 0 },
      { sceneName: 'Over', sceneIndex: 1 },
    ];
    component.automationRules = component.automationRules.map((rule) => {
      if (rule.event === 'WICKET')
        return { ...rule, sceneName: 'Wicket', priority: 100, cooldownSeconds: 0 };
      if (rule.event === 'OVER_COMPLETE')
        return { ...rule, sceneName: 'Over', priority: 40, cooldownSeconds: 0 };
      return rule;
    });
    const baseline = {
      inningsId: 'inn-1',
      runs: 20,
      wickets: 0,
      legalBalls: 5,
      eventVersion: 1,
      recentBalls: [{ deliveryId: 'd-5', totalRuns: 0, legalDelivery: true }],
    };
    component.onAutomationScore(baseline);
    component.onAutomationScore({
      ...baseline,
      wickets: 1,
      legalBalls: 6,
      eventVersion: 2,
      recentBalls: [{ deliveryId: 'd-6', totalRuns: 0, legalDelivery: true, wicketType: 'bowled' }],
    });
    await Promise.resolve();
    expect(obs.switchScene).toHaveBeenCalledOnceWith('Wicket');
    fixture.destroy();
  });

  it('ignores scorer messages from another match', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.automationEnabled = true;
    const message = {
      source: 'cricpulse-scorer',
      matchId: 'other-match',
      score: { inningsId: 'inn-1', runs: 10, wickets: 0, legalBalls: 1 },
    };
    (
      component as unknown as { acceptAutomationMessage: (value: typeof message) => void }
    ).acceptAutomationMessage(message);
    expect(component['previousAutomationScore']).toBeNull();
  });
  it('serializes rapid automation events and applies only the latest requested scene', async () => {
    const fixture = TestBed.createComponent(ObsSceneControllerComponent);
    const component = fixture.componentInstance;
    component.automationEnabled = true;
    component.currentScene = 'Camera';
    let finishFirst!: () => void;
    obs.switchScene.and.callFake((sceneName: string) => {
      if (sceneName === 'Wicket') return new Promise<void>((resolve) => (finishFirst = resolve));
      return Promise.resolve();
    });
    const runAutomation = (
      component as unknown as {
        runAutomationScene: (scene: string, label: string) => Promise<void>;
      }
    ).runAutomationScene.bind(component);

    const first = runAutomation('Wicket', 'Wicket');
    await Promise.resolve();
    const latest = runAutomation('Six', 'Six');

    expect(obs.switchScene).toHaveBeenCalledOnceWith('Wicket');
    finishFirst();
    await first;
    await latest;

    expect(obs.switchScene.calls.allArgs()).toEqual([['Wicket'], ['Six']]);
    expect(component.currentScene).toBe('Six');
    expect(component.automationStatus).toContain('Six');
    fixture.destroy();
  });

  it('prevents an in-flight automation response from overwriting a manual scene choice', async () => {
    const fixture = TestBed.createComponent(ObsSceneControllerComponent);
    const component = fixture.componentInstance;
    component.automationEnabled = true;
    component.currentScene = 'Camera';
    let finishAutomation!: () => void;
    obs.switchScene.and.callFake((sceneName: string) => {
      if (sceneName === 'Wicket')
        return new Promise<void>((resolve) => (finishAutomation = resolve));
      return Promise.resolve();
    });
    obs.currentScene.and.resolveTo('Manual');
    const runAutomation = (
      component as unknown as {
        runAutomationScene: (scene: string, label: string) => Promise<void>;
      }
    ).runAutomationScene.bind(component);

    const automation = runAutomation('Wicket', 'Wicket');
    await Promise.resolve();
    component.selectedScene = 'Manual';
    const manual = component.switchScene();
    finishAutomation();
    await automation;
    await manual;

    expect(obs.switchScene.calls.allArgs()).toEqual([['Wicket'], ['Manual']]);
    expect(component.currentScene).toBe('Manual');
    expect(component.automationStatus).not.toContain('Auto switched');
    expect(component['automationReturnTimer']).toBeUndefined();
    fixture.destroy();
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
, { value: reconnected$ });
    Object.defineProperty(obs, 'connectionState
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
        { provide: HttpClient, useValue: jasmine.createSpyObj<HttpClient>('HttpClient', ['get']) },
        {
          provide: LiveScoreService,
          useValue: jasmine.createSpyObj<LiveScoreService>('LiveScoreService', ['watch']),
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'match-123' } } },
        },
      ],
    });
  });

  it('restores saved presets and favorites for this match from browser storage', () => {
    localStorage.setItem(
      'cricpulse.obs-scene-presets.match-123',
      JSON.stringify({
        presets: [{ key: 'score', label: 'Scoreboard', sceneName: 'Camera + Score' }],
        favorites: ['Camera'],
      }),
    );

    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;

    expect(component.presets.find((preset) => preset.key === 'score')?.sceneName).toBe(
      'Camera + Score',
    );
    expect(component.favoriteSceneNames).toEqual(['Camera']);
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

  it('synchronizes selection when OBS changes its program scene externally', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.currentScene = 'Camera';
    component.selectedScene = 'Camera + Score';

    sceneChanged$.next('Camera + Score');

    expect(component.currentScene).toBe('Camera + Score');
    expect(component.selectedScene).toBe('Camera + Score');
    expect(component.notice).toContain('Camera + Score');
  });

  it('reports connection loss and clears active operation states', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.connecting = true;
    component.switching = true;

    connectionLost$.next('OBS connection closed. Reconnect to restore scene control.');

    expect(component.error).toContain('Reconnect');
    expect(component.notice).toBe('');
    expect(component.connecting).toBeFalse();
    expect(component.switching).toBeFalse();
  });

  it('switches only when the selected scene differs from current scene', async () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.scenes = [{ sceneName: 'Camera + Score', sceneIndex: 1 }];
    component.currentScene = 'Camera';
    obs.currentScene.and.resolveTo('Camera + Score');
    component.selectedScene = 'Camera + Score';

    await component.switchScene();

    expect(obs.switchScene).toHaveBeenCalledWith('Camera + Score');
    expect(obs.currentScene).toHaveBeenCalled();
    expect(component.notice).toContain('Camera');
  });

  it('assigns a preset to the selected scene and persists it', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.scenes = [
      { sceneName: 'Camera', sceneIndex: 0 },
      { sceneName: 'Camera + Score', sceneIndex: 1 },
    ];
    component.selectedScene = 'Camera + Score';

    component.assignSelectedToPreset('main');

    expect(component.presets.find((preset) => preset.key === 'main')?.sceneName).toBe(
      'Camera + Score',
    );
    expect(localStorage.getItem('cricpulse.obs-scene-presets.match-123')).toContain(
      'Camera + Score',
    );
  });

  it('switches to an assigned preset and rejects missing assignments', async () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.scenes = [{ sceneName: 'Camera + Score', sceneIndex: 1 }];
    component.presets = component.presets.map((preset) =>
      preset.key === 'score' ? { ...preset, sceneName: 'Camera + Score' } : preset,
    );

    await component.switchPreset('score');
    expect(obs.switchScene).toHaveBeenCalledWith('Camera + Score');

    await component.switchPreset('break');
    expect(component.error).toContain('Assign an available OBS scene');
  });

  it('toggles favorites and returns only available favorite scenes', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.scenes = [
      { sceneName: 'Camera', sceneIndex: 0 },
      { sceneName: 'Camera + Score', sceneIndex: 1 },
    ];

    component.toggleFavorite('Camera');
    component.toggleFavorite('Camera + Score');
    expect(component.favoriteScenes.map((scene) => scene.sceneName)).toEqual([
      'Camera',
      'Camera + Score',
    ]);

    component.toggleFavorite('Camera');
    expect(component.favoriteScenes.map((scene) => scene.sceneName)).toEqual(['Camera + Score']);
  });

  it('clears preset and favorite references when scenes disappear on refresh', async () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.presets = component.presets.map((preset) =>
      preset.key === 'main' ? { ...preset, sceneName: 'Deleted Scene' } : preset,
    );
    component.favoriteSceneNames = ['Deleted Scene'];
    obs.refreshScenes.and.resolveTo([{ sceneName: 'Camera', sceneIndex: 0 }]);
    component.currentScene = 'Camera';
    component.selectedScene = 'Camera';

    await component.refresh();

    expect(component.presets.find((preset) => preset.key === 'main')?.sceneName).toBe('');
    expect(component.favoriteSceneNames).toEqual([]);
  });

  it('keeps event automation disabled by default and persists configured rules', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    expect(component.automationEnabled).toBeFalse();
    component.scenes = [
      { sceneName: 'Camera', sceneIndex: 0 },
      { sceneName: 'Wicket', sceneIndex: 1 },
    ];
    component.automationRules = component.automationRules.map((rule) =>
      rule.event === 'WICKET' ? { ...rule, sceneName: 'Wicket' } : rule,
    );
    component.automationReturnScene = 'Camera';
    component.automationReturnDelay = 10;
    component.saveAutomationRules();
    const saved = JSON.parse(localStorage.getItem('cricpulse.obs-scene-presets.match-123') || '{}');
    expect(saved.automationEnabled).toBeFalse();
    expect(saved.automationReturnScene).toBe('Camera');
    expect(saved.automationReturnDelay).toBe(10);
    expect(
      saved.automationRules.find((rule: { event: string }) => rule.event === 'WICKET').sceneName,
    ).toBe('Wicket');
  });

  it('supports disabling rules, priority, cooldown, and persists advanced settings', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.scenes = [{ sceneName: 'Wicket', sceneIndex: 0 }];
    component.automationRules = component.automationRules.map((rule) =>
      rule.event === 'WICKET'
        ? { ...rule, sceneName: 'Wicket', enabled: false, priority: 95, cooldownSeconds: 30 }
        : rule,
    );
    component.saveAutomationRules();
    const saved = JSON.parse(localStorage.getItem('cricpulse.obs-scene-presets.match-123') || '{}');
    const wicket = saved.automationRules.find((rule: { event: string }) => rule.event === 'WICKET');
    expect(wicket.enabled).toBeFalse();
    expect(wicket.priority).toBe(95);
    expect(wicket.cooldownSeconds).toBe(30);
  });

  it('resets advanced automation rules to safe defaults', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.automationRules[0].enabled = false;
    component.automationRules[0].priority = 1;
    component.automationRules[0].cooldownSeconds = 99;
    component.resetAutomationRules();
    expect(component.automationRules[0].enabled).toBeTrue();
    expect(component.automationRules[0].priority).toBe(70);
    expect(component.automationRules[0].cooldownSeconds).toBe(3);
  });

  it('duplicates the active automation profile under a new name', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.newAutomationProfileName = 'Copy';
    component.saveAutomationProfile();
    const originalId = component.activeAutomationProfileId;
    component.newAutomationProfileName = 'Copy 2';
    component.duplicateAutomationProfile();
    expect(component.automationProfiles.length).toBe(2);
    expect(component.activeAutomationProfileId).not.toBe(originalId);
    expect(component.automationProfiles[1].name).toBe('Copy 2');
  });

  it('saves, applies, and deletes match-scoped automation profiles', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.scenes = [
      { sceneName: 'Camera', sceneIndex: 0 },
      { sceneName: 'Wicket', sceneIndex: 1 },
    ];
    component.newAutomationProfileName = 'T20 Match';
    component.automationRules = component.automationRules.map((rule) =>
      rule.event === 'WICKET' ? { ...rule, sceneName: 'Wicket' } : rule,
    );
    component.automationReturnScene = 'Camera';
    component.automationReturnDelay = 12;
    component.saveAutomationProfile();

    expect(component.automationProfiles.length).toBe(1);
    const profileId = component.activeAutomationProfileId;
    component.automationRules = component.automationRules.map((rule) => ({
      ...rule,
      sceneName: '',
    }));
    component.applyAutomationProfile(profileId);
    expect(component.automationRules.find((rule) => rule.event === 'WICKET')?.sceneName).toBe(
      'Wicket',
    );
    expect(component.automationReturnScene).toBe('Camera');
    expect(component.automationReturnDelay).toBe(12);

    component.deleteAutomationProfile(profileId);
    expect(component.automationProfiles).toEqual([]);
    expect(component.activeAutomationProfileId).toBe('');
  });

  it('cancels automatic return when the operator manually switches scenes', async () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.currentScene = 'Event Scene';
    component.selectedScene = 'Manual Scene';
    component['automationBaseScene'] = 'Main Scene';
    component['automationReturnTimer'] = setTimeout(() => undefined, 5000);
    await component.switchScene();
    expect(component['automationReturnTimer']).toBeUndefined();
    expect(component['automationBaseScene']).toBe('');
    expect(obs.switchScene).toHaveBeenCalledWith('Manual Scene');
  });
  it('automatically switches to a configured scene for a new six event', async () => {
    const fixture = TestBed.createComponent(ObsSceneControllerComponent);
    const component = fixture.componentInstance;
    component.automationEnabled = true;
    component.scenes = [
      { sceneName: 'Camera', sceneIndex: 0 },
      { sceneName: 'Six', sceneIndex: 1 },
    ];
    component.currentScene = 'Camera';
    component.automationRules = component.automationRules.map((rule) =>
      rule.event === 'SIX' ? { ...rule, sceneName: 'Six' } : rule,
    );
    const baseline = {
      inningsId: 'inn-1',
      runs: 10,
      wickets: 0,
      legalBalls: 1,
      eventVersion: 1,
      recentBalls: [{ deliveryId: 'd-1', totalRuns: 1, legalDelivery: true }],
    };
    component.onAutomationScore(baseline);
    component.onAutomationScore({
      ...baseline,
      runs: 16,
      legalBalls: 2,
      eventVersion: 2,
      recentBalls: [{ deliveryId: 'd-2', totalRuns: 6, legalDelivery: true }],
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(obs.switchScene).toHaveBeenCalledWith('Six');
    expect(component.automationStatus).toContain('Six');
    fixture.destroy();
  });

  it('uses the highest-priority rule when one delivery triggers multiple events', async () => {
    const fixture = TestBed.createComponent(ObsSceneControllerComponent);
    const component = fixture.componentInstance;
    component.automationEnabled = true;
    component.scenes = [
      { sceneName: 'Wicket', sceneIndex: 0 },
      { sceneName: 'Over', sceneIndex: 1 },
    ];
    component.automationRules = component.automationRules.map((rule) => {
      if (rule.event === 'WICKET')
        return { ...rule, sceneName: 'Wicket', priority: 100, cooldownSeconds: 0 };
      if (rule.event === 'OVER_COMPLETE')
        return { ...rule, sceneName: 'Over', priority: 40, cooldownSeconds: 0 };
      return rule;
    });
    const baseline = {
      inningsId: 'inn-1',
      runs: 20,
      wickets: 0,
      legalBalls: 5,
      eventVersion: 1,
      recentBalls: [{ deliveryId: 'd-5', totalRuns: 0, legalDelivery: true }],
    };
    component.onAutomationScore(baseline);
    component.onAutomationScore({
      ...baseline,
      wickets: 1,
      legalBalls: 6,
      eventVersion: 2,
      recentBalls: [{ deliveryId: 'd-6', totalRuns: 0, legalDelivery: true, wicketType: 'bowled' }],
    });
    await Promise.resolve();
    expect(obs.switchScene).toHaveBeenCalledOnceWith('Wicket');
    fixture.destroy();
  });

  it('ignores scorer messages from another match', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.automationEnabled = true;
    const message = {
      source: 'cricpulse-scorer',
      matchId: 'other-match',
      score: { inningsId: 'inn-1', runs: 10, wickets: 0, legalBalls: 1 },
    };
    (
      component as unknown as { acceptAutomationMessage: (value: typeof message) => void }
    ).acceptAutomationMessage(message);
    expect(component['previousAutomationScore']).toBeNull();
  });
  it('serializes rapid automation events and applies only the latest requested scene', async () => {
    const fixture = TestBed.createComponent(ObsSceneControllerComponent);
    const component = fixture.componentInstance;
    component.automationEnabled = true;
    component.currentScene = 'Camera';
    let finishFirst!: () => void;
    obs.switchScene.and.callFake((sceneName: string) => {
      if (sceneName === 'Wicket') return new Promise<void>((resolve) => (finishFirst = resolve));
      return Promise.resolve();
    });
    const runAutomation = (
      component as unknown as {
        runAutomationScene: (scene: string, label: string) => Promise<void>;
      }
    ).runAutomationScene.bind(component);

    const first = runAutomation('Wicket', 'Wicket');
    await Promise.resolve();
    const latest = runAutomation('Six', 'Six');

    expect(obs.switchScene).toHaveBeenCalledOnceWith('Wicket');
    finishFirst();
    await first;
    await latest;

    expect(obs.switchScene.calls.allArgs()).toEqual([['Wicket'], ['Six']]);
    expect(component.currentScene).toBe('Six');
    expect(component.automationStatus).toContain('Six');
    fixture.destroy();
  });

  it('prevents an in-flight automation response from overwriting a manual scene choice', async () => {
    const fixture = TestBed.createComponent(ObsSceneControllerComponent);
    const component = fixture.componentInstance;
    component.automationEnabled = true;
    component.currentScene = 'Camera';
    let finishAutomation!: () => void;
    obs.switchScene.and.callFake((sceneName: string) => {
      if (sceneName === 'Wicket')
        return new Promise<void>((resolve) => (finishAutomation = resolve));
      return Promise.resolve();
    });
    obs.currentScene.and.resolveTo('Manual');
    const runAutomation = (
      component as unknown as {
        runAutomationScene: (scene: string, label: string) => Promise<void>;
      }
    ).runAutomationScene.bind(component);

    const automation = runAutomation('Wicket', 'Wicket');
    await Promise.resolve();
    component.selectedScene = 'Manual';
    const manual = component.switchScene();
    finishAutomation();
    await automation;
    await manual;

    expect(obs.switchScene.calls.allArgs()).toEqual([['Wicket'], ['Manual']]);
    expect(component.currentScene).toBe('Manual');
    expect(component.automationStatus).not.toContain('Auto switched');
    expect(component['automationReturnTimer']).toBeUndefined();
    fixture.destroy();
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
, { value: connectionState$.asObservable() });
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
        { provide: HttpClient, useValue: jasmine.createSpyObj<HttpClient>('HttpClient', ['get']) },
        {
          provide: LiveScoreService,
          useValue: jasmine.createSpyObj<LiveScoreService>('LiveScoreService', ['watch']),
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'match-123' } } },
        },
      ],
    });
  });

  it('restores saved presets and favorites for this match from browser storage', () => {
    localStorage.setItem(
      'cricpulse.obs-scene-presets.match-123',
      JSON.stringify({
        presets: [{ key: 'score', label: 'Scoreboard', sceneName: 'Camera + Score' }],
        favorites: ['Camera'],
      }),
    );

    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;

    expect(component.presets.find((preset) => preset.key === 'score')?.sceneName).toBe(
      'Camera + Score',
    );
    expect(component.favoriteSceneNames).toEqual(['Camera']);
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

  it('synchronizes selection when OBS changes its program scene externally', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.currentScene = 'Camera';
    component.selectedScene = 'Camera + Score';

    sceneChanged$.next('Camera + Score');

    expect(component.currentScene).toBe('Camera + Score');
    expect(component.selectedScene).toBe('Camera + Score');
    expect(component.notice).toContain('Camera + Score');
  });

  it('reports connection loss and clears active operation states', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.connecting = true;
    component.switching = true;

    connectionLost$.next('OBS connection closed. Reconnect to restore scene control.');

    expect(component.error).toContain('Reconnect');
    expect(component.notice).toBe('');
    expect(component.connecting).toBeFalse();
    expect(component.switching).toBeFalse();
  });

  it('switches only when the selected scene differs from current scene', async () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.scenes = [{ sceneName: 'Camera + Score', sceneIndex: 1 }];
    component.currentScene = 'Camera';
    obs.currentScene.and.resolveTo('Camera + Score');
    component.selectedScene = 'Camera + Score';

    await component.switchScene();

    expect(obs.switchScene).toHaveBeenCalledWith('Camera + Score');
    expect(obs.currentScene).toHaveBeenCalled();
    expect(component.notice).toContain('Camera');
  });

  it('assigns a preset to the selected scene and persists it', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.scenes = [
      { sceneName: 'Camera', sceneIndex: 0 },
      { sceneName: 'Camera + Score', sceneIndex: 1 },
    ];
    component.selectedScene = 'Camera + Score';

    component.assignSelectedToPreset('main');

    expect(component.presets.find((preset) => preset.key === 'main')?.sceneName).toBe(
      'Camera + Score',
    );
    expect(localStorage.getItem('cricpulse.obs-scene-presets.match-123')).toContain(
      'Camera + Score',
    );
  });

  it('switches to an assigned preset and rejects missing assignments', async () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.scenes = [{ sceneName: 'Camera + Score', sceneIndex: 1 }];
    component.presets = component.presets.map((preset) =>
      preset.key === 'score' ? { ...preset, sceneName: 'Camera + Score' } : preset,
    );

    await component.switchPreset('score');
    expect(obs.switchScene).toHaveBeenCalledWith('Camera + Score');

    await component.switchPreset('break');
    expect(component.error).toContain('Assign an available OBS scene');
  });

  it('toggles favorites and returns only available favorite scenes', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.scenes = [
      { sceneName: 'Camera', sceneIndex: 0 },
      { sceneName: 'Camera + Score', sceneIndex: 1 },
    ];

    component.toggleFavorite('Camera');
    component.toggleFavorite('Camera + Score');
    expect(component.favoriteScenes.map((scene) => scene.sceneName)).toEqual([
      'Camera',
      'Camera + Score',
    ]);

    component.toggleFavorite('Camera');
    expect(component.favoriteScenes.map((scene) => scene.sceneName)).toEqual(['Camera + Score']);
  });

  it('clears preset and favorite references when scenes disappear on refresh', async () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.presets = component.presets.map((preset) =>
      preset.key === 'main' ? { ...preset, sceneName: 'Deleted Scene' } : preset,
    );
    component.favoriteSceneNames = ['Deleted Scene'];
    obs.refreshScenes.and.resolveTo([{ sceneName: 'Camera', sceneIndex: 0 }]);
    component.currentScene = 'Camera';
    component.selectedScene = 'Camera';

    await component.refresh();

    expect(component.presets.find((preset) => preset.key === 'main')?.sceneName).toBe('');
    expect(component.favoriteSceneNames).toEqual([]);
  });

  it('keeps event automation disabled by default and persists configured rules', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    expect(component.automationEnabled).toBeFalse();
    component.scenes = [
      { sceneName: 'Camera', sceneIndex: 0 },
      { sceneName: 'Wicket', sceneIndex: 1 },
    ];
    component.automationRules = component.automationRules.map((rule) =>
      rule.event === 'WICKET' ? { ...rule, sceneName: 'Wicket' } : rule,
    );
    component.automationReturnScene = 'Camera';
    component.automationReturnDelay = 10;
    component.saveAutomationRules();
    const saved = JSON.parse(localStorage.getItem('cricpulse.obs-scene-presets.match-123') || '{}');
    expect(saved.automationEnabled).toBeFalse();
    expect(saved.automationReturnScene).toBe('Camera');
    expect(saved.automationReturnDelay).toBe(10);
    expect(
      saved.automationRules.find((rule: { event: string }) => rule.event === 'WICKET').sceneName,
    ).toBe('Wicket');
  });

  it('supports disabling rules, priority, cooldown, and persists advanced settings', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.scenes = [{ sceneName: 'Wicket', sceneIndex: 0 }];
    component.automationRules = component.automationRules.map((rule) =>
      rule.event === 'WICKET'
        ? { ...rule, sceneName: 'Wicket', enabled: false, priority: 95, cooldownSeconds: 30 }
        : rule,
    );
    component.saveAutomationRules();
    const saved = JSON.parse(localStorage.getItem('cricpulse.obs-scene-presets.match-123') || '{}');
    const wicket = saved.automationRules.find((rule: { event: string }) => rule.event === 'WICKET');
    expect(wicket.enabled).toBeFalse();
    expect(wicket.priority).toBe(95);
    expect(wicket.cooldownSeconds).toBe(30);
  });

  it('resets advanced automation rules to safe defaults', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.automationRules[0].enabled = false;
    component.automationRules[0].priority = 1;
    component.automationRules[0].cooldownSeconds = 99;
    component.resetAutomationRules();
    expect(component.automationRules[0].enabled).toBeTrue();
    expect(component.automationRules[0].priority).toBe(70);
    expect(component.automationRules[0].cooldownSeconds).toBe(3);
  });

  it('duplicates the active automation profile under a new name', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.newAutomationProfileName = 'Copy';
    component.saveAutomationProfile();
    const originalId = component.activeAutomationProfileId;
    component.newAutomationProfileName = 'Copy 2';
    component.duplicateAutomationProfile();
    expect(component.automationProfiles.length).toBe(2);
    expect(component.activeAutomationProfileId).not.toBe(originalId);
    expect(component.automationProfiles[1].name).toBe('Copy 2');
  });

  it('saves, applies, and deletes match-scoped automation profiles', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.scenes = [
      { sceneName: 'Camera', sceneIndex: 0 },
      { sceneName: 'Wicket', sceneIndex: 1 },
    ];
    component.newAutomationProfileName = 'T20 Match';
    component.automationRules = component.automationRules.map((rule) =>
      rule.event === 'WICKET' ? { ...rule, sceneName: 'Wicket' } : rule,
    );
    component.automationReturnScene = 'Camera';
    component.automationReturnDelay = 12;
    component.saveAutomationProfile();

    expect(component.automationProfiles.length).toBe(1);
    const profileId = component.activeAutomationProfileId;
    component.automationRules = component.automationRules.map((rule) => ({
      ...rule,
      sceneName: '',
    }));
    component.applyAutomationProfile(profileId);
    expect(component.automationRules.find((rule) => rule.event === 'WICKET')?.sceneName).toBe(
      'Wicket',
    );
    expect(component.automationReturnScene).toBe('Camera');
    expect(component.automationReturnDelay).toBe(12);

    component.deleteAutomationProfile(profileId);
    expect(component.automationProfiles).toEqual([]);
    expect(component.activeAutomationProfileId).toBe('');
  });

  it('cancels automatic return when the operator manually switches scenes', async () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.currentScene = 'Event Scene';
    component.selectedScene = 'Manual Scene';
    component['automationBaseScene'] = 'Main Scene';
    component['automationReturnTimer'] = setTimeout(() => undefined, 5000);
    await component.switchScene();
    expect(component['automationReturnTimer']).toBeUndefined();
    expect(component['automationBaseScene']).toBe('');
    expect(obs.switchScene).toHaveBeenCalledWith('Manual Scene');
  });
  it('automatically switches to a configured scene for a new six event', async () => {
    const fixture = TestBed.createComponent(ObsSceneControllerComponent);
    const component = fixture.componentInstance;
    component.automationEnabled = true;
    component.scenes = [
      { sceneName: 'Camera', sceneIndex: 0 },
      { sceneName: 'Six', sceneIndex: 1 },
    ];
    component.currentScene = 'Camera';
    component.automationRules = component.automationRules.map((rule) =>
      rule.event === 'SIX' ? { ...rule, sceneName: 'Six' } : rule,
    );
    const baseline = {
      inningsId: 'inn-1',
      runs: 10,
      wickets: 0,
      legalBalls: 1,
      eventVersion: 1,
      recentBalls: [{ deliveryId: 'd-1', totalRuns: 1, legalDelivery: true }],
    };
    component.onAutomationScore(baseline);
    component.onAutomationScore({
      ...baseline,
      runs: 16,
      legalBalls: 2,
      eventVersion: 2,
      recentBalls: [{ deliveryId: 'd-2', totalRuns: 6, legalDelivery: true }],
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(obs.switchScene).toHaveBeenCalledWith('Six');
    expect(component.automationStatus).toContain('Six');
    fixture.destroy();
  });

  it('uses the highest-priority rule when one delivery triggers multiple events', async () => {
    const fixture = TestBed.createComponent(ObsSceneControllerComponent);
    const component = fixture.componentInstance;
    component.automationEnabled = true;
    component.scenes = [
      { sceneName: 'Wicket', sceneIndex: 0 },
      { sceneName: 'Over', sceneIndex: 1 },
    ];
    component.automationRules = component.automationRules.map((rule) => {
      if (rule.event === 'WICKET')
        return { ...rule, sceneName: 'Wicket', priority: 100, cooldownSeconds: 0 };
      if (rule.event === 'OVER_COMPLETE')
        return { ...rule, sceneName: 'Over', priority: 40, cooldownSeconds: 0 };
      return rule;
    });
    const baseline = {
      inningsId: 'inn-1',
      runs: 20,
      wickets: 0,
      legalBalls: 5,
      eventVersion: 1,
      recentBalls: [{ deliveryId: 'd-5', totalRuns: 0, legalDelivery: true }],
    };
    component.onAutomationScore(baseline);
    component.onAutomationScore({
      ...baseline,
      wickets: 1,
      legalBalls: 6,
      eventVersion: 2,
      recentBalls: [{ deliveryId: 'd-6', totalRuns: 0, legalDelivery: true, wicketType: 'bowled' }],
    });
    await Promise.resolve();
    expect(obs.switchScene).toHaveBeenCalledOnceWith('Wicket');
    fixture.destroy();
  });

  it('ignores scorer messages from another match', () => {
    const component = TestBed.createComponent(ObsSceneControllerComponent).componentInstance;
    component.automationEnabled = true;
    const message = {
      source: 'cricpulse-scorer',
      matchId: 'other-match',
      score: { inningsId: 'inn-1', runs: 10, wickets: 0, legalBalls: 1 },
    };
    (
      component as unknown as { acceptAutomationMessage: (value: typeof message) => void }
    ).acceptAutomationMessage(message);
    expect(component['previousAutomationScore']).toBeNull();
  });
  it('serializes rapid automation events and applies only the latest requested scene', async () => {
    const fixture = TestBed.createComponent(ObsSceneControllerComponent);
    const component = fixture.componentInstance;
    component.automationEnabled = true;
    component.currentScene = 'Camera';
    let finishFirst!: () => void;
    obs.switchScene.and.callFake((sceneName: string) => {
      if (sceneName === 'Wicket') return new Promise<void>((resolve) => (finishFirst = resolve));
      return Promise.resolve();
    });
    const runAutomation = (
      component as unknown as {
        runAutomationScene: (scene: string, label: string) => Promise<void>;
      }
    ).runAutomationScene.bind(component);

    const first = runAutomation('Wicket', 'Wicket');
    await Promise.resolve();
    const latest = runAutomation('Six', 'Six');

    expect(obs.switchScene).toHaveBeenCalledOnceWith('Wicket');
    finishFirst();
    await first;
    await latest;

    expect(obs.switchScene.calls.allArgs()).toEqual([['Wicket'], ['Six']]);
    expect(component.currentScene).toBe('Six');
    expect(component.automationStatus).toContain('Six');
    fixture.destroy();
  });

  it('prevents an in-flight automation response from overwriting a manual scene choice', async () => {
    const fixture = TestBed.createComponent(ObsSceneControllerComponent);
    const component = fixture.componentInstance;
    component.automationEnabled = true;
    component.currentScene = 'Camera';
    let finishAutomation!: () => void;
    obs.switchScene.and.callFake((sceneName: string) => {
      if (sceneName === 'Wicket')
        return new Promise<void>((resolve) => (finishAutomation = resolve));
      return Promise.resolve();
    });
    obs.currentScene.and.resolveTo('Manual');
    const runAutomation = (
      component as unknown as {
        runAutomationScene: (scene: string, label: string) => Promise<void>;
      }
    ).runAutomationScene.bind(component);

    const automation = runAutomation('Wicket', 'Wicket');
    await Promise.resolve();
    component.selectedScene = 'Manual';
    const manual = component.switchScene();
    finishAutomation();
    await automation;
    await manual;

    expect(obs.switchScene.calls.allArgs()).toEqual([['Wicket'], ['Manual']]);
    expect(component.currentScene).toBe('Manual');
    expect(component.automationStatus).not.toContain('Auto switched');
    expect(component['automationReturnTimer']).toBeUndefined();
    fixture.destroy();
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
