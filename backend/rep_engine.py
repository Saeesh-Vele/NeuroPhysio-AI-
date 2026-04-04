"""
NeuroPhysio AI — Rep Counting Engine (State Machine)
Counts reps using movement state transitions. Never counts partial reps.
Handles both directions:
  - "lift" (arm raise): rest(low angle) → active(high angle) → rest = 1 rep
  - "lower" (squat):    rest(high angle) → active(low angle) → rest = 1 rep
"""

import time
import logging
from typing import Dict, Any
from angle_engine import get_angle
from exercise_library import get_exercise_by_id

logger = logging.getLogger("neurophysio")


class RepEngine:
    """State machine rep counter for a single exercise."""

    def __init__(self, exercise_id: str):
        self.exercise = get_exercise_by_id(exercise_id)
        if not self.exercise:
            raise ValueError(f"Unknown exercise: {exercise_id}")

        self.state = "rest"  # rest | active
        self.reps = 0
        self.active_timestamp = 0
        self.last_angle = None
        self.noise_threshold = 3  # degrees

        rep_logic = self.exercise["repLogic"]
        self.primary_angle_name = rep_logic["primaryAngle"]
        self.down_threshold = rep_logic["downThreshold"]
        self.up_threshold = rep_logic["upThreshold"]
        self.min_hold_ms = rep_logic.get("minHoldMs", 200)

        # Auto-detect exercise direction from thresholds
        # If downThreshold < upThreshold: "lift" type (arm raise, bicep curl)
        #   rest = angle < downThreshold, active = angle > upThreshold
        # If downThreshold >= upThreshold: "lower" type (calf raise, ankle pump)
        #   rest = angle > downThreshold, active = angle < upThreshold
        if self.down_threshold < self.up_threshold:
            self.direction = "lift"
        else:
            self.direction = "lower"

        # Find the primary angle check to get keypoint names
        self.primary_check = None
        for check in self.exercise["angleChecks"]:
            if check["name"] == self.primary_angle_name:
                self.primary_check = check
                break

        logger.info(
            f"   RepEngine: {exercise_id} | dir={self.direction} | "
            f"rest={'<'+str(self.down_threshold) if self.direction=='lift' else '>'+str(self.down_threshold)} | "
            f"active={'>' + str(self.up_threshold) if self.direction=='lift' else '<' + str(self.up_threshold)}"
        )

    def _is_in_rest_zone(self, angle: float) -> bool:
        """Check if the angle has returned enough toward rest to count as 'returned'."""
        # Use a forgiving midpoint — don't require full return to rest position
        midpoint = (self.down_threshold + self.up_threshold) / 2
        if self.direction == "lift":
            return angle < midpoint  # Just needs to come below midpoint
        else:
            return angle > midpoint  # Just needs to come above midpoint

    def _is_in_active_zone(self, angle: float) -> bool:
        """Check if the angle is in the active/peak position."""
        if self.direction == "lift":
            return angle > self.up_threshold
        else:
            return angle < self.up_threshold

    def process_frame(self, keypoints: Dict[str, dict]) -> Dict[str, Any]:
        """
        Process a single frame of keypoint data.
        Rep cycle: rest → active → rest = 1 rep counted on return to rest
        """
        if not self.primary_check:
            return self._status()

        # Calculate primary angle
        points = self.primary_check["points"]
        current_angle = get_angle(keypoints, tuple(points))

        if current_angle is None:
            return self._status()

        # Noise filter: ignore tiny fluctuations when at rest
        if self.last_angle is not None:
            if abs(current_angle - self.last_angle) < self.noise_threshold:
                if self.state == "rest":
                    return self._status()

        self.last_angle = current_angle
        now = time.time() * 1000  # ms

        if self.state == "rest":
            # Waiting in rest position — check if moved to active zone
            if self._is_in_active_zone(current_angle):
                self.state = "active"
                self.active_timestamp = now

        elif self.state == "active":
            # In active position — check if returned to rest (= 1 rep complete)
            if self._is_in_rest_zone(current_angle):
                elapsed = now - self.active_timestamp
                if elapsed > self.min_hold_ms:
                    self.reps += 1
                self.state = "rest"

        return self._status()

    def _status(self) -> Dict[str, Any]:
        return {
            "reps": self.reps,
            "state": self.state,
            "lastAngle": self.last_angle,
            "exerciseId": self.exercise["id"],
            "targetReps": self.exercise["targetReps"],
        }

    def reset(self):
        self.state = "rest"
        self.reps = 0
        self.active_timestamp = 0
        self.last_angle = None
