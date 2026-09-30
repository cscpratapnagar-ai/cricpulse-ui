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
