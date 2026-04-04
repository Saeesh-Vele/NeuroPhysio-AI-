"""
NeuroPhysio AI — Real-Time Feedback Engine
Generates coaching messages from angle data.
"""

from typing import Dict, List, Any, Optional
from angle_engine import get_angle
from exercise_library import get_exercise_by_id


def get_feedback(
    keypoints: Dict[str, dict],
    exercise_id: str
) -> Dict[str, Any]:
    """
    Generate real-time feedback for the current pose against exercise config.
    Returns { status, message, angleResults[] }
    """
    exercise = get_exercise_by_id(exercise_id)
    if not exercise:
        return {
            "status": "error",
            "message": "Unknown exercise",
            "angleResults": [],
        }

    angle_results: List[Dict[str, Any]] = []
    has_warning = False
    has_error = False
    first_issue_message = ""

    for check in exercise["angleChecks"]:
        points = check["points"]
        current_angle = get_angle(keypoints, tuple(points))

        if current_angle is None:
            angle_results.append({
                "angleName": check["name"],
                "currentAngle": None,
                "status": "unknown",
                "message": "Joint not visible — adjust camera",
            })
            has_error = True
            if not first_issue_message:
                first_issue_message = "Some joints are not visible. Please step back."
            continue

        if current_angle < check["targetMin"]:
            status = "low"
            message = check["feedbackLow"]
            has_warning = True
            if not first_issue_message:
                first_issue_message = message
        elif current_angle > check["targetMax"]:
            status = "high"
            message = check["feedbackHigh"]
            has_warning = True
            if not first_issue_message:
                first_issue_message = message
        else:
            status = "good"
            message = check["feedbackGood"]

        angle_results.append({
            "angleName": check["name"],
            "currentAngle": round(current_angle, 1),
            "status": status,
            "message": message,
        })

    # Determine overall status
    if has_error:
        overall_status = "error"
        overall_message = first_issue_message or "Position not detected"
    elif has_warning:
        overall_status = "warning"
        overall_message = first_issue_message or "Adjust your form"
    else:
        overall_status = "good"
        overall_message = "Perfect form! Keep it up!"

    return {
        "status": overall_status,
        "message": overall_message,
        "angleResults": angle_results,
    }
