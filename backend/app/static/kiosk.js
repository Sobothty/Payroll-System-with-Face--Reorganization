const state = {
  scanning: false,
  uiMode: "idle",
  liveFace: null,
  detector: null,
  trackingEnabled: false,
  detectPending: false,
  lastDetectAt: 0,
  resetTimer: null,
  detectedTimer: null,
  popupTimer: null,
  lastCaptureDataUrl: null,
};

const video = document.getElementById("feed");
const scanButton = document.getElementById("scanButton");
const retryButton = document.getElementById("retryButton");
const panelRetryButton = document.getElementById("panelRetryButton");
const statusCopy = document.getElementById("statusCopy");
const statusPill = document.getElementById("statusPill");
const pulseRings = document.getElementById("pulseRings");
const zoomFrame = document.getElementById("zoomFrame");
const flashOverlay = document.getElementById("flashOverlay");
const cameraFrame = document.getElementById("cameraFrame");
const frameChip = document.getElementById("frameChip");
const clock = document.getElementById("clock");
const dateLine = document.getElementById("dateLine");

const resultBadge = document.getElementById("resultBadge");
const resultTitle = document.getElementById("resultTitle");
const resultMessage = document.getElementById("resultMessage");
const nextActionPill = document.getElementById("nextActionPill");
const modeCopy = document.getElementById("modeCopy");
const capturePreview = document.getElementById("capturePreview");
const snapshotPlaceholder = document.getElementById("snapshotPlaceholder");

const employeeName = document.getElementById("employeeName");
const employeeCode = document.getElementById("employeeCode");
const employeeDepartment = document.getElementById("employeeDepartment");
const employeeRole = document.getElementById("employeeRole");

const attendanceStatus = document.getElementById("attendanceStatus");
const attendanceTime = document.getElementById("attendanceTime");
const attendanceCheckIn = document.getElementById("attendanceCheckIn");
const attendanceCheckOut = document.getElementById("attendanceCheckOut");
const attendanceHours = document.getElementById("attendanceHours");
const attendanceLate = document.getElementById("attendanceLate");

const summaryTodayCheckIn = document.getElementById("summaryTodayCheckIn");
const summaryTodayCheckOut = document.getElementById("summaryTodayCheckOut");
const summaryTodayHours = document.getElementById("summaryTodayHours");
const summaryTodayLate = document.getElementById("summaryTodayLate");
const summaryMonthPresent = document.getElementById("summaryMonthPresent");
const summaryMonthLate = document.getElementById("summaryMonthLate");
const summaryMonthOvertime = document.getElementById("summaryMonthOvertime");

const sysCamera = document.getElementById("sysCamera");
const sysTracking = document.getElementById("sysTracking");
const sysSync = document.getElementById("sysSync");
const sysLastSync = document.getElementById("sysLastSync");

const successPopup = document.getElementById("successPopup");
const successPopupName = document.getElementById("successPopupName");
const successPopupMessage = document.getElementById("successPopupMessage");

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

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

function formatAction(action) {
  return String(action ?? "pending").replaceAll("_", " ");
}

function titleCase(text) {
  return formatAction(text)
    .split(" ")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}

function formatHours(value) {
  return typeof value === "number" ? `${value.toFixed(2)} hrs` : "--";
}

function setLastSyncNow() {
  sysLastSync.textContent = new Date().toLocaleTimeString("en-GB");
}

function clearTimers() {
  clearTimeout(state.resetTimer);
  clearTimeout(state.detectedTimer);
  clearTimeout(state.popupTimer);
}

function hideSuccessPopup() {
  successPopup.classList.remove("visible");
  successPopup.setAttribute("aria-hidden", "true");
}

function showSuccessPopup(data) {
  successPopupName.textContent = `Thank you ${data.employee_name}`;
  successPopupMessage.textContent = `${titleCase(data.action)} recorded at ${data.time}`;
  successPopup.classList.add("visible");
  successPopup.setAttribute("aria-hidden", "false");
  clearTimeout(state.popupTimer);
  state.popupTimer = setTimeout(hideSuccessPopup, 3200);
}

function speakSuccess(name) {
  if (!("speechSynthesis" in window)) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(`Thank you ${name}`);
  utterance.rate = 0.94;
  utterance.pitch = 1;
  utterance.volume = 1;
  window.speechSynthesis.speak(utterance);
}

function resetVideoTransform() {
  video.style.setProperty("--video-scale", "1");
  video.style.setProperty("--video-shift-x", "0px");
  video.style.setProperty("--video-shift-y", "0px");
}

function resetVisualState() {
  pulseRings.classList.remove("active");
  zoomFrame.className = "zoom-frame";
  flashOverlay.className = "flash-overlay";
  cameraFrame.className = "camera-frame";
}

function resetAttendancePanel() {
  resultBadge.textContent = "WAITING FOR EMPLOYEE";
  resultTitle.textContent = "Waiting for employee...";
  resultMessage.textContent = "Please align your face inside the frame.";
  nextActionPill.textContent = "Next action pending";
  modeCopy.textContent = "The kiosk will automatically determine check-in or check-out after recognition.";

  employeeName.textContent = "Waiting for employee...";
  employeeCode.textContent = "--";
  employeeDepartment.textContent = "--";
  employeeRole.textContent = "--";

  attendanceStatus.textContent = "Ready to Scan";
  attendanceTime.textContent = "--:--:--";
  attendanceCheckIn.textContent = "--";
  attendanceCheckOut.textContent = "--";
  attendanceHours.textContent = "--";
  attendanceLate.textContent = "0";

  summaryTodayCheckIn.textContent = "--";
  summaryTodayCheckOut.textContent = "--";
  summaryTodayHours.textContent = "--";
  summaryTodayLate.textContent = "0";
  summaryMonthPresent.textContent = "0";
  summaryMonthLate.textContent = "0";
  summaryMonthOvertime.textContent = "0";

  capturePreview.hidden = true;
  capturePreview.removeAttribute("src");
  snapshotPlaceholder.hidden = false;
}

function applyCapturePreview() {
  if (!state.lastCaptureDataUrl) {
    capturePreview.hidden = true;
    snapshotPlaceholder.hidden = false;
    return;
  }

  capturePreview.src = state.lastCaptureDataUrl;
  capturePreview.hidden = false;
  snapshotPlaceholder.hidden = true;
}

function setSystemStatus({ camera, tracking, sync }) {
  if (camera) {
    sysCamera.textContent = camera;
  }
  if (tracking) {
    sysTracking.textContent = tracking;
  }
  if (sync) {
    sysSync.textContent = sync;
  }
}

function mapFaceToFrame(face) {
  const cameraRect = cameraFrame.getBoundingClientRect();
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;

  if (!cameraRect.width || !cameraRect.height || !videoWidth || !videoHeight) {
    return null;
  }

  const coverScale = Math.max(cameraRect.width / videoWidth, cameraRect.height / videoHeight);
  const renderedWidth = videoWidth * coverScale;
  const renderedHeight = videoHeight * coverScale;
  const offsetX = (cameraRect.width - renderedWidth) / 2;
  const offsetY = (cameraRect.height - renderedHeight) / 2;
  const faceCenterX = offsetX + (videoWidth - (face.x + face.width / 2)) * coverScale;
  const faceCenterY = offsetY + (face.y + face.height / 2) * coverScale;

  return {
    centerX: faceCenterX,
    centerY: faceCenterY,
    width: face.width * coverScale,
    height: face.height * coverScale,
  };
}

function positionZoomFrame(face) {
  const mapped = mapFaceToFrame(face);
  if (!mapped) {
    return;
  }

  const width = clamp(mapped.width * 1.28, 160, cameraFrame.clientWidth * 0.72);
  const height = clamp(mapped.height * 1.34, 190, cameraFrame.clientHeight * 0.8);
  const left = clamp(mapped.centerX - width / 2, 16, cameraFrame.clientWidth - width - 16);
  const top = clamp(mapped.centerY - height / 2, 16, cameraFrame.clientHeight - height - 16);

  zoomFrame.style.left = `${left}px`;
  zoomFrame.style.top = `${top}px`;
  zoomFrame.style.width = `${width}px`;
  zoomFrame.style.height = `${height}px`;
}

function focusVideoOnFace(face) {
  const mapped = mapFaceToFrame(face);
  if (!mapped) {
    return;
  }

  const cameraWidth = cameraFrame.clientWidth;
  const cameraHeight = cameraFrame.clientHeight;
  const targetFaceWidth = cameraWidth * 0.4;
  const targetScale = clamp(targetFaceWidth / Math.max(mapped.width, 1), 1, 1.7);
  const shiftedCenterX = cameraWidth / 2 + (mapped.centerX - cameraWidth / 2) * targetScale;
  const shiftedCenterY = cameraHeight / 2 + (mapped.centerY - cameraHeight / 2) * targetScale;
  const shiftX = clamp(cameraWidth * 0.5 - shiftedCenterX, -cameraWidth * 0.24, cameraWidth * 0.24);
  const shiftY = clamp(cameraHeight * 0.43 - shiftedCenterY, -cameraHeight * 0.2, cameraHeight * 0.2);

  video.style.setProperty("--video-scale", targetScale.toFixed(3));
  video.style.setProperty("--video-shift-x", `${shiftX.toFixed(1)}px`);
  video.style.setProperty("--video-shift-y", `${shiftY.toFixed(1)}px`);
}

function applyLiveGuidance() {
  if (state.uiMode === "success" || state.uiMode === "unknown" || state.uiMode === "error") {
    return;
  }

  if (state.uiMode === "idle") {
    scanButton.disabled = false;
    if (state.liveFace) {
      statusPill.textContent = "Ready to Scan";
      statusCopy.textContent = "Face detected. Press Start Scan to continue.";
      frameChip.textContent = "Face aligned";
      positionZoomFrame(state.liveFace);
      zoomFrame.classList.add("visible");
    } else {
      statusPill.textContent = "Ready to Scan";
      statusCopy.textContent = state.trackingEnabled
        ? "Please stand in front of the camera."
        : "Auto face fitting is unavailable in this browser. Please align manually.";
      frameChip.textContent = state.trackingEnabled ? "Auto face fit standby" : "Manual framing mode";
      zoomFrame.classList.remove("visible");
      resetVideoTransform();
    }
    return;
  }

  if (state.uiMode === "scanning" || state.uiMode === "detected") {
    pulseRings.classList.add("active");
    if (state.liveFace) {
      positionZoomFrame(state.liveFace);
      zoomFrame.classList.add("visible");
      focusVideoOnFace(state.liveFace);
      frameChip.textContent = state.uiMode === "scanning" ? "Tracking face for scan" : "Matching identity";
    } else {
      frameChip.textContent = "Waiting for face alignment";
      zoomFrame.classList.remove("visible");
      resetVideoTransform();
    }
  }
}

function applySuccessData(data) {
  const actionTitle = titleCase(data.action);
  const checkedInText = data.checked_in_at || "--";
  const checkedOutText = data.checked_out_at || "--";

  resultBadge.textContent = `${actionTitle.toUpperCase()} SUCCESSFUL`;
  resultTitle.textContent = `${actionTitle} Successful`;
  resultMessage.textContent = `Welcome, ${data.employee_name}. Attendance has been recorded successfully.`;
  nextActionPill.textContent = actionTitle;
  modeCopy.textContent = `Mode: Auto. The attendance service selected ${actionTitle.toLowerCase()} based on today's record.`;

  employeeName.textContent = data.employee_name;
  employeeCode.textContent = data.employee_code || data.employee_id || "--";
  employeeDepartment.textContent = data.department || "--";
  employeeRole.textContent = data.position || "--";

  attendanceStatus.textContent = actionTitle;
  attendanceTime.textContent = data.time || "--:--:--";
  attendanceCheckIn.textContent = checkedInText;
  attendanceCheckOut.textContent = checkedOutText;
  attendanceHours.textContent = formatHours(data.hours_today);
  attendanceLate.textContent = `${data.late_today ?? 0}`;

  summaryTodayCheckIn.textContent = checkedInText;
  summaryTodayCheckOut.textContent = checkedOutText;
  summaryTodayHours.textContent = formatHours(data.hours_today);
  summaryTodayLate.textContent = `${data.late_today ?? 0}`;
  summaryMonthPresent.textContent = `${data.monthly_days_worked ?? 0}`;
  summaryMonthLate.textContent = `${data.monthly_late_count ?? 0}`;
  summaryMonthOvertime.textContent = `${data.monthly_overtime_hours ?? 0}`;
}

function setUIState(mode, data = {}) {
  state.uiMode = mode;
  document.body.dataset.state = mode;
  resetVisualState();

  if (mode === "idle") {
    hideSuccessPopup();
    resetAttendancePanel();
    applyCapturePreview();
    applyLiveGuidance();
    setSystemStatus({
      tracking: state.trackingEnabled ? "Auto Face Fit" : "Manual Framing",
      sync: "Standby",
    });
    return;
  }

  if (mode === "scanning") {
    statusPill.textContent = "Scanning";
    statusCopy.textContent = "Verifying identity... Please keep your face inside the frame.";
    resultBadge.textContent = "VERIFICATION IN PROGRESS";
    resultTitle.textContent = "Verifying Identity...";
    resultMessage.textContent = "Please keep your face inside the frame.";
    setSystemStatus({ sync: "Processing", tracking: state.trackingEnabled ? "Tracking Active" : "Manual Framing" });
    applyCapturePreview();
    applyLiveGuidance();
    return;
  }

  if (mode === "detected") {
    statusPill.textContent = "Face Detected";
    statusCopy.textContent = "Recognition match in progress.";
    resultBadge.textContent = "FACE DETECTED";
    resultTitle.textContent = "Face Detected";
    resultMessage.textContent = "Matching employee attendance profile.";
    setSystemStatus({ sync: "Matching" });
    applyCapturePreview();
    applyLiveGuidance();
    return;
  }

  if (mode === "success") {
    cameraFrame.classList.add("success");
    if (state.liveFace) {
      positionZoomFrame(state.liveFace);
      focusVideoOnFace(state.liveFace);
    }
    zoomFrame.classList.add("visible", "success");
    flashOverlay.classList.add("success");
    statusPill.textContent = "Access Granted";
    statusCopy.textContent = "Attendance recorded successfully.";
    frameChip.textContent = "Recognition complete";
    applyCapturePreview();
    applySuccessData(data);
    showSuccessPopup(data);
    speakSuccess(data.employee_name);
    setLastSyncNow();
    setSystemStatus({ sync: "Synced" });
    return;
  }

  if (mode === "unknown") {
    cameraFrame.classList.add("unknown");
    if (state.liveFace) {
      positionZoomFrame(state.liveFace);
      focusVideoOnFace(state.liveFace);
    }
    zoomFrame.classList.add("visible", "unknown");
    flashOverlay.classList.add("unknown");
    statusPill.textContent = "Failed";
    statusCopy.textContent = "Face not recognized. Please try again or contact HR/Admin.";
    frameChip.textContent = "No recognized employee";
    resultBadge.textContent = "FACE NOT RECOGNIZED";
    resultTitle.textContent = "Recognition Failed";
    resultMessage.textContent = "Please try again or contact HR/Admin.";
    attendanceStatus.textContent = "Failed";
    nextActionPill.textContent = "Retry required";
    modeCopy.textContent = "The kiosk could not match this face to a registered employee.";
    applyCapturePreview();
    setLastSyncNow();
    setSystemStatus({ sync: "Failed" });
    return;
  }

  cameraFrame.classList.add("error");
  if (state.liveFace) {
    positionZoomFrame(state.liveFace);
  }
  zoomFrame.classList.add("visible", "error");
  flashOverlay.classList.add("error");
  statusPill.textContent = "System Error";
  statusCopy.textContent = data.message || "Recognition unavailable. Please try again.";
  frameChip.textContent = "Service error";
  resultBadge.textContent = "SCAN ERROR";
  resultTitle.textContent = "Recognition Unavailable";
  resultMessage.textContent = data.message || "Recognition unavailable. Please try again.";
  attendanceStatus.textContent = "Unavailable";
  nextActionPill.textContent = "Service issue";
  modeCopy.textContent = "The kiosk could not complete this verification request.";
  applyCapturePreview();
  setSystemStatus({ sync: "Error" });
}

function resetToIdleLater() {
  clearTimeout(state.resetTimer);
  state.resetTimer = setTimeout(() => {
    state.scanning = false;
    setUIState("idle");
  }, 3600);
}

function selectLargestFace(faces) {
  if (!faces.length) {
    return null;
  }

  return faces.reduce((largest, current) => {
    const largestArea = largest.boundingBox.width * largest.boundingBox.height;
    const currentArea = current.boundingBox.width * current.boundingBox.height;
    return currentArea > largestArea ? current : largest;
  });
}

async function detectFace() {
  if (!state.detector || state.detectPending || video.readyState < 2) {
    return;
  }

  const now = performance.now();
  if (now - state.lastDetectAt < 140) {
    return;
  }

  state.lastDetectAt = now;
  state.detectPending = true;

  try {
    const faces = await state.detector.detect(video);
    const largest = selectLargestFace(faces);
    state.liveFace = largest ? largest.boundingBox : null;
    applyLiveGuidance();
  } catch (_error) {
    state.trackingEnabled = false;
    state.detector = null;
    setSystemStatus({ tracking: "Manual Framing" });
    applyLiveGuidance();
  } finally {
    state.detectPending = false;
  }
}

function startTrackingLoop() {
  const loop = () => {
    requestAnimationFrame(loop);
    void detectFace();
  };
  loop();
}

function initFaceTracking() {
  if (!("FaceDetector" in window)) {
    state.trackingEnabled = false;
    setSystemStatus({ tracking: "Manual Framing" });
    applyLiveGuidance();
    return;
  }

  try {
    state.detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
    state.trackingEnabled = true;
    setSystemStatus({ tracking: "Auto Face Fit" });
    startTrackingLoop();
  } catch (_error) {
    state.trackingEnabled = false;
    setSystemStatus({ tracking: "Manual Framing" });
    applyLiveGuidance();
  }
}

function captureCurrentFrame(context, canvas) {
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  state.lastCaptureDataUrl = canvas.toDataURL("image/jpeg", 0.86);
}

async function handleScan() {
  if (state.scanning || !video.srcObject) {
    return;
  }

  clearTimers();
  state.scanning = true;
  setUIState("scanning");

  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  const context = canvas.getContext("2d");

  if (!context) {
    state.scanning = false;
    setUIState("error", { message: "Camera frame could not be processed." });
    resetToIdleLater();
    return;
  }

  captureCurrentFrame(context, canvas);
  applyCapturePreview();

  state.detectedTimer = setTimeout(() => {
    if (state.scanning) {
      setUIState("detected");
    }
  }, 650);

  canvas.toBlob(async (blob) => {
    if (!blob) {
      clearTimeout(state.detectedTimer);
      state.scanning = false;
      setUIState("error", { message: "Camera frame could not be captured." });
      resetToIdleLater();
      return;
    }

    const form = new FormData();
    form.append("image", blob, "scan.jpg");

    try {
      const response = await fetch("/kiosk/scan", { method: "POST", body: form });
      const data = await response.json();
      clearTimeout(state.detectedTimer);

      if (!response.ok || data.status === "error") {
        setUIState("error", data);
      } else if (data.status === "success") {
        setUIState("success", data);
      } else {
        setUIState("unknown");
      }
    } catch (_error) {
      clearTimeout(state.detectedTimer);
      setUIState("error", { message: "Network request failed." });
    }

    resetToIdleLater();
  }, "image/jpeg", 0.92);
}

function resetAndReady() {
  clearTimers();
  state.scanning = false;
  setUIState("idle");
}

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 1280, height: 720, facingMode: "user" },
    });

    video.srcObject = stream;
    setSystemStatus({ camera: "Active" });
    video.addEventListener(
      "loadedmetadata",
      () => {
        initFaceTracking();
        applyLiveGuidance();
      },
      { once: true }
    );
  } catch (_error) {
    scanButton.disabled = true;
    retryButton.disabled = true;
    panelRetryButton.disabled = true;
    setSystemStatus({ camera: "Permission Required", tracking: "Unavailable", sync: "Blocked" });
    setUIState("error", { message: "Camera permission is required for kiosk scanning." });
  }
}

scanButton.addEventListener("click", handleScan);
retryButton.addEventListener("click", resetAndReady);
panelRetryButton.addEventListener("click", resetAndReady);

setInterval(formatClock, 1000);
formatClock();
setSystemStatus({ camera: "Starting...", tracking: "Checking...", sync: "Standby" });
setUIState("idle");
startCamera();
