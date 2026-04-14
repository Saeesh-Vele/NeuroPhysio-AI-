"""
NeuroPhysio AI — Rep Counting Engine (State Machine)
Counts reps using movement state transitions.
Supports PARTIAL reps for users with limited mobility:
  - Full rep (1.0): rest → active zone → rest
  - Partial rep (0.5): rest → midpoint zone (but not active) → rest
Tracks peak angle and max ROM for mobility progression.

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
    """State machine rep counter with partial rep support for rehabilitation."""

    def __init__(self, exercise_id: str):
        self.exercise = get_exercise_by_id(exercise_id)
        if not self.exercise:
            raise ValueError(f"Unknown exercise: {exercise_id}")

        self.state = "rest"  # rest | partial | active
        self.full_reps = 0
        self.partial_reps = 0
        self.active_timestamp = 0
        self.partial_timestamp = 0
        self.last_angle = None
        self.noise_threshold = 3  # degrees

        # ── Peak angle tracking ──
        self.peak_angle = 0.0       # maximum angle achieved this session
        self.rest_angle = None      # angle at rest position (baseline)
        self.current_attempt_peak = 0.0  # peak for current movement attempt
        self.max_rom_achieved = 0.0  # max range of motion (peak - rest delta)

        # ── Angle history for ROM tracking ──
        self.angle_samples = []     # last N angles for smoothing

        rep_logic = self.exercise["repLogic"]
        self.primary_angle_name = rep_logic["primaryAngle"]
        self.down_threshold = rep_logic["downThreshold"]
        self.up_threshold = rep_logic["upThreshold"]
        self.min_hold_ms = rep_logic.get("minHoldMs", 200)

        # Auto-detect exercise direction from thresholds
        if self.down_threshold < self.up_threshold:
            self.direction = "lift"
        else:
            self.direction = "lower"

        # Calculate midpoint for partial rep detection
        self.midpoint = (self.down_threshold + self.up_threshold) / 2

        # Find the primary angle check to get keypoint names
        self.primary_check = None
        for check in self.exercise["angleChecks"]:
            if check["name"] == self.primary_angle_name:
                self.primary_check = check
                break

        logger.info(
            f"   RepEngine: {exercise_id} | dir={self.direction} | "
            f"rest={'<'+str(self.down_threshold) if self.direction=='lift' else '>'+str(self.down_threshold)} | "
            f"mid={self.midpoint:.0f} | "
            f"active={'>' + str(self.up_threshold) if self.direction=='lift' else '<' + str(self.up_threshold)}"
        )

    @property
    def reps(self):
        """Total reps = full reps + (partial reps * 0.5)"""
        return self.full_reps + (self.partial_reps * 0.5)

    def _is_in_rest_zone(self, angle: float) -> bool:
        """Check if the angle is in the rest/starting zone."""
        if self.direction == "lift":
            return angle < self.down_threshold
        else:
            return angle > self.down_threshold

    def _is_in_midpoint_zone(self, angle: float) -> bool:
        """Check if the angle has passed the midpoint (partial rep territory)."""
        if self.direction == "lift":
            return angle >= self.midpoint and angle < self.up_threshold
        else:
            return angle <= self.midpoint and angle > self.up_threshold

    def _is_in_active_zone(self, angle: float) -> bool:
        """Check if the angle is in the active/peak position (full rep territory)."""
        if self.direction == "lift":
            return angle >= self.up_threshold
        else:
            return angle <= self.up_threshold

    def _has_returned_to_rest(self, angle: float) -> bool:
        """Check if the angle has returned enough toward rest to count as 'returned'.
        Uses a forgiving check — just needs to come past 75% mark back toward rest."""
        quarter_back = self.midpoint + (self.down_threshold - self.midpoint) * 0.5
        if self.direction == "lift":
            return angle < quarter_back
        else:
            return angle > quarter_back

    def _update_peak(self, angle: float):
        """Update peak angle tracking."""
        if self.direction == "lift":
            if angle > self.current_attempt_peak:
                self.current_attempt_peak = angle
            if angle > self.peak_angle:
                self.peak_angle = angle
        else:
            # For "lower" exercises, lower is better
            if self.current_attempt_peak == 0 or angle < self.current_attempt_peak:
                self.current_attempt_peak = angle
            if self.peak_angle == 0 or angle < self.peak_angle:
                self.peak_angle = angle

        # Calculate ROM (range of motion)
        if self.rest_angle is not None:
            rom = abs(angle - self.rest_angle)
            if rom > self.max_rom_achieved:
                self.max_rom_achieved = rom

    def process_frame(self, keypoints: Dict[str, dict]) -> Dict[str, Any]:
        """
        Process a single frame of keypoint data.
        Rep cycles:
          - Full rep: rest → active → rest = 1.0 rep
          - Partial rep: rest → midpoint → rest = 0.5 rep
        """
        if not self.primary_check:
            return self._status()

        # Calculate primary angle
        points = self.primary_check["points"]
        current_angle = get_angle(keypoints, tuple(points))

        if current_angle is None:
            return self._status()

        # Track rest baseline (first stable reading)
        if self.rest_angle is None and self._is_in_rest_zone(current_angle):
            self.rest_angle = current_angle

        # Noise filter: ignore tiny fluctuations when at rest
        if self.last_angle is not None:
            if abs(current_angle - self.last_angle) < self.noise_threshold:
                if self.state == "rest":
                    return self._status()

        self.last_angle = current_angle
        now = time.time() * 1000  # ms

        # Update peak angle tracking
        self._update_peak(current_angle)

        if self.state == "rest":
            # Reset attempt peak for new movement
            self.current_attempt_peak = current_angle

            # Check if moved to active zone (full rep territory)
            if self._is_in_active_zone(current_angle):
                self.state = "active"
                self.active_timestamp = now
            # Check if moved to midpoint zone (partial rep territory)
            elif self._is_in_midpoint_zone(current_angle):
                self.state = "partial"
                self.partial_timestamp = now

        elif self.state == "partial":
            # In partial zone — check if progressed to active (upgrade to full rep)
            if self._is_in_active_zone(current_angle):
                self.state = "active"
                self.active_timestamp = now
            # Check if returned to rest without reaching active (partial rep)
            elif self._has_returned_to_rest(current_angle):
                elapsed = now - self.partial_timestamp
                if elapsed > self.min_hold_ms:
                    self.partial_reps += 1
                    logger.info(f"   +0.5 partial rep | total: {self.reps} | peak: {self.current_attempt_peak:.1f}°")
                self.state = "rest"

        elif self.state == "active":
            # In active position — check if returned to rest (full rep)
            if self._has_returned_to_rest(current_angle):
                elapsed = now - self.active_timestamp
                if elapsed > self.min_hold_ms:
                    self.full_reps += 1
                    logger.info(f"   +1.0 full rep | total: {self.reps} | peak: {self.current_attempt_peak:.1f}°")
                self.state = "rest"

        return self._status()

    def _status(self) -> Dict[str, Any]:
        return {
            "reps": self.reps,
            "fullReps": self.full_reps,
            "partialReps": self.partial_reps,
            "state": self.state,
            "lastAngle": self.last_angle,
            "peakAngle": round(self.peak_angle, 1),
            "maxRomAchieved": round(self.max_rom_achieved, 1),
            "restAngle": round(self.rest_angle, 1) if self.rest_angle else None,
            "currentAttemptPeak": round(self.current_attempt_peak, 1),
            "exerciseId": self.exercise["id"],
            "targetReps": self.exercise["targetReps"],
        }

    def reset(self):
        self.state = "rest"
        self.full_reps = 0
        self.partial_reps = 0
        self.active_timestamp = 0
        self.partial_timestamp = 0
        self.last_angle = None
        self.peak_angle = 0.0
        self.rest_angle = None
        self.current_attempt_peak = 0.0
        self.max_rom_achieved = 0.0
        self.angle_samples = []
