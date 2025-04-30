# TurnWebRTC Samples

> This repository contains the **open-source demo applications** that power the
> "Tools & Samples" section on [turnwebrtc.com/tools](https://turnwebrtc.com/tools).

They are intentionally kept **framework-free** (just plain HTML, CSS and
JavaScript) so you can copy-paste them into your own projects or drop them on
any static host (GitHub Pages, Netlify, S3, etc.) without a build step.

---

## Available demos

| Path | Description |
|------|-------------|
| [`sandbox/`](./sandbox) | A full-featured sandbox that lets you spin-up a peer-to-peer **or TURN-relayed** WebRTC call in seconds. Includes video, multiple peers, data-channel logging, relay-only toggle, and automatic fetching of temporary TURN credentials via the TurnWebRTC REST API. |
| [`simple-datachannel/`](./simple-datachannel) | A simple example that creates a WebRTC **data channel** between two browsers. Perfect starting point if you only need real-time messaging. |

---

## Quick start

1. Clone the repo (or download the directory you are interested in).
2. Open the corresponding `index.html` in any modern browser **or** serve the
   files from a local web-server (`python -m http.server`, `npx serve`, etc.).
3. Leave the default `demo-api-key` to try our public demo TURN servers, or
   replace it with your own key generated in the
   [TurnWebRTC portal](https://turnwebrtc.com/login).

That’s it! Open the same page on a second device / browser, join the same room
name, and watch packets flow through our global network.

---

## Related links

* **API Docs:** <https://turnwebrtc.com/api-docs>
* **Company homepage:** <https://turnwebrtc.com>
* **Live Sandbox demo:** <https://turnwebrtc.com/sandbox>
* **Live simple data channel demo:** <https://turnwebrtc.com/tools/simple-datachannel>

---

© 2025 Tide Software Inc — MIT License
