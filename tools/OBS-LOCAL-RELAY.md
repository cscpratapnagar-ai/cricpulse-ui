# CricPulse OBS Local Relay

The scorer and OBS Browser Source may run in separate Chromium profiles. BrowserChannel
is not guaranteed to cross that boundary. This optional loopback relay carries the
scorer's local offline score to the OBS overlay without internet access.

## Start

1. Install Python 3 on the streaming PC.
2. From the repository root, run `start-obs-local-relay.bat`.
3. Keep the terminal window open while scoring and streaming.
4. Open the CricPulse scorer and OBS overlay on the same PC.
5. Allow local connections if Windows Firewall prompts. The relay binds only to
   `127.0.0.1`, not to the LAN or public network.

The relay listens at `ws://127.0.0.1:8765/ws`. It forwards messages only between
clients connected to this local process. If it is not running, the app continues
using BroadcastChannel where available and server-backed live updates when online.

Do not expose this port through router port forwarding or change the bind address.
