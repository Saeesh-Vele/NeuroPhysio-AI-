"""
NeuroPhysio AI — Exercise Recommendation Engine
Takes patient profile and generates personalized exercise plan.
"""

from typing import Dict, List, Any
from exercise_library import get_all_exercises, get_exercise_by_id


# ── Injury → Exercise Category Mapping ──
INJURY_EXERCISE_MAP = {
    "acl_reconstruction": ["knee", "balance", "hip"],
    "knee_replacement": ["knee", "balance", "hip"],
    "knee_arthroscopy": ["knee", "balance"],
    "meniscus_tear": ["knee", "hip"],
    "rotator_cuff_repair": ["shoulder"],
    "shoulder_replacement": ["shoulder"],
    "shoulder_dislocation": ["shoulder", "general"],
    "frozen_shoulder": ["shoulder"],
    "hip_replacement": ["hip", "balance", "knee"],
    "hip_fracture": ["hip", "balance"],
    "ankle_sprain": ["knee", "balance"],
    "ankle_fracture": ["knee", "balance"],
    "stroke": ["general", "balance", "shoulder", "hip", "knee"],
    "spinal_injury": ["general", "hip"],
    "lower_back_pain": ["general", "hip"],
    "general_deconditioning": ["general", "knee", "hip", "shoulder", "balance"],
}

# ── Pain Region → Contraindication Mapping ──
PAIN_CONTRAINDICATIONS = {
    "left_knee": ["severe_knee_pain", "acute_knee_injury"],
    "right_knee": ["severe_knee_pain", "acute_knee_injury"],
    "left_shoulder": ["severe_shoulder_pain", "acute_shoulder_injury"],
    "right_shoulder": ["severe_shoulder_pain", "acute_shoulder_injury"],
    "lower_back": ["acute_lower_back_pain", "acute_back_pain"],
    "left_hip": ["acute_hip_pain", "acute_hip_injury"],
    "right_hip": ["acute_hip_pain", "acute_hip_injury"],
    "left_ankle": ["achilles_tendon_injury"],
    "right_ankle": ["achilles_tendon_injury"],
    "left_wrist": ["wrist_injury", "carpal_tunnel_acute"],
    "right_wrist": ["wrist_injury", "carpal_tunnel_acute"],
    "neck": ["cervical_spine_injury"],
}


def recommend_exercises(
    injury_type: str,
    injury_region: str,
    pain_regions: List[Dict[str, Any]],
    treatment_phase: str = "active_rehab",
    age: int = 30,
    mobility_scores: Dict[str, float] = None,
) -> List[Dict[str, Any]]:
    """
    Generate personalized exercise recommendations based on patient profile.

    Returns list of { exerciseId, label, reason, priority, targetReps }
    """
    all_exercises = get_all_exercises()

    # 1. Determine relevant categories
    injury_key = injury_type.lower().replace(" ", "_").replace("-", "_")
    relevant_categories = INJURY_EXERCISE_MAP.get(
        injury_key, ["general", "balance"]
    )

    # 2. Collect contraindications from pain regions
    active_contraindications = set()
    for pr in pain_regions:
        region = pr.get("region", "")
        intensity = pr.get("intensity", 0)
        if intensity >= 7:
            contras = PAIN_CONTRAINDICATIONS.get(region, [])
            active_contraindications.update(contras)

    # Early post-surgery contraindications
    if treatment_phase in ("post_surgery_week1", "immediate_post_op"):
        active_contraindications.add("post_surgery_week1")
        active_contraindications.add("post_surgery_week2")
    elif treatment_phase == "post_surgery_week2":
        active_contraindications.add("post_surgery_week2")

    # 3. Filter and prioritize exercises
    recommendations = []

    for ex in all_exercises:
        # Check category relevance
        if ex["category"] not in relevant_categories:
            continue

        # Check contraindications
        has_contra = False
        for contra in ex.get("contraindications", []):
            if contra in active_contraindications:
                has_contra = True
                break
        if has_contra:
            continue

        # Difficulty filter based on age and phase
        if age > 65 and ex["difficulty"] == "advanced":
            continue
        if treatment_phase in ("post_surgery_week1", "post_surgery_week2"):
            if ex["difficulty"] != "beginner":
                continue

        # Calculate priority
        priority = "medium"
        reason = f"Recommended for {injury_type} recovery"

        # Higher priority for matching injury region
        if ex["category"] == relevant_categories[0]:
            priority = "high"
            reason = f"Primary exercise for {injury_type} rehabilitation"

        # Adjust reps based on phase and age
        target_reps = ex["targetReps"]
        if age > 60:
            target_reps = max(5, target_reps - 2)
        if treatment_phase in ("post_surgery_week1", "post_surgery_week2"):
            target_reps = max(5, target_reps // 2)

        # Mobility-based adjustments
        if mobility_scores:
            if ex["category"] == "knee" and mobility_scores.get("knee", 100) < 50:
                priority = "high"
                reason = f"Knee mobility at {mobility_scores['knee']}% — focus area"
            if ex["category"] == "shoulder" and mobility_scores.get("shoulder", 100) < 60:
                priority = "high"
                reason = f"Shoulder mobility at {mobility_scores['shoulder']}% — focus area"

        recommendations.append({
            "exerciseId": ex["id"],
            "label": ex["label"],
            "reason": reason,
            "priority": priority,
            "targetReps": target_reps,
            "difficulty": ex["difficulty"],
            "category": ex["category"],
        })

    # 4. Sort: high priority first, then by category relevance
    priority_order = {"high": 0, "medium": 1, "low": 2}
    recommendations.sort(key=lambda r: (
        priority_order.get(r["priority"], 1),
        relevant_categories.index(r["category"]) if r["category"] in relevant_categories else 99,
    ))

    # 5. Limit to top 12 exercises for a daily plan
    return recommendations[:12]
