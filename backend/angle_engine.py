"""
NeuroPhysio AI — Angle Calculation Engine
Pure math. Zero exercise logic.
Three points in → one angle out.
"""

from math import acos, degrees, sqrt
from typing import Optional, Tuple, Dict

# ----------------------------
# Type definitions
# ----------------------------

Point = Tuple[float, float]
Keypoint = Dict[str, float]
Keypoints = Dict[str, Keypoint]

# ----------------------------
# Joint angle definitions
# ----------------------------

ANGLE_MAP = {
    # Shoulder
    "left_shoulder_angle": ("left_hip", "left_shoulder", "left_elbow"),
    "right_shoulder_angle": ("right_hip", "right_shoulder", "right_elbow"),

    # Elbow
    "left_elbow_angle": ("left_shoulder", "left_elbow", "left_wrist"),
    "right_elbow_angle": ("right_shoulder", "right_elbow", "right_wrist"),

    # Hip
    "left_hip_angle": ("left_shoulder", "left_hip", "left_knee"),
    "right_hip_angle": ("right_shoulder", "right_hip", "right_knee"),

    # Knee
    "left_knee_angle": ("left_hip", "left_knee", "left_ankle"),
    "right_knee_angle": ("right_hip", "right_knee", "right_ankle"),
}


# ----------------------------
# Core angle calculation
# ----------------------------

def calculate_angle(
    a: Point,
    b: Point,
    c: Point
) -> float:
    """
    Calculate angle at point B formed by A-B-C.

    Returns:
        float: angle in degrees (0–180)
    """

    # Vector BA
    bax = a[0] - b[0]
    bay = a[1] - b[1]

    # Vector BC
    bcx = c[0] - b[0]
    bcy = c[1] - b[1]

    # Dot product
    dot = bax * bcx + bay * bcy

    # Magnitudes
    mag_ba = sqrt(bax**2 + bay**2)
    mag_bc = sqrt(bcx**2 + bcy**2)

    # Prevent division by zero
    if mag_ba == 0 or mag_bc == 0:
        return 0.0

    # Cosine formula
    cos_angle = dot / (mag_ba * mag_bc)

    # Numerical safety
    cos_angle = max(-1.0, min(1.0, cos_angle))

    angle = degrees(acos(cos_angle))

    return float(angle)


# ----------------------------
# Keypoint utilities
# ----------------------------

def get_keypoint(
    keypoints: Keypoints,
    name: str,
    confidence_threshold: float = 0.3
) -> Optional[Point]:
    """
    Return (x,y) if keypoint confidence is valid.

    Returns:
        (x,y) tuple or None
    """

    kp = keypoints.get(name)

    if kp is None:
        return None

    if kp.get("score", 0.0) < confidence_threshold:
        return None

    return (
        kp["x"],
        kp["y"]
    )


# ----------------------------
# Backward-compatible API
# ----------------------------

def get_angle(
    keypoints: Keypoints,
    points: Tuple[str, str, str],
    confidence_threshold: float = 0.3
) -> Optional[float]:
    """
    Calculate angle using named keypoints.

    Example:
        get_angle(
            keypoints,
            ("left_hip","left_knee","left_ankle")
        )
    """

    a = get_keypoint(
        keypoints,
        points[0],
        confidence_threshold
    )

    b = get_keypoint(
        keypoints,
        points[1],
        confidence_threshold
    )

    c = get_keypoint(
        keypoints,
        points[2],
        confidence_threshold
    )

    if None in (a, b, c):
        return None

    return calculate_angle(a, b, c)


# ----------------------------
# Batch angle calculation
# ----------------------------

def calculate_all_joint_angles(
    keypoints: Keypoints,
    confidence_threshold: float = 0.3
) -> Dict[str, Optional[float]]:
    """
    Calculate all joint angles.

    Returns:
        {
            "left_knee_angle": 165.2,
            "right_knee_angle": None,
            ...
        }
    """

    results = {}

    # Cache keypoints once
    valid_points = {
        name: get_keypoint(
            keypoints,
            name,
            confidence_threshold
        )
        for triple in ANGLE_MAP.values()
        for name in triple
    }

    for angle_name, (p1, p2, p3) in ANGLE_MAP.items():

        a = valid_points[p1]
        b = valid_points[p2]
        c = valid_points[p3]

        if None in (a, b, c):
            results[angle_name] = None
        else:
            results[angle_name] = calculate_angle(
                a,
                b,
                c
            )

    return results