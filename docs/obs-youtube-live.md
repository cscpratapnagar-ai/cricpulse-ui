# CricPulse OBS → YouTube Live

## Production flow

CricPulse scorer → public realtime score → OBS Browser Source → OBS scene → YouTube Live.

The CricPulse overlay is intentionally public so OBS does not need a logged-in browser session. The authenticated Broadcast Control page is only used to generate and preview scene URLs.

## OBS Browser Source

Use the automatic overlay URL:

`https://<cricpulse-host>/broadcast/<match-id>/overlay?mode=auto`

Recommended Browser Source settings:

- Width: 1920
- Height: 1080
- FPS: 30
- Background: transparent
- Keep source active while the scene is live

Add the Browser Source above the camera/video layer in the OBS scene.

## YouTube Live

Configure the YouTube Live stream in OBS using the stream credentials supplied by YouTube.

CricPulse must never store the YouTube stream key. The key belongs only in the OBS/YouTube streaming configuration.

## Automatic graphics

The `auto` overlay consumes the same ordered public live state used by viewers and can show:

- FOUR
- SIX
- WICKET
- MILESTONE
- OVER COMPLETE
- MATCH RESULT

The overlay also keeps a live score strip visible.

## Manual graphics

The control page also exposes individual Browser Source URLs for:

- Score strip
- Batter card
- Bowler card
- Partnership
- FOUR
- SIX
- WICKET
- Milestone
- Over complete
- Match result

## Release test

Before calling Broadcast V1 production-ready, run a real match through:

1. Open Broadcast Control as an authorized match manager.
2. Copy the automatic Browser Source URL.
3. Open it in a browser and verify transparent overlay rendering.
4. Add the URL to an OBS Browser Source.
5. Start a test match and record deliveries.
6. Verify score updates in OBS without refreshing the Browser Source.
7. Verify FOUR/SIX/WICKET/over/milestone/result graphics.
8. Start OBS streaming to a private/unlisted YouTube Live test.
9. Verify the YouTube output shows the camera/video plus CricPulse graphics.
10. Reconnect the browser/network and verify the overlay recovers from authoritative REST state.

## OBS WebSocket Scene Controller

The authenticated Broadcast Control page links to the direct OBS scene controller at:

`/broadcast/<match-id>/obs`

- OBS Studio 28+ includes WebSocket v5. Enable it under **Tools → WebSocket Server Settings**.
- Default endpoint is `ws://127.0.0.1:4455`. Use the OBS server password if authentication is enabled.
- The controller requests the scene list, identifies the current Program scene, and sends `SetCurrentProgramScene` requests when the operator confirms a switch. It does not control OBS Preview scenes or transition settings.
- Credentials are held in the page's memory only; they are not written to local storage or sent to CricPulse's API.
- Keep OBS WebSocket restricted to localhost or a trusted LAN. Do not expose it directly to the public internet.
- A page served over HTTPS cannot connect to an insecure `ws://` endpoint because of browser mixed-content rules. Use a local HTTP deployment or configured `wss://` endpoint.
