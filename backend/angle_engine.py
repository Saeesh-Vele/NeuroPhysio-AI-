"""
NeuroPhysio AI — Angle Calculation Engine
Pure math. Zero exercise logic.
Three points in → one angle out.
"""

import numpy as np
from typing import Optional, Tuple, Dict

def calculate_angle(
    a: Tuple[float, float],
    b: Tuple[float, float],
    c: Tuple[float, float]
) -> float:
    """
    Calculate the angle at vertex B formed by points A-B-C.
    Returns angle in degrees (0–180).
    """
    a = np.array(a)
    b = np.array(b)
    c = np.array(c)

    ba = a - b
    bc = c - b

    cos_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8)
    cos_angle = np.clip(cos_angle, -1.0, 1.0)
    angle = np.degrees(np.arccos(cos_angle))

    return float(angle)


def get_keypoint(
    keypoints: Dict[str, dict],
    name: str,
    confidence_threshold: float = 0.3
) -> Optional[Tuple[float, float]]:
    """
    Return (x, y) for a named keypoint if confidence >= threshold.
    Returns None otherwise.
    """
    kp = keypoints.get(name)
    if kp is None:
        return None
    if kp.get("score", 0) < confidence_threshold:
        return None
    return (kp["x"], kp["y"])


def get_angle(
    keypoints: Dict[str, dict],
    points: Tuple[str, str, str],
    confidence_threshold: float = 0.3
) -> Optional[float]:
    """
    Calculate angle from three named keypoints.
    Returns None if any point has low confidence.
    """
    a = get_keypoint(keypoints, points[0], confidence_threshold)
    b = get_keypoint(keypoints, points[1], confidence_threshold)
    c = get_keypoint(keypoints, points[2], confidence_threshold)

    if a is None or b is None or c is None:
        return None

    return calculate_angle(a, b, c)


def calculate_all_joint_angles(keypoints: Dict[str, dict]) -> Dict[str, Optional[float]]:
    """
    Calculate all standard joint angles from keypoints.
    Returns dict of angle_name → angle_degrees (or None).
    """
    angles = {}

    # Shoulder angles
    angles["left_shoulder_angle"] = get_angle(keypoints, ("left_hip", "left_shoulder", "left_elbow"))
    angles["right_shoulder_angle"] = get_angle(keypoints, ("right_hip", "right_shoulder", "right_elbow"))

    # Elbow angles
    angles["left_elbow_angle"] = get_angle(keypoints, ("left_shoulder", "left_elbow", "left_wrist"))
    angles["right_elbow_angle"] = get_angle(keypoints, ("right_shoulder", "right_elbow", "right_wrist"))

    # Hip angles
    angles["left_hip_angle"] = get_angle(keypoints, ("left_shoulder", "left_hip", "left_knee"))
    angles["right_hip_angle"] = get_angle(keypoints, ("right_shoulder", "right_hip", "right_knee"))

    # Knee angles
    angles["left_knee_angle"] = get_angle(keypoints, ("left_hip", "left_knee", "left_ankle"))
    angles["right_knee_angle"] = get_angle(keypoints, ("right_hip", "right_knee", "right_ankle"))

    return angles
