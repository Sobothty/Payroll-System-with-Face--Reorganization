"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { apiFetch } from "@/lib/api";
import type { Employee } from "@/lib/types";

const angleInstructions = [
  "Front — look straight at camera",
  "Turn slightly left",
  "Turn slightly right",
  "Turn full left",
  "Turn full right",
  "Chin up — look upward",
  "Chin down — look downward",
  "Slight natural smile",
  "Eyes slightly squinted",
  "Front again — final confirmation",
];

function FaceRegistrationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const employeeId = searchParams.get("employee_id") ?? "";
  const replaceMode = searchParams.get("mode") === "replace";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; message: string } | null>(null);

  useEffect(() => {
    if (!employeeId) return;
    apiFetch<Employee>(`/api/employees/${employeeId}`).then(setEmployee).catch(() => undefined);
  }, [employeeId]);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    async function startCamera() {
      if (employee?.face_folder_path && !replaceMode) return;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      activeStream = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    }
    startCamera().catch(() => undefined);
    return () => {
      activeStream?.getTracks().forEach((track) => track.stop());
    };
  }, [employee?.face_folder_path, replaceMode]);

  const currentAngle = frames.length;
  const progress = Math.min((frames.length / 10) * 100, 100);

  function captureFrame() {
    if (!videoRef.current || frames.length >= 10) return;
    setFeedback(null);
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    setFrames((prev) => [...prev, canvas.toDataURL("image/jpeg", 0.9)]);
  }

  function retakeLast() {
    setFrames((prev) => prev.slice(0, -1));
  }

  async function saveRegistration() {
    if (!employeeId || frames.length !== 10) return;
    setSaving(true);
    setFeedback(null);
    try {
      await apiFetch("/api/face/register", {
        method: "POST",
        body: JSON.stringify({ employee_id: employeeId, frames }),
      });
      setFeedback({ type: "success", message: replaceMode ? "Face registration replaced successfully." : "Face registration saved successfully." });
      router.push("/employees");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save face registration.";
      setFeedback({ type: "error", message });
    } finally {
      setSaving(false);
    }
  }

  const statusText =
    frames.length === 0
      ? "Not started — click Capture Frame to begin"
      : frames.length < 10
        ? `In progress — ${10 - frames.length} frames remaining`
        : "All angles captured — ready to register";

  if (employee?.face_folder_path && !replaceMode) {
    return (
      <Card>
        <div className="form-grid">
          <div>
            <h2 className="section-heading">Face Already Registered</h2>
            <p className="muted">
              {employee.full_name} already has a completed face registration. Use re-register only when you intentionally want to replace the stored face data.
            </p>
          </div>
          <div className="form-grid">
            <div><strong>{employee.full_name}</strong></div>
            <div className="muted">{employee.employee_code}</div>
            <div className="muted">{employee.department}</div>
            <div className="muted">{employee.position}</div>
          </div>
          <div className="action-row">
            <Button type="button" tone="secondary" onClick={() => router.push("/employees")}>
              Back to Employees
            </Button>
            <Button type="button" onClick={() => router.push(`/face-registration?employee_id=${employee.id}&mode=replace`)}>
              Re-register Face
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid-two">
      <Card>
        <div className="form-grid">
          <div>
            <h2 className="section-heading">Employee Info</h2>
            {employee ? (
              <div className="form-grid">
                <div><strong>{employee.full_name}</strong></div>
                <div className="muted">{employee.employee_code}</div>
                <div className="muted">{employee.department}</div>
                <div className="muted">{employee.position}</div>
                <div className="muted">{employee.pay_type}</div>
                <div className="muted">${Number(employee.base_salary).toLocaleString()}</div>
                <div className="muted">{employee.hire_date}</div>
              </div>
            ) : (
              <p className="muted">Select an employee from the workforce page first.</p>
            )}
          </div>

          <div>
            <div className="stat-value">{frames.length} / 10</div>
            <div className="progress-track" style={{ marginTop: 12 }}>
              <div className={`progress-fill ${frames.length === 10 ? "complete" : ""}`} style={{ width: `${progress}%` }} />
            </div>
            <p className="helper-text" style={{ marginTop: 10 }}>{statusText}</p>
          </div>
        </div>
      </Card>

      <Card>
        <div className="form-grid">
          <div className="video-frame">
            <video ref={videoRef} className="video-feed" autoPlay playsInline muted />
            <div className="frame-corners">
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="face-guide" />
            <div className="angle-pill">{angleInstructions[Math.min(currentAngle, 9)]}</div>
          </div>

          <div className="checklist">
            {angleInstructions.map((item, index) => {
              const done = index < frames.length;
              const active = index === frames.length && frames.length < 10;
              return (
                <div key={item} className={`checklist-item ${done ? "done" : ""} ${active ? "active" : ""}`}>
                  <span>{index + 1}. {item}</span>
                  <strong>{done ? "✓" : "Pending"}</strong>
                </div>
              );
            })}
          </div>

          <div className="action-row">
            <Button type="button" onClick={captureFrame} disabled={saving || frames.length >= 10}>
              Capture Frame
            </Button>
            <Button type="button" tone="secondary" onClick={retakeLast} disabled={saving || frames.length === 0}>
              Retake Last
            </Button>
            <Button type="button" tone="success" onClick={saveRegistration} disabled={saving || frames.length !== 10}>
              {saving ? "Saving face data..." : replaceMode ? "Save & Replace Face" : "Save & Register"}
            </Button>
          </div>
          {feedback ? (
            <div className={`feedback-banner ${feedback.type}`}>
              {feedback.message}
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

export default function FaceRegistrationPage() {
  return (
    <Suspense fallback={<div className="surface-card">Loading face registration...</div>}>
      <FaceRegistrationContent />
    </Suspense>
  );
}
