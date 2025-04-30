# TurnWebRTC **Sandbox**

An all-in-one playground that lets you establish a WebRTC connection (video,
audio **and** data-channel) through the TurnWebRTC network in just a few
clicks.

Every component is pure vanilla JS so you can view-source in the browser or
copy the file straight into your own experiments.

You can use a live demo at https://turnwebrtc.com/sandbox/.

---

## Features

* Fetches fresh **TURN credentials** from
  [`/api/credentials`](https://turnwebrtc.com/api-docs#tag/credentials) using
  a Basic-Auth header (1-hour lifetime)
* Toggle peer-to-peer vs **relay-only** mode to verify that media really flows
  though TURN
* Support for sending and receiving video/audio
* **Data-channel** tester with live TX / RX log (hex-dump for binary payloads)
* Works on desktop & mobile; Firefox, Chrome, Edge, Opera, Safari

---

## Running locally

There is no backend needed for this demo. Just open the index.html in your browser. 

In a production scenario, your API key should not be shared, so you would likely need a backend that talks to [TurnWebRTC backend](https://turnwebrtc.com/api-docs)</a>.

---

## Using your own API key

1. Log in to <https://turnwebrtc.com/portal> and create an API key.
2. Replace `demo-api-key` in the UI (first input field) with your key.
3. Join a unique room name. Peers that join the same room will automatically
   discover each other via the built-in signaling server.

---

## File overview

| File | Purpose |
|------|---------|
| `index.html` | Mark-up and minimal styling |
| `index.css`  | Utility classes & layout tweaks |
| `index.js`   | All WebRTC + signaling logic (≈400 loc) |

Happy hacking — and let us know what you build!  <https://turnwebrtc.com/contact>
