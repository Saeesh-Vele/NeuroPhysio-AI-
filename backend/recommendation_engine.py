"""
NeuroPhysio AI — Exercise Recommendation Engine v2
Medically accurate exercise mapping per injury type and severity.
"""

from typing import Dict, List, Any

# ═══════════════════════════════════════════════
#  INJURY → SAFE EXERCISE MAPPING
#  Only exercises that are medically appropriate
#  for each specific injury are listed here.
# ═══════════════════════════════════════════════

INJURY_SAFE_EXERCISES = {
    # ── SHOULDER INJURIES ──
    "shoulder_dislocation": {
        "beginner": [
            "pendulum_exercise", "shoulder_isometric_hold", "towel_slide",
            "cross_body_stretch", "finger_wall_walk", "passive_external_rotation",
            "scapular_squeeze",
        ],
        "intermediate": [
            "shoulder_external_rotation", "shoulder_flexion", "shoulder_abduction",
            "arm_raise", "doorway_stretch",
        ],
        "advanced": [
            "wall_angel", "bicep_curl", "tricep_extension", "arm_press",
        ],
    },
    "rotator_cuff_repair": {
        "beginner": [
            "pendulum_exercise", "shoulder_isometric_hold", "passive_external_rotation",
            "scapular_squeeze", "finger_wall_walk",
        ],
        "intermediate": [
            "shoulder_external_rotation", "towel_slide", "cross_body_stretch",
            "shoulder_flexion", "doorway_stretch",
        ],
        "advanced": [
            "shoulder_abduction", "arm_raise", "wall_angel",
            "bicep_curl", "arm_press",
        ],
    },
    "shoulder_replacement": {
        "beginner": [
            "pendulum_exercise", "shoulder_isometric_hold", "scapular_squeeze",
            "finger_wall_walk", "passive_external_rotation",
        ],
        "intermediate": [
            "towel_slide", "shoulder_flexion", "shoulder_external_rotation",
            "cross_body_stretch", "arm_raise",
        ],
        "advanced": [
            "shoulder_abduction", "wall_angel", "bicep_curl",
            "doorway_stretch", "arm_press",
        ],
    },
    "frozen_shoulder": {
        "beginner": [
            "pendulum_exercise", "finger_wall_walk", "towel_slide",
            "passive_external_rotation", "cross_body_stretch",
        ],
        "intermediate": [
            "shoulder_flexion", "shoulder_abduction", "shoulder_external_rotation",
            "arm_raise", "doorway_stretch",
        ],
        "advanced": [
            "wall_angel", "scapular_squeeze", "bicep_curl",
            "wall_pushup", "arm_press",
        ],
    },

    # ── KNEE INJURIES ──
    "acl_reconstruction": {
        "beginner": [
            "quad_set", "heel_slide", "straight_leg_raise",
            "ankle_pump", "patella_glide", "hamstring_wall_stretch",
        ],
        "intermediate": [
            "knee_bend", "hamstring_curl", "calf_raise",
            "terminal_knee_extension", "prone_knee_bend",
        ],
        "advanced": [
            "wall_squat", "step_up", "sit_to_stand",
            "single_leg_balance",
        ],
    },
    "knee_replacement": {
        "beginner": [
            "quad_set", "ankle_pump", "heel_slide",
            "straight_leg_raise", "patella_glide",
        ],
        "intermediate": [
            "knee_bend", "hamstring_curl", "calf_raise",
            "sit_to_stand", "hamstring_wall_stretch",
        ],
        "advanced": [
            "wall_squat", "step_up", "terminal_knee_extension",
            "single_leg_balance",
        ],
    },
    "knee_arthroscopy": {
        "beginner": [
            "quad_set", "heel_slide", "ankle_pump",
            "straight_leg_raise", "patella_glide",
        ],
        "intermediate": [
            "knee_bend", "hamstring_curl", "terminal_knee_extension",
            "calf_raise", "prone_knee_bend",
        ],
        "advanced": [
            "wall_squat", "sit_to_stand", "step_up",
            "single_leg_balance",
        ],
    },
    "meniscus_tear": {
        "beginner": [
            "quad_set", "straight_leg_raise", "ankle_pump",
            "heel_slide", "patella_glide",
        ],
        "intermediate": [
            "hamstring_curl", "calf_raise", "terminal_knee_extension",
            "knee_bend", "hamstring_wall_stretch",
        ],
        "advanced": [
            "wall_squat", "sit_to_stand", "step_up",
            "prone_knee_bend",
        ],
    },

    # ── HIP INJURIES ──
    "hip_replacement": {
        "beginner": [
            "ankle_pump", "quad_set", "gentle_hip_circles",
            "supine_hip_flexion", "heel_slide",
        ],
        "intermediate": [
            "glute_bridge", "hip_abduction", "straight_leg_raise",
            "sit_to_stand", "clamshell",
        ],
        "advanced": [
            "step_up", "standing_march", "single_leg_balance",
            "wall_squat",
        ],
    },
    "hip_fracture": {
        "beginner": [
            "ankle_pump", "quad_set", "supine_hip_flexion",
            "gentle_hip_circles", "heel_slide",
        ],
        "intermediate": [
            "glute_bridge", "hip_abduction", "clamshell",
            "straight_leg_raise", "hamstring_wall_stretch",
        ],
        "advanced": [
            "sit_to_stand", "step_up", "standing_march",
            "single_leg_balance",
        ],
    },

    # ── ANKLE INJURIES ──
    "ankle_sprain": {
        "beginner": [
            "ankle_pump", "ankle_alphabet", "ankle_dorsiflexion",
            "toe_raises", "ankle_circles",
        ],
        "intermediate": [
            "calf_raise", "heel_slide", "tandem_stance",
            "standing_march", "hamstring_wall_stretch",
        ],
        "advanced": [
            "single_leg_balance", "step_up", "sit_to_stand",
        ],
    },
    "ankle_fracture": {
        "beginner": [
            "ankle_pump", "ankle_alphabet", "toe_raises",
            "ankle_circles", "quad_set",
        ],
        "intermediate": [
            "ankle_dorsiflexion", "calf_raise", "heel_slide",
            "tandem_stance",
        ],
        "advanced": [
            "standing_march", "single_leg_balance", "step_up",
        ],
    },

    # ── SPINE / BACK INJURIES ──
    "spinal_injury": {
        "beginner": [
            "pelvic_tilt", "cat_cow_stretch", "ankle_pump",
            "quad_set", "gentle_hip_circles",
        ],
        "intermediate": [
            "dead_bug", "glute_bridge", "prone_press_up",
            "supine_hip_flexion", "hamstring_wall_stretch",
        ],
        "advanced": [
            "sit_to_stand", "standing_march", "clamshell",
        ],
    },
    "lower_back_pain": {
        "beginner": [
            "pelvic_tilt", "cat_cow_stretch", "dead_bug",
            "supine_hip_flexion", "hamstring_wall_stretch",
        ],
        "intermediate": [
            "glute_bridge", "prone_press_up", "clamshell",
            "gentle_hip_circles", "piriformis_stretch",
        ],
        "advanced": [
            "sit_to_stand", "standing_march", "hip_abduction",
        ],
    },

    # ── NEUROLOGICAL ──
    "stroke": {
        "beginner": [
            "ankle_pump", "wrist_circles", "wrist_flex_extend",
            "finger_wall_walk", "pelvic_tilt",
            "shoulder_isometric_hold", "quad_set",
        ],
        "intermediate": [
            "arm_raise", "sit_to_stand", "gentle_hip_circles",
            "tandem_stance", "cat_cow_stretch",
        ],
        "advanced": [
            "standing_march", "single_leg_balance", "wall_squat",
            "glute_bridge",
        ],
    },

    # ── GENERAL ──
    "general_deconditioning": {
        "beginner": [
            "pelvic_tilt", "cat_cow_stretch", "ankle_pump",
            "wrist_circles", "quad_set", "scapular_squeeze",
        ],
        "intermediate": [
            "arm_raise", "glute_bridge", "sit_to_stand",
            "calf_raise", "dead_bug", "shoulder_flexion",
        ],
        "advanced": [
            "wall_squat", "step_up", "wall_pushup",
            "standing_march", "single_leg_balance",
        ],
    },
}

# Default fallback for unknown injuries
DEFAULT_EXERCISES = {
    "beginner": [
        "pelvic_tilt", "cat_cow_stretch", "ankle_pump",
        "quad_set", "scapular_squeeze", "wrist_circles",
    ],
    "intermediate": [
        "arm_raise", "glute_bridge", "sit_to_stand",
        "calf_raise", "dead_bug",
    ],
    "advanced": [
        "wall_squat", "step_up", "standing_march",
    ],
}

# Pain region → exercises to EXCLUDE
PAIN_EXCLUSIONS = {
    "left_knee": ["squat", "wall_squat", "step_up", "sit_to_stand", "knee_bend", "lunge"],
    "right_knee": ["squat", "wall_squat", "step_up", "sit_to_stand", "knee_bend", "lunge"],
    "left_shoulder": ["wall_pushup", "tricep_extension", "wall_angel", "arm_raise", "shoulder_abduction", "arm_press"],
    "right_shoulder": ["wall_pushup", "tricep_extension", "wall_angel", "arm_raise", "shoulder_abduction", "arm_press"],
    "lower_back": ["squat", "wall_squat", "dead_bug", "prone_press_up"],
    "left_hip": ["squat", "wall_squat", "step_up", "hip_abduction", "lunge"],
    "right_hip": ["squat", "wall_squat", "step_up", "hip_abduction", "lunge"],
    "left_ankle": ["step_up", "calf_raise", "standing_march", "single_leg_balance"],
    "right_ankle": ["step_up", "calf_raise", "standing_march", "single_leg_balance"],
    "left_wrist": ["wall_pushup", "wrist_curl", "wrist_extension"],
    "right_wrist": ["wall_pushup", "wrist_curl", "wrist_extension"],
    "neck": ["wall_angel", "prone_press_up"],
}

from exercise_library import get_exercise_by_id


def recommend_exercises(
    injury_type: str,
    injury_region: str,
    pain_regions: List[Dict[str, Any]],
    treatment_phase: str = "active_rehab",
    age: int = 30,
    mobility_scores: Dict[str, float] = None,
    report_data: Dict[str, Any] = None,
) -> List[Dict[str, Any]]:
    """
    Generate personalized exercise recommendations.
    Returns exercises grouped by difficulty with medically safe selections only.
    """

    injury_key = injury_type.lower().replace(" ", "_").replace("-", "_")

    # Get safe exercises for this injury
    injury_exercises = INJURY_SAFE_EXERCISES.get(injury_key, DEFAULT_EXERCISES)

    # Build exclusion set from pain regions
    excluded = set()
    for pr in pain_regions:
        region = pr.get("region", "")
        intensity = pr.get("intensity", 0)
        if intensity >= 4:  # Even moderate pain → exclude stressful exercises
            exclusions = PAIN_EXCLUSIONS.get(region, [])
            excluded.update(exclusions)

    # Report-based exclusions
    if report_data:
        severity = report_data.get("severity", "").lower()
        if severity in ("severe", "acute", "critical"):
            # Block all advanced exercises
            injury_exercises = {
                "beginner": injury_exercises.get("beginner", []),
                "intermediate": [],
                "advanced": [],
            }
        flagged = report_data.get("contraindications", [])
        if isinstance(flagged, list):
            excluded.update(flagged)

    # Phase-based filtering
    if treatment_phase in ("immediate_post_op", "post_surgery_week1"):
        allowed_levels = ["beginner"]
    elif treatment_phase in ("post_surgery_week2",):
        allowed_levels = ["beginner", "intermediate"]
    else:
        allowed_levels = ["beginner", "intermediate", "advanced"]

    # Build recommendations per difficulty level
    all_recommendations = []

    for difficulty in ["beginner", "intermediate", "advanced"]:
        if difficulty not in allowed_levels:
            continue

        exercise_ids = injury_exercises.get(difficulty, [])

        for ex_id in exercise_ids:
            if ex_id in excluded:
                continue

            ex = get_exercise_by_id(ex_id)
            if not ex:
                continue

            # Adjust reps
            target_reps = ex["targetReps"]
            if age > 60:
                target_reps = max(4, target_reps - 2)
            if treatment_phase in ("immediate_post_op", "post_surgery_week1"):
                target_reps = max(3, target_reps // 2)
            if difficulty == "beginner":
                target_reps = min(target_reps, 10)

            reason = f"Safe for {injury_type} — {difficulty} level"
            if report_data and report_data.get("recommended_exercises"):
                for doc_ex in report_data["recommended_exercises"]:
                    if isinstance(doc_ex, str) and doc_ex.lower() in ex["label"].lower():
                        reason = "Recommended by your medical report"
                        break

            # Build YouTube search URL for tutorial
            yt_query = f"{ex['label']} rehabilitation exercise tutorial"
            yt_url = f"https://www.youtube.com/results?search_query={yt_query.replace(' ', '+')}"

            all_recommendations.append({
                "exerciseId": ex["id"],
                "label": ex["label"],
                "description": ex.get("description", ""),
                "instructions": ex.get("instructions", []),
                "reason": reason,
                "priority": "high" if difficulty == "beginner" else ("medium" if difficulty == "intermediate" else "low"),
                "targetReps": target_reps,
                "difficulty": difficulty,
                "category": ex["category"],
                "youtubeUrl": yt_url,
            })

    return all_recommendations


def calculate_adaptive_reps(
    assessed_peak_angle: float,
    full_rom: float,
    difficulty: str = "beginner",
) -> int:
    """
    Calculate personalized rep target based on assessed mobility.

    Args:
        assessed_peak_angle: The peak angle the patient achieved during assessment
        full_rom: The anatomical full ROM target for this exercise (from angleChecks targetMax)
        difficulty: Exercise difficulty level

    Returns:
        Recommended number of reps (3-12)
    """
    if full_rom <= 0:
        return 8  # fallback

    # What percentage of full ROM can the patient achieve?
    rom_pct = min((assessed_peak_angle / full_rom) * 100, 100)

    # Map ROM percentage to rep count
    if rom_pct < 25:
        base_reps = 3   # Very limited — just 3 reps
    elif rom_pct < 40:
        base_reps = 4   # Low mobility
    elif rom_pct < 55:
        base_reps = 5
    elif rom_pct < 70:
        base_reps = 6   # Moderate
    elif rom_pct < 80:
        base_reps = 8   # Good
    elif rom_pct < 90:
        base_reps = 10  # Very good
    else:
        base_reps = 12  # Excellent / near-full ROM

    # Difficulty adjustment
    if difficulty == "intermediate":
        base_reps = max(3, base_reps - 1)
    elif difficulty == "advanced":
        base_reps = max(3, base_reps - 2)

    return base_reps

