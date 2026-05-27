import base64
import binascii
import logging
import shutil
import tempfile
from io import BytesIO
from pathlib import Path

from deepface import DeepFace
from PIL import Image, UnidentifiedImageError


BASE_DIR = Path(__file__).resolve().parents[2]
FACES_DIR = BASE_DIR / "app" / "employees_faces"
INVALID_FACES_DIR = BASE_DIR / "app" / "employees_faces_invalid"
MODEL_NAME = "ArcFace"
FAST_SCAN_DETECTOR = "opencv"
FALLBACK_SCAN_DETECTOR = "retinaface"
logger = logging.getLogger(__name__)


def _clear_face_cache() -> None:
    for cache_file in FACES_DIR.glob("*.pkl"):
        cache_file.unlink(missing_ok=True)


def _verify_image_bytes(image_bytes: bytes, *, label: str) -> None:
    if not image_bytes:
        raise ValueError(f"{label} is empty.")

    try:
        with Image.open(BytesIO(image_bytes)) as image:
            image.verify()
    except (UnidentifiedImageError, OSError, SyntaxError) as exc:
        raise ValueError(f"{label} is not a valid image.") from exc


def _decode_face_frame(frame: str, *, index: int) -> bytes:
    encoded = frame.split(",", 1)[-1].strip()
    if not encoded:
        raise ValueError(f"Frame {index} is empty.")

    try:
        image_bytes = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError(f"Frame {index} is not valid base64 image data.") from exc

    _verify_image_bytes(image_bytes, label=f"Frame {index}")
    return image_bytes


def _is_valid_face_image(image_path: Path) -> bool:
    if not image_path.is_file():
        return False
    if image_path.stat().st_size <= 0:
        return False

    try:
        with Image.open(image_path) as image:
            image.verify()
    except (UnidentifiedImageError, OSError, SyntaxError):
        return False
    return True


def sanitize_face_database() -> int:
    moved = 0
    FACES_DIR.mkdir(parents=True, exist_ok=True)

    for image_path in FACES_DIR.glob("*/*.jpg"):
        if _is_valid_face_image(image_path):
            continue

        relative_path = image_path.relative_to(FACES_DIR)
        target_path = INVALID_FACES_DIR / relative_path
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.unlink(missing_ok=True)
        shutil.move(str(image_path), str(target_path))
        moved += 1
        logger.warning("Quarantined invalid face image: %s", image_path)

    if moved:
        _clear_face_cache()

    return moved


def _run_find(image_path: str | Path, detector_backend: str, *, enforce_detection: bool) -> list:
    return DeepFace.find(
        img_path=str(image_path),
        db_path=str(FACES_DIR),
        model_name=MODEL_NAME,
        detector_backend=detector_backend,
        enforce_detection=enforce_detection,
        distance_metric="cosine",
        silent=True,
    )


def _parse_match_result(result: list) -> dict | None:
    if result and len(result[0]) > 0:
        matched = result[0].iloc[0]
        employee_id = Path(str(matched["identity"])).parent.name
        confidence = round((1 - float(matched["distance"])) * 100, 2)
        return {"status": "success", "employee_id": employee_id, "confidence": confidence}
    return None


def register_employee_face(employee_id: str, frames_b64: list[str]) -> int:
    FACES_DIR.mkdir(parents=True, exist_ok=True)
    frame_bytes = [_decode_face_frame(frame, index=index) for index, frame in enumerate(frames_b64, start=1)]
    folder = FACES_DIR / employee_id
    staging_dir = Path(tempfile.mkdtemp(prefix=f".{employee_id}-", dir=str(FACES_DIR)))
    backup_dir = folder.with_name(f".{employee_id}.backup")
    replaced_existing = False

    try:
        for index, image_bytes in enumerate(frame_bytes, start=1):
            (staging_dir / f"frame_{index}.jpg").write_bytes(image_bytes)

        _clear_face_cache()

        if backup_dir.exists():
            shutil.rmtree(backup_dir)
        if folder.exists():
            folder.replace(backup_dir)
            replaced_existing = True

        staging_dir.replace(folder)
        warm_up_face_cache(folder / "frame_1.jpg")

        if backup_dir.exists():
            shutil.rmtree(backup_dir)
        return len(frame_bytes)
    except Exception:
        if replaced_existing and folder.exists():
            shutil.rmtree(folder)
        if replaced_existing and backup_dir.exists():
            backup_dir.replace(folder)
        if staging_dir.exists():
            shutil.rmtree(staging_dir)
        raise


def warm_up_face_cache(image_path: Path) -> None:
    sanitize_face_database()
    for detector_backend in (FAST_SCAN_DETECTOR, FALLBACK_SCAN_DETECTOR):
        try:
            _run_find(image_path, detector_backend, enforce_detection=False)
        except Exception:
            # Cache warm-up is best effort only.
            continue


def prime_recognition_models() -> None:
    sanitize_face_database()
    sample_image = next(FACES_DIR.glob("*/*.jpg"), None)
    if sample_image is None:
        return
    warm_up_face_cache(sample_image)


def recognize_face(image_path: str) -> dict:
    sanitize_face_database()
    last_error: str | None = None

    for detector_backend in (FAST_SCAN_DETECTOR, FALLBACK_SCAN_DETECTOR):
        try:
            result = _run_find(image_path, detector_backend, enforce_detection=True)
            matched = _parse_match_result(result)
            if matched:
                matched["detector_backend"] = detector_backend
                return matched
        except Exception as exc:
            last_error = str(exc)

    if last_error:
        return {"status": "error", "message": last_error}
    return {"status": "unknown"}
