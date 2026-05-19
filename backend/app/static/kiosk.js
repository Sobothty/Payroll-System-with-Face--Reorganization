const state = {
  scanning: false,
};

const video = document.getElementById("feed");
const scanButton = document.getElementById("scanButton");
const statusCopy = document.getElementById("statusCopy");
const statusPill = document.getElementById("statusPill");
const pulseRings = document.getElementById("pulseRings");
const zoomFrame = document.getElementById("zoomFrame");
const flashOverlay = document.getElementById("flashOverlay");
const resultCard = document.getElementById("resultCard");
const resultBadge = document.getElementById("resultBadge");
const resultIcon = document.getElementById("resultIcon");
const resultName = document.getElementById("resultName");
const resultSubtitle = document.getElementById("resultSubtitle");
const resultType = document.getElementById("resultType");
const resultTime = document.getElementById("resultTime");
const resultConfidence = document.getElementById("resultConfidence");
const resultDepartment = document.getElementById("resultDepartment");
const activityFeed = document.getElementById("activityFeed");
const clock = document.getElementById("clock");
const dateLine = document.getElementById("dateLine");
const scanLine = document.getElementById("scanLine");

function formatClock() {
  const now = new Date();
  clock.textContent = now.toLocaleTimeString("en-GB");
  dateLine.textContent = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function setUIState(mode, data = {}) {
  pulseRings.classList.remove("active");
  zoomFrame.className = "zoom-frame";
  flashOverlay.className = "flash-overlay";
  resultCard.className = "result-card";
  scanLine.style.animationDuration = "2.5s";

  if (mode === "idle") {
    scanButton.disabled = false;
    scanButton.textContent = "Check In / Check Out";
    statusCopy.textContent = "Camera ready · Position face inside the frame";
    statusPill.textContent = "Camera ready";
    return;
  }

  if (mode === "scanning") {
    scanButton.disabled = true;
    scanButton.textContent = "Scanning...";
    statusCopy.textContent = "Detecting face...";
    statusPill.textContent = "Hold still — scanning in progress";
    pulseRings.classList.add("active");
    scanLine.style.animationDuration = "1.2s";
    return;
  }

  if (mode === "detected") {
    statusCopy.textContent = "Face detected — matching identity...";
    statusPill.textContent = "Matching against employee database";
    pulseRings.classList.add("active");
    zoomFrame.classList.add("visible");
    return;
  }

  if (mode === "success") {
    resultCard.classList.add("success");
    zoomFrame.classList.add("visible", "success");
    flashOverlay.classList.add("success");
    resultBadge.textContent = "VERIFIED";
    resultIcon.textContent = "✓";
    resultName.textContent = data.employee_name;
    resultSubtitle.textContent = `${data.department} · ${data.action.replace("_", " ")}`;
    resultType.textContent = data.action.replace("_", " ");
    resultTime.textContent = data.time;
    resultConfidence.textContent = `${data.confidence}%`;
    resultDepartment.textContent = data.department;
    statusCopy.textContent = "Identity verified";
    statusPill.textContent = "Attendance recorded";
    scanButton.textContent = "Verified";
    return;
  }

  resultCard.classList.add("denied");
  zoomFrame.classList.add("visible", "denied");
  flashOverlay.classList.add("denied");
  resultBadge.textContent = "NOT RECOGNIZED";
  resultIcon.textContent = "✕";
  resultName.textContent = "Face not recognized";
  resultSubtitle.textContent = "No employee match found";
  resultType.textContent = "Denied";
  resultTime.textContent = new Date().toLocaleTimeString("en-GB");
  resultConfidence.textContent = "--";
  resultDepartment.textContent = "--";
  statusCopy.textContent = "No match found";
  statusPill.textContent = "Please try again";
  scanButton.textContent = "Denied";
}

async function hydrateActivity() {
  const response = await fetch("/kiosk/activity");
  const items = await response.json();
  activityFeed.innerHTML = items
    .map(
      (item) => `
      <div class="activity-item">
        <div class="avatar ${item.action}">${item.initials}</div>
        <div class="activity-meta">
          <strong>${item.name}</strong>
          <span>${item.department} · ${item.action.replace("_", " ")}</span>
        </div>
        <div class="activity-time">${item.time}</div>
      </div>
    `
    )
    .join("");
}

async function handleScan() {
  if (state.scanning) return;
  state.scanning = true;
  setUIState("scanning");

  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  canvas.getContext("2d").drawImage(video, 0, 0, 640, 480);

  canvas.toBlob(async (blob) => {
    const form = new FormData();
    form.append("image", blob, "scan.jpg");
    setTimeout(() => setUIState("detected"), 900);

    try {
      const response = await fetch("/kiosk/scan", { method: "POST", body: form });
      const data = await response.json();
      if (data.status === "success") {
        setUIState("success", data);
      } else {
        setUIState("denied");
      }
      await hydrateActivity();
    } catch (_error) {
      setUIState("denied");
    }

    setTimeout(() => {
      setUIState("idle");
      state.scanning = false;
    }, 3500);
  }, "image/jpeg", 0.9);
}

async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480, facingMode: "user" },
  });
  video.srcObject = stream;
}

scanButton.addEventListener("click", handleScan);
setInterval(formatClock, 1000);
setInterval(hydrateActivity, 5000);
formatClock();
hydrateActivity();
startCamera();
