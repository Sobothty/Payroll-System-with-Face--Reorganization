import base64
from pathlib import Path

from deepface import DeepFace


BASE_DIR = Path(__file__).resolve().parents[2]
FACES_DIR = BASE_DIR / "app" / "employees_faces"


def register_employee_face(employee_id: str, frames_b64: list[str]) -> int:
    folder = FACES_DIR / employee_id
    folder.mkdir(parents=True, exist_ok=True)
    for index, frame in enumerate(frames_b64, start=1):
        img_bytes = base64.b64decode(frame.split(",")[-1])
        (folder / f"frame_{index}.jpg").write_bytes(img_bytes)
    warm_up_face_cache(folder / "frame_1.jpg")
    return len(frames_b64)


def warm_up_face_cache(image_path: Path) -> None:
    try:
        DeepFace.find(
            img_path=str(image_path),
            db_path=str(FACES_DIR),
            model_name="ArcFace",
            detector_backend="retinaface",
            enforce_detection=False,
            silent=True,
        )
    except Exception:
        # Cache warm-up is best effort only.
        return


def recognize_face(image_path: str) -> dict:
    try:
        result = DeepFace.find(
            img_path=image_path,
            db_path=str(FACES_DIR),
            model_name="ArcFace",
            detector_backend="retinaface",
            enforce_detection=True,
            distance_metric="cosine",
            silent=True,
        )
        if result and len(result[0]) > 0:
            matched = result[0].iloc[0]
            employee_id = Path(str(matched["identity"])).parent.name
            confidence = round((1 - float(matched["distance"])) * 100, 2)
            return {"status": "success", "employee_id": employee_id, "confidence": confidence}
        return {"status": "unknown"}
    except Exception as exc:
        return {"status": "error", "message": str(exc)}
