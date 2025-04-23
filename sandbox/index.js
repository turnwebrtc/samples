"use strict";

const startButton = document.getElementById("startButton");
const hangupButton = document.getElementById("hangupButton");

const localVideo = document.getElementById("localVideo");
const remoteVideos = document.getElementById("remoteVideos");

const roomTextbox = document.getElementById("room-textbox");
const apiKeyTextbox = document.getElementById("apiKey-textbox");
const offerDataChannelCheckbox = document.getElementById("offer-datachannel");
const offerLocalVideoCheckbox = document.getElementById("offer-localvideo");
const offerToReceiveVideoCheckbox =
  document.getElementById("offer-receivevideo");
const dataChannelTextField = document.getElementById("dataChannelTextField");
const dataChannelMessageTextField = document.getElementById("message-textbox");
const sendMessageButton = document.getElementById("sendMessageButton");
const offerRelayOnly = document.getElementById("offer-relayonly");
const prefersOfferer = document.getElementById("offer-prefersofferer");

let pc;
let localStream;
let pendingCandidates;
let dataChannel;

function clearDatachannelLog() {
  dataChannelTextField.innerHTML = "";
}

let lastLogTime = 0;
var messageLoggingRateLimitMs = 200;
function logDatachannelText(text, sent) {
  let isArrayBuffer = text instanceof ArrayBuffer;
  if (isArrayBuffer) {
    const now = performance.now();
    if (now - lastLogTime < messageLoggingRateLimitMs) {
      return; // drop message
    }
    lastLogTime = now;
    console.log(text);
    // text = btoa(String.fromCharCode(...new Uint8Array(text)));
    text =
      "[" +
      Array.prototype.map
        .call(
          new Uint8Array(text),
          (x) => "0x" + x.toString(16).toUpperCase().padStart(2, "0")
        )
        .join(",") +
      "]";
  }
  const dataChannelTextField = document.getElementById("dataChannelTextField");
  const textClass = sent ? "tx-msg" : "rx-msg";
  const symbol = (isArrayBuffer ? "#" : "") + (sent ? "&lt;" : "&gt;");
  dataChannelTextField.innerHTML += `<div class="${textClass}">${symbol} ${text}</div>`;
  // scroll to bottom
  const distanceFromBottom = Math.abs(
    Math.abs(
      Math.abs(dataChannelTextField.scrollTop) -
        Math.abs(dataChannelTextField.scrollHeight)
    ) - Math.abs(dataChannelTextField.clientHeight)
  );
  if (sent || distanceFromBottom < 80) {
    dataChannelTextField.scrollTop = dataChannelTextField.scrollHeight;
  }
}

function setCookie(name, value, days) {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getCookie(name) {
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

class WebsocketChannel {
  constructor(url) {
    this.url = url;
  }

  connect() {
    this.close();
    this.websocket = new WebSocket(this.url);
    // this.websocket.onclose = () => {
    //   startButton.disabled = false;
    // };
    // this.websocket.onopen = () => {
    //   startButton.disabled = true;
    // };
  }

  close() {
    if (this.websocket != null) {
      this.websocket.close();
      this.websocket = null;
    }
  }

  postMessage(message) {
    if (this.websocket == null) return;
    const rawMessage = JSON.stringify(message);
    this.websocket.send(rawMessage);
  }

  set onmessage(handler) {
    if (this.websocket == null) return;
    this.websocket.onmessage = (event) => {
      handler(JSON.parse(event.data));
    };
  }
}

const signaling = new WebsocketChannel("");

startButton.onclick = async () => {
  dataChannelTextField.innerHTML = "";
  if (roomTextbox.value.length < 1) {
    alert("you must enter a room");
    return;
  }
  if (offerLocalVideoCheckbox.checked) {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
  } else {
    localStream = null;
  }
  localVideo.srcObject = localStream;

  startButton.disabled = true;
  hangupButton.disabled = false;

  // persist inputs
  setCookie("savedNamespace", roomTextbox.value, 365);
  setCookie("savedApiKey", apiKeyTextbox.value, 365);


  signaling.url =
    "wss://turnwebrtc.com/api/relay/" +
    encodeURIComponent(roomTextbox.value) +
    (prefersOfferer.checked ? "/prefers_offerer" : "") +
    "?apikey=" + encodeURIComponent(apiKeyTextbox.value);
  signaling.connect();
  pendingCandidates = [];
  signaling.onmessage = async (e) => {
    // if (!localStream) {
    //   console.log("not ready yet");
    //   return;
    // }
    if (e.role == "o") {
      await createPeerConnection(true);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      signaling.postMessage({ type: "offer", sdp: offer.sdp });
      return;
    }
    if (!pc) {
      await createPeerConnection();
    }
    switch (e.type) {
      case "offer":
        handleOffer(e);
        break;
      case "answer":
        handleAnswer(e);
        break;
      case "candidate":
        handleCandidate(e);
        break;
      case "bye":
        if (pc) {
          hangup();
        }
        break;
      default:
        console.log("unhandled", e);
        break;
    }
  };
};

hangupButton.onclick = async () => {
  hangup();
};

async function hangup() {
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }
  if (dataChannel) {
    dataChannel.close();
    dataChannel = null;
  }
  if (pc) {
    pc.close();
    pc = null;
  }
  signaling.close();
  startButton.disabled = false;
  hangupButton.disabled = true;
  location.reload();
}

async function fetchTurnCredentials() {
  try {
    const apiKey = apiKeyTextbox.value.trim();
    const resp = await fetch("https://turnwebrtc.com/api/credentials", {
      headers: {
        Authorization: "Basic " + btoa(apiKey + ":"),
      },
    });
    if (!resp.ok) throw new Error("cred fetch failed " + resp.status);
    return await resp.json();
  } catch (e) {
    console.error(e);
    return [{ urls: ["stun:stun.l.google.com:19302"] }];
  }
}

function sendDataChannelMessage(message) {
  if (!dataChannel) return;
  dataChannel.send(message);
  logDatachannelText(message, true);
}

async function createPeerConnection(offerer) {
  if (pc) {
    pc.close();
    pc = null;
  }

  while (remoteVideos.firstChild) {
    remoteVideos.removeChild(remoteVideos.lastChild);
  }

  let rtcconfig = {
    iceServers: await fetchTurnCredentials(),
  };
  if (offerRelayOnly.checked) {
    rtcconfig.iceTransportPolicy = "relay";
  }
  pc = new RTCPeerConnection(rtcconfig);

  pc.onicecandidate = (e) => {
    const message = {
      type: "candidate",
      candidate: null,
    };
    if (e.candidate) {
      message.candidate = e.candidate.candidate;
      message.sdpMid = e.candidate.sdpMid;
      message.sdpMLineIndex = e.candidate.sdpMLineIndex;
    }
    console.log("generatedCandidate:", message.candidate);
    signaling.postMessage(message);
  };
  pc.ontrack = (e) => {
    for (let i = 0; i < e.streams.length; i++) {
      let videoDiv = document.createElement("div");
      videoDiv.className = "remoteVideo";

      let label = document.createElement("span");
      label.className = "videoLabel";
      label.textContent = e.streams[i].id;
      videoDiv.appendChild(label);

      let newVideo = document.createElement("video");
      newVideo.id = "remoteVideo-" + e.streams[i].id;
      newVideo.setAttribute("playsinline", "");
      newVideo.setAttribute("autoplay", "");
      newVideo.srcObject = e.streams[i];
      videoDiv.appendChild(newVideo);

      remoteVideos.appendChild(videoDiv);
    }
  };
  pc.ondatachannel = (e) => {
    dataChannel = e.channel;
    dataChannel.onmessage = (event) => {
      logDatachannelText(event.data, false);
    };
    dataChannel.onopen = () => {
      sendMessageButton.disabled = false;
      sendDataChannelMessage("received data channel (likely answerer)");
    };
    dataChannel.onclose = () => {
      sendMessageButton.disabled = true;
    };
  };
  pc.onconnectionstatechange = () => {
    switch (pc.connectionState) {
      case "connected":
        signaling.close();
        startButton.disabled = true;
        hangupButton.disabled = false;
        break;
      case "disconnected":
      case "failed":
      case "closed":
        let rvElements = remoteVideos.getElementsByTagName("video");
        for (let rv of rvElements) {
          rv.srcObject = null;
        }

        signaling.close();
        startButton.disabled = false;
        hangupButton.disabled = true;
        break;
      default:
        break;
    }
  };
  if (localStream) {
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
  }
  if (offerer && offerToReceiveVideoCheckbox.checked) {
    pc.addTransceiver("video", { direction: "recvonly" });
    pc.addTransceiver("video", { direction: "recvonly" });
  }

  if (offerer && offerDataChannelCheckbox.checked) {
    dataChannel = pc.createDataChannel("some-channel");
    dataChannel.onmessage = (event) => {
      logDatachannelText(event.data, false);
    };
    dataChannel.onclose = () => {
      sendMessageButton.disabled = true;
    };
    dataChannel.onopen = () => {
      sendMessageButton.disabled = false;
      sendDataChannelMessage("create data channel (likely offerer)");
    };
  }
}

async function handleOffer(offer) {
  console.log("handleOffer:", offer);
  await pc.setRemoteDescription(offer);

  // flush candidates
  for (let candidate of pendingCandidates) {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }
  pendingCandidates = [];

  const answer = await pc.createAnswer();
  signaling.postMessage({ type: "answer", sdp: answer.sdp });
  await pc.setLocalDescription(answer);
}

async function handleAnswer(answer) {
  if (!pc) {
    console.error("no peerconnection");
    return;
  }
  await pc.setRemoteDescription(answer);
}

async function handleCandidate(candidate) {
  console.log("receivedCandidate:", candidate);
  if (pc && pc.remoteDescription) {
    if (!candidate.candidate) {
      await pc.addIceCandidate(null);
    } else {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  } else {
    pendingCandidates.push(candidate);
  }
}

sendMessageButton.onclick = () => {
  sendDataChannelMessage(dataChannelMessageTextField.value);
};

function setupCheckboxSave(checkboxID, cookieID) {
  const savedValue = getCookie(cookieID);
  const checkboxElement = document.getElementById(checkboxID);
  if (savedValue !== null) {
    checkboxElement.checked = savedValue;
  }
  checkboxElement.addEventListener("change", () => {
    setCookie(cookieID, checkboxElement.checked, 365);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded");
});

const savedRoom = getCookie("savedNamespace");
if (savedRoom !== null) {
  roomTextbox.value = savedRoom;
}
roomTextbox.addEventListener("input", () => {
  setCookie("savedNamespace", roomTextbox.value, 365);
});

const savedApiKey = getCookie("savedApiKey");
if (savedApiKey !== null) {
  apiKeyTextbox.value = savedApiKey;
}
apiKeyTextbox.addEventListener("input", () => {
  setCookie("savedApiKey", apiKeyTextbox.value, 365);
});

setupCheckboxSave("offer-datachannel", "offerdatachannel");
setupCheckboxSave("offer-localvideo", "localvideo");
setupCheckboxSave("offer-receivevideo", "receivevideo");
setupCheckboxSave("offer-relayonly", "relayonly");
