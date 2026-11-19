import { LiveScoreConnectionState } from '../../../../core/services/live-score.service';
import { PublicLiveScoreComponent } from './public-live-score.component';

describe('PublicLiveScoreComponent', () => {
  it('should expose the component class', () => expect(PublicLiveScoreComponent).toBeTruthy());

  it('labels every public live connection state clearly', () => {
    const component = Object.create(PublicLiveScoreComponent.prototype) as PublicLiveScoreComponent;

    expect(component.connectionLabel('CONNECTED')).toBe('LIVE UPDATES CONNECTED');
    expect(component.connectionLabel('CONNECTING')).toBe('CONNECTING TO LIVE SCORE');
    expect(component.connectionLabel('RECONNECTING')).toBe('RECONNECTING');
    expect(component.connectionLabel('ERROR')).toBe('LIVE FEED INTERRUPTED');
    expect(component.connectionLabel('DISCONNECTED')).toBe('LIVE FEED DISCONNECTED');
  });

  it('explains that the last confirmed score remains visible during reconnect', () => {
    const component = Object.create(PublicLiveScoreComponent.prototype) as PublicLiveScoreComponent;
    const state: LiveScoreConnectionState = 'RECONNECTING';

    expect(component.connectionMessage(state)).toContain('last confirmed score');
    expect(component.connectionMessage('CONNECTED')).toContain('Instant score updates');
    expect(component.connectionMessage('ERROR')).toContain('Retrying automatically');
  });
});
