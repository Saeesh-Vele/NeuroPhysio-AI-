"""
NeuroPhysio AI — Python FastAPI Backend
Handles: MoveNet pose detection, exercise engine, WebSocket streaming,
         exercise recommendations, and report processing.
"""

import os
import json
import time
import base64
import asyncio
import logging
from typing import Dict, Any, Optional

import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from exercise_library import get_all_exercises, get_exercise_by_id, get_exercise_ids
from angle_engine import calculate_all_joint_angles, calculate_angle
from rep_engine import RepEngine
from feedback_engine import get_feedback
from recommendation_engine import recommend_exercises

# ── Logging ──
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("neurophysio")

# ── FastAPI App ──
app = FastAPI(
    title="NeuroPhysio AI Backend",
    description="Pose detection, exercise engine, and rehabilitation AI",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── MoveNet Model ──
_model = None
_model_input_size = 192  # Lightning uses 192x192
_model_loaded = False

KEYPOINT_NAMES = [
    "nose", "left_eye", "right_eye", "left_ear", "right_ear",
    "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
    "left_wrist", "right_wrist", "left_hip", "right_hip",
    "left_knee", "right_knee", "left_ankle", "right_ankle",
]

# Skeleton connections for drawing
SKELETON_CONNECTIONS = [
    ("left_ear", "left_eye"),
    ("right_ear", "right_eye"),
    ("left_eye", "nose"),
    ("right_eye", "nose"),
    ("left_shoulder", "right_shoulder"),
    ("left_shoulder", "left_elbow"),
    ("left_elbow", "left_wrist"),
    ("right_shoulder", "right_elbow"),
    ("right_elbow", "right_wrist"),
    ("left_shoulder", "left_hip"),
    ("right_shoulder", "right_hip"),
    ("left_hip", "right_hip"),
    ("left_hip", "left_knee"),
    ("left_knee", "left_ankle"),
    ("right_hip", "right_knee"),
    ("right_knee", "right_ankle"),
]

# Color scheme for different body parts
KEYPOINT_COLORS = {
    "nose": (0, 255, 255),        # cyan
    "left_eye": (255, 200, 0),    # gold
    "right_eye": (255, 200, 0),
    "left_ear": (255, 200, 0),
    "right_ear": (255, 200, 0),
    "left_shoulder": (0, 255, 0), # green
    "right_shoulder": (0, 255, 0),
    "left_elbow": (0, 200, 255),  # orange
    "right_elbow": (0, 200, 255),
    "left_wrist": (255, 0, 255),  # magenta
    "right_wrist": (255, 0, 255),
    "left_hip": (255, 255, 0),    # yellow
    "right_hip": (255, 255, 0),
    "left_knee": (0, 128, 255),   # orange-red
    "right_knee": (0, 128, 255),
    "left_ankle": (255, 0, 128),  # pink
    "right_ankle": (255, 0, 128),
}


def load_model():
    """Load MoveNet Lightning model directly via tf.saved_model (no tensorflow_hub needed)."""
    global _model, _model_loaded
    if _model is not None:
        return _model

    try:
        import tensorflow as tf

        logger.info("⏳ Loading MoveNet Lightning model...")

        # Download from TF Hub as a compressed saved_model (bypasses tensorflow_hub import)
        model_path = tf.keras.utils.get_file(
            "movenet_lightning_v4",
            "https://tfhub.dev/google/movenet/singlepose/lightning/4?tf-hub-format=compressed",
            cache_subdir="models",
            extract=True,
        )
        _model = tf.saved_model.load(model_path)
        _model_loaded = True
        logger.info(f"✅ MoveNet Lightning loaded from {model_path}")
        logger.info(f"   Signatures: {list(_model.signatures.keys())}")
        return _model

    except ImportError as ie:
        logger.error(f"❌ TensorFlow not installed: {ie}")
        _model = None
        _model_loaded = False
    except Exception as e:
        logger.error(f"❌ MoveNet model loading failed: {e}")
        import traceback
        traceback.print_exc()
        _model = None
        _model_loaded = False

    return _model


def detect_pose(frame: np.ndarray) -> Dict[str, dict]:
    """
    Run MoveNet inference on a frame.
    Returns dict of keypoint_name → { x, y, score, name }
    """
    model = load_model()
    if model is None:
        return {}

    import tensorflow as tf

    h, w = frame.shape[:2]

    # Convert BGR to RGB
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Resize with padding to 192x192
    img = tf.image.resize_with_pad(
        tf.expand_dims(tf.convert_to_tensor(rgb_frame), axis=0),
        _model_input_size,
        _model_input_size,
    )
    img = tf.cast(img, dtype=tf.int32)

    # Run inference - try different callable patterns
    try:
        # TF Hub loaded model
        if hasattr(model, 'signatures') and 'serving_default' in model.signatures:
            outputs = model.signatures["serving_default"](input=img)
            keypoints_with_scores = outputs["output_0"].numpy()[0][0]
        else:
            # Direct callable
            outputs = model(img)
            keypoints_with_scores = outputs["output_0"].numpy()[0][0] if isinstance(outputs, dict) else outputs.numpy()[0][0]
    except Exception as e:
        logger.error(f"Inference error: {e}")
        return {}

    # Parse keypoints — MoveNet outputs (y, x, score) normalized 0-1
    result = {}
    for i, name in enumerate(KEYPOINT_NAMES):
        y_norm, x_norm, score = keypoints_with_scores[i]
        result[name] = {
            "x": float(x_norm * w),
            "y": float(y_norm * h),
            "score": float(score),
            "name": name,
        }

    return result


def draw_skeleton(frame: np.ndarray, keypoints: Dict[str, dict]) -> np.ndarray:
    """
    Draw a beautiful skeleton overlay with:
    - Colored joint circles
    - Skeleton bone connections
    - Coordinate labels at each joint
    - Joint angle annotations
    """
    annotated = frame.copy()
    h, w = annotated.shape[:2]

    # ── Draw skeleton connections (bones) ──
    for p1_name, p2_name in SKELETON_CONNECTIONS:
        p1 = keypoints.get(p1_name)
        p2 = keypoints.get(p2_name)
        if p1 and p2 and p1["score"] > 0.25 and p2["score"] > 0.25:
            pt1 = (int(p1["x"]), int(p1["y"]))
            pt2 = (int(p2["x"]), int(p2["y"]))

            # Glow effect: draw thick translucent line first
            overlay = annotated.copy()
            cv2.line(overlay, pt1, pt2, (0, 255, 128), 6)
            cv2.addWeighted(overlay, 0.4, annotated, 0.6, 0, annotated)

            # Main bone line
            cv2.line(annotated, pt1, pt2, (255, 255, 255), 2, cv2.LINE_AA)

    # ── Draw keypoint dots with coordinate labels ──
    for name, kp in keypoints.items():
        if kp["score"] < 0.2:
            continue

        x = int(kp["x"])
        y = int(kp["y"])
        score = kp["score"]

        # Get color for this keypoint
        color = KEYPOINT_COLORS.get(name, (0, 255, 0))

        # Confidence-based sizing
        radius = 8 if score > 0.6 else 6 if score > 0.4 else 4

        # Glow ring
        cv2.circle(annotated, (x, y), radius + 4, color, 1, cv2.LINE_AA)
        # Filled dot
        cv2.circle(annotated, (x, y), radius, color, -1, cv2.LINE_AA)
        # White center
        cv2.circle(annotated, (x, y), max(radius - 3, 2), (255, 255, 255), -1, cv2.LINE_AA)

        # ── Coordinate label ──
        # Only show coords for major joints (not face points)
        if name not in ("nose", "left_eye", "right_eye", "left_ear", "right_ear"):
            label = f"{name.replace('left_','L ').replace('right_','R ')} ({x},{y})"
            label_short = f"({x},{y})"

            # Background for readability
            (tw, th), _ = cv2.getTextSize(label_short, cv2.FONT_HERSHEY_SIMPLEX, 0.35, 1)
            cv2.rectangle(
                annotated,
                (x + 10, y - th - 4),
                (x + 14 + tw, y + 2),
                (0, 0, 0),
                -1,
            )
            cv2.putText(
                annotated, label_short,
                (x + 12, y - 2),
                cv2.FONT_HERSHEY_SIMPLEX, 0.35, (200, 255, 200), 1, cv2.LINE_AA,
            )

    # ── Draw joint angles for key rehabilitation joints ──
    angle_joints = [
        ("left_shoulder", "left_elbow", "left_wrist", "L Elbow"),
        ("right_shoulder", "right_elbow", "right_wrist", "R Elbow"),
        ("left_hip", "left_knee", "left_ankle", "L Knee"),
        ("right_hip", "right_knee", "right_ankle", "R Knee"),
        ("left_hip", "left_shoulder", "left_elbow", "L Shoulder"),
        ("right_hip", "right_shoulder", "right_elbow", "R Shoulder"),
    ]

    for p1_name, vertex_name, p3_name, label in angle_joints:
        p1 = keypoints.get(p1_name)
        vertex = keypoints.get(vertex_name)
        p3 = keypoints.get(p3_name)

        if (p1 and vertex and p3 and
            p1["score"] > 0.3 and vertex["score"] > 0.3 and p3["score"] > 0.3):

            angle = calculate_angle(
                (p1["x"], p1["y"]),
                (vertex["x"], vertex["y"]),
                (p3["x"], p3["y"]),
            )
            vx, vy = int(vertex["x"]), int(vertex["y"])
            angle_text = f"{label}: {int(angle)}\u00b0"

            # Draw angle arc indicator
            cv2.ellipse(
                annotated,
                (vx, vy),
                (20, 20),
                0, 0, min(int(angle), 360),
                (0, 255, 255), 2, cv2.LINE_AA,
            )

            # Angle text with background
            (tw, th), _ = cv2.getTextSize(angle_text, cv2.FONT_HERSHEY_SIMPLEX, 0.4, 1)
            cv2.rectangle(
                annotated,
                (vx - tw // 2 - 4, vy - 30 - th),
                (vx + tw // 2 + 4, vy - 26),
                (0, 0, 0),
                -1,
            )
            cv2.putText(
                annotated, angle_text,
                (vx - tw // 2, vy - 30),
                cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 255), 1, cv2.LINE_AA,
            )

    # ── Status bar at top ──
    detected_count = sum(1 for kp in keypoints.values() if kp["score"] > 0.3)
    status_text = f"MoveNet | {detected_count}/17 joints | {time.strftime('%H:%M:%S')}"
    cv2.rectangle(annotated, (0, 0), (w, 28), (0, 0, 0), -1)
    cv2.putText(
        annotated, status_text,
        (10, 18),
        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 128), 1, cv2.LINE_AA,
    )

    return annotated


# ═══════════════════════════════════════════════
#  REST API ENDPOINTS
# ═══════════════════════════════════════════════

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "neurophysio-backend",
        "version": "1.0.0",
        "model_loaded": _model_loaded,
    }


@app.get("/exercises")
async def list_exercises():
    """Return the full exercise library."""
    return {"exercises": get_all_exercises(), "count": len(get_all_exercises())}


@app.get("/exercises/{exercise_id}")
async def get_exercise(exercise_id: str):
    """Get a single exercise config."""
    ex = get_exercise_by_id(exercise_id)
    if not ex:
        raise HTTPException(404, f"Exercise '{exercise_id}' not found")
    return ex


class RecommendationRequest(BaseModel):
    injury_type: str
    injury_region: str = ""
    pain_regions: list = []
    treatment_phase: str = "active_rehab"
    age: int = 30
    mobility_scores: Optional[dict] = None
    report_data: Optional[dict] = None


@app.post("/recommend")
async def recommend(req: RecommendationRequest):
    """Generate personalized exercise recommendations."""
    recs = recommend_exercises(
        injury_type=req.injury_type,
        injury_region=req.injury_region,
        pain_regions=req.pain_regions,
        treatment_phase=req.treatment_phase,
        age=req.age,
        mobility_scores=req.mobility_scores,
        report_data=req.report_data,
    )
    return {"recommendations": recs, "count": len(recs)}


class AssessmentRequest(BaseModel):
    injury_type: str
    injury_region: str = ""


@app.post("/assess-mobility")
async def assess_mobility(req: AssessmentRequest):
    """Return 2-3 beginner exercises for mobility assessment during onboarding."""
    from recommendation_engine import INJURY_SAFE_EXERCISES, DEFAULT_EXERCISES

    injury_key = req.injury_type.lower().replace(" ", "_").replace("-", "_")
    injury_exercises = INJURY_SAFE_EXERCISES.get(injury_key, DEFAULT_EXERCISES)
    beginner_ids = injury_exercises.get("beginner", [])[:3]

    assessment_exercises = []
    for ex_id in beginner_ids:
        ex = get_exercise_by_id(ex_id)
        if ex:
            rep_logic = ex.get("repLogic", {})
            assessment_exercises.append({
                "exerciseId": ex["id"],
                "label": ex["label"],
                "description": ex.get("description", ""),
                "instructions": ex.get("instructions", []),
                "category": ex.get("category", ""),
                "fullRomRange": abs(rep_logic.get("upThreshold", 180) - rep_logic.get("downThreshold", 0)),
                "upThreshold": rep_logic.get("upThreshold", 180),
                "downThreshold": rep_logic.get("downThreshold", 0),
            })

    return {"exercises": assessment_exercises, "count": len(assessment_exercises)}


class CalculateTargetsRequest(BaseModel):
    injury_type: str
    injury_region: str = ""
    pain_regions: list = []
    treatment_phase: str = "active_rehab"
    age: int = 30
    report_data: Optional[dict] = None
    mobility_assessment: list = []  # [{exerciseId, peakAngle}]


@app.post("/calculate-targets")
async def calculate_targets(req: CalculateTargetsRequest):
    """Calculate personalized rep targets based on mobility assessment."""
    from recommendation_engine import calculate_adaptive_reps

    # Build mobility map: exerciseId -> peakAngle
    mobility_map = {}
    for item in req.mobility_assessment:
        mobility_map[item.get("exerciseId", "")] = item.get("peakAngle", 0)

    recs = recommend_exercises(
        injury_type=req.injury_type,
        injury_region=req.injury_region,
        pain_regions=req.pain_regions,
        treatment_phase=req.treatment_phase,
        age=req.age,
        mobility_scores=None,
        report_data=req.report_data,
    )

    # Adjust targets based on mobility assessment
    for rec in recs:
        ex = get_exercise_by_id(rec["exerciseId"])
        if ex:
            # Use the assessed peak angle for this exercise category
            assessed_angle = mobility_map.get(rec["exerciseId"])
            if assessed_angle is None:
                # Try matching by category — use any assessed exercise from same category
                for mid, angle in mobility_map.items():
                    mex = get_exercise_by_id(mid)
                    if mex and mex.get("category") == ex.get("category"):
                        assessed_angle = angle
                        break

            if assessed_angle is not None:
                full_rom = _get_exercise_full_rom(ex)
                rec["targetReps"] = calculate_adaptive_reps(assessed_angle, full_rom, rec.get("difficulty", "beginner"))
                rec["mobilityLevel"] = _get_mobility_level(assessed_angle, full_rom)

    return {"recommendations": recs, "count": len(recs)}


@app.post("/personalize-from-baseline")
async def personalize_from_baseline(req: dict):
    """
    Given a user's first-session baseline data for each exercise,
    compute personalized targets: reps, frequency (days/week), and estimated weeks to full ROM.
    """
    from recommendation_engine import calculate_adaptive_reps

    baseline_exercises = req.get("baseline_exercises", [])
    injury_type = req.get("injury_type", "")
    age = req.get("age", 30)

    personalized = []
    for bl in baseline_exercises:
        ex_id = bl.get("exerciseId", "")
        peak_angle = bl.get("peakAngle", 0)
        min_angle = bl.get("minAngle", 0)
        rom = bl.get("rom", peak_angle - min_angle)
        reps_done = bl.get("reps", 0)

        ex = get_exercise_by_id(ex_id)
        if not ex:
            continue

        # Smart ROM assessment using multiple signals
        full_rom = _get_exercise_full_rom(ex)
        rep_logic = ex.get("repLogic", {})
        up_threshold = rep_logic.get("upThreshold", full_rom)
        target_reps = ex.get("targetReps", 8)

        # Use the actual ROM (range of motion = peak - min) for percentage
        # This measures how much the patient actually MOVED, not just the highest static position
        actual_rom = rom if rom > 0 else (peak_angle - min_angle if min_angle < 900 else peak_angle)
        
        # The functional full ROM is the exercise's movement range
        # Use the rep counting range (upThreshold) as a practical target
        functional_rom = max(up_threshold, full_rom * 0.6)
        
        # Cap actual_rom at functional_rom — angles beyond the exercise's target
        # are MoveNet noise, not better mobility
        actual_rom_capped = min(actual_rom, functional_rom * 1.1)
        
        # ROM percentage: how much of the functional range did the patient cover?
        rom_pct = min((actual_rom_capped / max(functional_rom, 1)) * 100, 100) if actual_rom_capped > 0 else 0
        
        # Also factor in rep completion rate (did they finish the exercise?)
        rep_factor = min(reps_done / max(target_reps, 1), 1.0)
        
        # Weighted score: 70% ROM ability + 30% rep completion
        combined_pct = rom_pct * 0.7 + (rep_factor * 100) * 0.3
        
        mobility_level = _get_mobility_level_from_pct(combined_pct)

        # Calculate adaptive rep target
        target_reps_calc = calculate_adaptive_reps(actual_rom_capped, functional_rom, ex.get("difficulty", "beginner"))

        # Frequency recommendation based on combined score
        if combined_pct < 30:
            freq_days = 7    # Daily — needs maximum work
            freq_label = "Daily (7 days/week)"
        elif combined_pct < 50:
            freq_days = 6
            freq_label = "6 days/week"
        elif combined_pct < 65:
            freq_days = 5
            freq_label = "5 days/week"
        elif combined_pct < 80:
            freq_days = 4
            freq_label = "4 days/week"
        else:
            freq_days = 3    # Good ROM — maintenance
            freq_label = "3 days/week (maintenance)"

        # Age adjustment
        if age > 60:
            freq_days = max(3, freq_days - 1)

        # Estimated weeks to full ROM based on combined score
        remaining_pct = 100 - combined_pct
        if remaining_pct <= 5:
            est_weeks = 1
        elif remaining_pct < 15:
            est_weeks = 2
        elif remaining_pct < 30:
            est_weeks = 4
        elif remaining_pct < 50:
            est_weeks = 8
        elif remaining_pct < 70:
            est_weeks = 12
        else:
            est_weeks = 16

        # Sets recommendation
        if combined_pct < 40:
            sets = 2
        elif combined_pct < 70:
            sets = 3
        else:
            sets = 3

        personalized.append({
            "exerciseId": ex_id,
            "exerciseLabel": ex.get("label", ex_id),
            "category": ex.get("category", ""),
            "baseline": {
                "peakAngle": round(peak_angle, 1),
                "minAngle": round(min_angle, 1),
                "rom": round(actual_rom, 1),
                "romPercentage": round(combined_pct, 1),
                "mobilityLevel": mobility_level,
                "repsCompleted": reps_done,
            },
            "prescription": {
                "targetReps": target_reps_calc,
                "sets": sets,
                "frequencyDays": freq_days,
                "frequencyLabel": freq_label,
                "estimatedWeeksToFullRom": est_weeks,
                "fullRom": round(functional_rom, 1),
            },
        })

    return {"personalized": personalized, "count": len(personalized)}



def _get_exercise_full_rom(ex: dict) -> float:
    """
    Get the actual anatomical full ROM target for an exercise.
    Uses angleChecks[0].targetMax (the real target angle), NOT the rep threshold gap.
    """
    angle_checks = ex.get("angleChecks", [])
    if angle_checks:
        return angle_checks[0].get("targetMax", 180)
    rep_logic = ex.get("repLogic", {})
    return rep_logic.get("upThreshold", 180)


def _get_mobility_level_from_pct(pct: float) -> str:
    """Get mobility level from a combined percentage score."""
    if pct < 30:
        return "low"
    elif pct < 55:
        return "moderate"
    elif pct < 80:
        return "good"
    return "excellent"


def _get_mobility_level(peak_angle: float, full_rom: float) -> str:
    if full_rom <= 0:
        return "unknown"
    pct = (peak_angle / full_rom) * 100
    if pct < 40:
        return "low"
    elif pct < 70:
        return "moderate"
    elif pct < 90:
        return "good"
    return "excellent"


# ═══════════════════════════════════════════════
#  WEBSOCKET — Real-Time Pose Detection
# ═══════════════════════════════════════════════

def _process_frame_sync(frame: np.ndarray, exercise_id: str, rep_engine, current_exercise_id: str):
    """
    Synchronous frame processing — runs in a thread pool so it doesn't block the event loop.
    Returns all the data needed for the WebSocket response.
    """
    keypoints = detect_pose(frame)
    if not keypoints:
        return None

    joint_angles = calculate_all_joint_angles(keypoints)

    rep_status = {"reps": 0, "state": "idle"}
    if rep_engine:
        rep_status = rep_engine.process_frame(keypoints)

    feedback = {"status": "good", "message": "Ready", "angleResults": []}
    if current_exercise_id:
        feedback = get_feedback(keypoints, current_exercise_id)

    # Draw skeleton
    annotated = draw_skeleton(frame, keypoints)
    _, buffer = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 70])
    annotated_b64 = base64.b64encode(buffer).decode("utf-8")

    coordinates = []
    for name, kp in keypoints.items():
        if kp["score"] > 0.25:
            coordinates.append({
                "name": name,
                "x": round(kp["x"], 1),
                "y": round(kp["y"], 1),
                "score": round(kp["score"], 2),
            })

    angles_clean = {}
    for k, v in joint_angles.items():
        if v is not None:
            angles_clean[k] = round(v, 1)

    return {
        "keypoints": keypoints,
        "coordinates": coordinates,
        "joint_angles": angles_clean,
        "rep_status": rep_status,
        "feedback": feedback,
        "annotated_b64": annotated_b64,
    }


@app.websocket("/ws/pose")
async def pose_websocket(websocket: WebSocket):
    """
    Real-time pose detection over WebSocket.
    Uses a producer/consumer pattern:
    - Producer task: receives frames from client, keeps only the latest
    - Consumer task: processes the latest frame in a thread pool, sends result back
    """
    await websocket.accept()
    logger.info("🔌 WebSocket connected")

    rep_engine: Optional[RepEngine] = None
    current_exercise_id = None
    session_start = time.time()
    good_frames = 0
    total_frames = 0

    # Shared state: latest frame (producer writes, consumer reads)
    latest_frame = None
    latest_exercise_id = ""
    frame_lock = asyncio.Lock()
    running = True

    async def receiver():
        """Receive frames from client — always keeps only the newest frame."""
        nonlocal latest_frame, latest_exercise_id, running
        try:
            while running:
                data = await websocket.receive_text()
                msg = json.loads(data)
                frame_b64 = msg.get("frame", "")
                exercise_id = msg.get("exerciseId", "")

                frame_bytes = base64.b64decode(frame_b64)
                nparr = np.frombuffer(frame_bytes, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

                if frame is not None:
                    async with frame_lock:
                        latest_frame = frame
                        latest_exercise_id = exercise_id
        except WebSocketDisconnect:
            running = False
        except Exception:
            running = False

    async def processor():
        """Process the latest frame in background thread, send results."""
        nonlocal latest_frame, latest_exercise_id, running
        nonlocal rep_engine, current_exercise_id, good_frames, total_frames

        loop = asyncio.get_event_loop()

        while running:
            # Grab the latest frame
            frame = None
            exercise_id = ""
            async with frame_lock:
                if latest_frame is not None:
                    frame = latest_frame.copy()
                    exercise_id = latest_exercise_id
                    latest_frame = None  # Mark as consumed

            if frame is None:
                await asyncio.sleep(0.03)  # No frame yet, wait 30ms
                continue

            # Switch exercise if needed
            if exercise_id and exercise_id != current_exercise_id:
                try:
                    rep_engine = RepEngine(exercise_id)
                    current_exercise_id = exercise_id
                    logger.info(f"🎯 Exercise set: {exercise_id}")
                except ValueError:
                    rep_engine = None

            # Run TF inference in thread pool (non-blocking!)
            try:
                result = await loop.run_in_executor(
                    None,
                    _process_frame_sync,
                    frame, exercise_id, rep_engine, current_exercise_id
                )
            except Exception as e:
                logger.error(f"Frame processing error: {e}")
                await asyncio.sleep(0.05)
                continue

            if result is None:
                try:
                    await websocket.send_json({
                        "error": "Model not loaded",
                        "keypoints": [],
                        "jointAngles": {},
                        "repCount": rep_engine.reps if rep_engine else 0,
                        "repState": rep_engine.state if rep_engine else "idle",
                        "feedback": {"status": "info", "message": "Loading MoveNet model...", "angleResults": []},
                        "accuracy": 0,
                    })
                except Exception:
                    running = False
                await asyncio.sleep(0.1)
                continue

            total_frames += 1
            if result["feedback"]["status"] == "good":
                good_frames += 1

            accuracy = round((good_frames / total_frames * 100)) if total_frames > 0 else 0

            # Debug: log peakAngle every 10 frames
            if total_frames % 10 == 0:
                rep_status_dbg = result["rep_status"]
                angles_sample = {k: v for k, v in result["joint_angles"].items() if v is not None}
                logger.info(f"   📊 Frame #{total_frames} | peakAngle={rep_status_dbg.get('peakAngle')} | attemptPeak={rep_status_dbg.get('currentAttemptPeak')} | angles={angles_sample}")

            try:
                rep_status = result["rep_status"]
                await websocket.send_json({
                    "keypoints": list(result["keypoints"].values()),
                    "coordinates": result["coordinates"],
                    "jointAngles": result["joint_angles"],
                    "repCount": rep_status["reps"],
                    "repState": rep_status["state"],
                    "fullReps": rep_status.get("fullReps", 0),
                    "partialReps": rep_status.get("partialReps", 0),
                    "peakAngle": rep_status.get("peakAngle", 0),
                    "maxRomAchieved": rep_status.get("maxRomAchieved", 0),
                    "restAngle": rep_status.get("restAngle"),
                    "currentAttemptPeak": rep_status.get("currentAttemptPeak", 0),
                    "accuracy": accuracy,
                    "feedback": result["feedback"],
                    "exerciseId": current_exercise_id or "",
                    "annotatedFrame": result["annotated_b64"],
                    "modelLoaded": True,
                })
            except Exception:
                running = False
                break

    # Run both tasks concurrently
    try:
        await asyncio.gather(receiver(), processor())
    except Exception as e:
        logger.error(f"❌ WebSocket error: {e}")
    finally:
        duration = int(time.time() - session_start)
        logger.info(f"🔌 WebSocket disconnected. Session: {duration}s, {total_frames} frames processed")


# ═══════════════════════════════════════════════
#  STARTUP — Pre-load MoveNet model
# ═══════════════════════════════════════════════

@app.on_event("startup")
async def startup():
    logger.info("🚀 NeuroPhysio Backend starting...")
    logger.info(f"📋 {len(get_all_exercises())} exercises loaded")
    # Pre-load the model at startup so first frame isn't slow
    logger.info("⏳ Pre-loading MoveNet model...")
    load_model()
    if _model_loaded:
        logger.info("✅ MoveNet model ready!")
    else:
        logger.warning("⚠️ MoveNet model failed to load — check TensorFlow installation")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
