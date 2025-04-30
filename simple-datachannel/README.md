# Ultra-simple WebRTC Data-Channel sample

This folder contains the **bare-minimum, copy/paste friendly** example for
opening a WebRTC data-channel through the
[TurnWebRTC](https://turnwebrtc.com) network.

* One HTML file (≈120 LOC) – no build step, no framework.
* Uses TurnWebRTC **signaling** (`wss://turnwebrtc.com/api/relay/...`) and
  fetches fresh **TURN** credentials via the REST API.
* Click **Connect** → the button becomes **Hang up**.  When the connection is
  closed the page simply reloads.

---

## Local usage

There is no backend needed for this demo. Just open the index.html in your browser. 

In a production scenario, your API key should not be shared, so you would likely need a backend that talks to [TurnWebRTC backend](https://turnwebrtc.com/api-docs)</a>.

---

MIT License • © 2025 Tide Software Inc
