"""
NeuroPhysio AI — Exercise Library
50+ rehabilitation exercises with full angle configurations.
Adding a new exercise = adding one entry to EXERCISES list.
"""

from typing import List, Dict, Any

# ═══════════════════════════════════════════════
#  EXERCISE CONFIGURATION SCHEMA
# ═══════════════════════════════════════════════
# Each exercise has:
#   id: unique identifier
#   label: display name
#   description: what the exercise does
#   category: knee/shoulder/hip/balance/general/cognitive
#   targetMuscles: list of muscles targeted
#   difficulty: beginner/intermediate/advanced
#   targetReps: default rep count
#   angleChecks: list of angle validations
#   repLogic: how reps are counted
#   contraindications: when NOT to do this exercise
#   instructions: step-by-step guide

EXERCISES: List[Dict[str, Any]] = [
    # ═══════════════════════════════════════════
    #  KNEE REHABILITATION (15 exercises)
    # ═══════════════════════════════════════════
    {
        "id": "knee_bend",
        "label": "Knee Bend",
        "description": "Controlled knee flexion to improve range of motion",
        "category": "knee",
        "targetMuscles": ["quadriceps", "hamstrings"],
        "difficulty": "beginner",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "knee_angle",
                "points": ["left_hip", "left_knee", "left_ankle"],
                "targetMin": 80,
                "targetMax": 100,
                "feedbackLow": "Bend your knee more",
                "feedbackHigh": "Don't over-bend your knee",
                "feedbackGood": "Perfect knee angle"
            }
        ],
        "repLogic": {
            "primaryAngle": "knee_angle",
            "downThreshold": 95,
            "upThreshold": 160,
            "minHoldMs": 500
        },
        "contraindications": ["acute_knee_injury", "post_surgery_week1"],
        "instructions": [
            "Stand with feet shoulder-width apart",
            "Slowly bend your knee bringing heel toward buttock",
            "Hold at the bottom for 1 second",
            "Slowly return to standing position"
        ]
    },
    {
        "id": "heel_slide",
        "label": "Heel Slide",
        "description": "Lying heel slide for knee flexion recovery",
        "category": "knee",
        "targetMuscles": ["quadriceps", "hamstrings"],
        "difficulty": "beginner",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "knee_angle",
                "points": ["left_hip", "left_knee", "left_ankle"],
                "targetMin": 70,
                "targetMax": 90,
                "feedbackLow": "Slide your heel closer to your body",
                "feedbackHigh": "Don't slide too far",
                "feedbackGood": "Good heel slide range"
            }
        ],
        "repLogic": {
            "primaryAngle": "knee_angle",
            "downThreshold": 85,
            "upThreshold": 155,
            "minHoldMs": 500
        },
        "contraindications": ["acute_knee_injury"],
        "instructions": [
            "Lie on your back with legs extended",
            "Slowly slide your heel toward your buttock",
            "Hold briefly then slide back"
        ]
    },
    {
        "id": "sit_to_stand",
        "label": "Sit to Stand",
        "description": "Functional transfer exercise for knee and hip strength",
        "category": "knee",
        "targetMuscles": ["quadriceps", "gluteus_maximus", "hamstrings"],
        "difficulty": "intermediate",
        "targetReps": 8,
        "angleChecks": [
            {
                "name": "knee_angle",
                "points": ["left_hip", "left_knee", "left_ankle"],
                "targetMin": 80,
                "targetMax": 100,
                "feedbackLow": "Sit down more fully",
                "feedbackHigh": "Don't lean too far forward",
                "feedbackGood": "Great sitting depth"
            },
            {
                "name": "hip_angle",
                "points": ["left_shoulder", "left_hip", "left_knee"],
                "targetMin": 80,
                "targetMax": 100,
                "feedbackLow": "Lean forward slightly more",
                "feedbackHigh": "Keep your torso more upright",
                "feedbackGood": "Good torso position"
            }
        ],
        "repLogic": {
            "primaryAngle": "knee_angle",
            "downThreshold": 95,
            "upThreshold": 165,
            "minHoldMs": 300
        },
        "contraindications": ["severe_knee_pain", "balance_impairment"],
        "instructions": [
            "Sit on a chair with feet flat on the floor",
            "Lean slightly forward and push through your heels",
            "Stand up fully, then slowly sit back down"
        ]
    },
    {
        "id": "straight_leg_raise",
        "label": "Straight Leg Raise",
        "description": "Quadriceps strengthening with leg extended",
        "category": "knee",
        "targetMuscles": ["quadriceps", "hip_flexors"],
        "difficulty": "beginner",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "hip_angle",
                "points": ["left_shoulder", "left_hip", "left_knee"],
                "targetMin": 130,
                "targetMax": 160,
                "feedbackLow": "Raise your leg higher",
                "feedbackHigh": "Don't raise too high",
                "feedbackGood": "Perfect leg height"
            }
        ],
        "repLogic": {
            "primaryAngle": "hip_angle",
            "downThreshold": 165,
            "upThreshold": 135,
            "minHoldMs": 1000
        },
        "contraindications": ["acute_hip_injury"],
        "instructions": [
            "Lie on your back with one knee bent",
            "Keeping the other leg straight, lift it to 45 degrees",
            "Hold for 3 seconds then slowly lower"
        ]
    },
    {
        "id": "wall_squat",
        "label": "Wall Squat",
        "description": "Isometric squat against wall for quad strengthening",
        "category": "knee",
        "targetMuscles": ["quadriceps", "gluteus_maximus"],
        "difficulty": "intermediate",
        "targetReps": 8,
        "angleChecks": [
            {
                "name": "knee_angle",
                "points": ["left_hip", "left_knee", "left_ankle"],
                "targetMin": 85,
                "targetMax": 100,
                "feedbackLow": "Slide down the wall more",
                "feedbackHigh": "Don't go too deep",
                "feedbackGood": "Perfect wall squat depth"
            }
        ],
        "repLogic": {
            "primaryAngle": "knee_angle",
            "downThreshold": 95,
            "upThreshold": 160,
            "minHoldMs": 2000
        },
        "contraindications": ["severe_knee_pain", "post_surgery_week2"],
        "instructions": [
            "Stand with your back against a wall",
            "Slide down until knees are at 90 degrees",
            "Hold position for 5-10 seconds",
            "Slide back up slowly"
        ]
    },
    {
        "id": "terminal_knee_extension",
        "label": "Terminal Knee Extension",
        "description": "Final degrees of knee extension strengthening",
        "category": "knee",
        "targetMuscles": ["vastus_medialis", "quadriceps"],
        "difficulty": "beginner",
        "targetReps": 12,
        "angleChecks": [
            {
                "name": "knee_angle",
                "points": ["left_hip", "left_knee", "left_ankle"],
                "targetMin": 165,
                "targetMax": 180,
                "feedbackLow": "Straighten your knee fully",
                "feedbackHigh": "Good full extension",
                "feedbackGood": "Perfect knee extension"
            }
        ],
        "repLogic": {
            "primaryAngle": "knee_angle",
            "downThreshold": 140,
            "upThreshold": 170,
            "minHoldMs": 500
        },
        "contraindications": ["knee_hyperextension"],
        "instructions": [
            "Stand with a resistance band behind your knee",
            "Slowly extend your knee to full straightening",
            "Hold for 2 seconds then slowly bend back"
        ]
    },
    {
        "id": "hamstring_curl",
        "label": "Hamstring Curl",
        "description": "Standing hamstring curl for posterior chain",
        "category": "knee",
        "targetMuscles": ["hamstrings", "gastrocnemius"],
        "difficulty": "beginner",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "knee_angle",
                "points": ["left_hip", "left_knee", "left_ankle"],
                "targetMin": 40,
                "targetMax": 70,
                "feedbackLow": "Curl your heel higher",
                "feedbackHigh": "Don't curl too aggressively",
                "feedbackGood": "Great hamstring curl"
            }
        ],
        "repLogic": {
            "primaryAngle": "knee_angle",
            "downThreshold": 65,
            "upThreshold": 155,
            "minHoldMs": 300
        },
        "contraindications": ["hamstring_strain"],
        "instructions": [
            "Stand holding a chair for balance",
            "Bend your knee bringing heel toward buttock",
            "Hold briefly then slowly lower"
        ]
    },
    {
        "id": "calf_raise",
        "label": "Calf Raise",
        "description": "Heel raise for calf and ankle strength",
        "category": "knee",
        "targetMuscles": ["gastrocnemius", "soleus"],
        "difficulty": "beginner",
        "targetReps": 12,
        "angleChecks": [
            {
                "name": "ankle_angle",
                "points": ["left_knee", "left_ankle", "left_hip"],
                "targetMin": 140,
                "targetMax": 170,
                "feedbackLow": "Rise up higher on your toes",
                "feedbackHigh": "Good height",
                "feedbackGood": "Perfect calf raise"
            }
        ],
        "repLogic": {
            "primaryAngle": "ankle_angle",
            "downThreshold": 155,
            "upThreshold": 145,
            "minHoldMs": 300
        },
        "contraindications": ["achilles_tendon_injury"],
        "instructions": [
            "Stand with feet hip-width apart",
            "Rise up onto your toes",
            "Hold at the top for 1 second",
            "Slowly lower back down"
        ]
    },
    {
        "id": "step_up",
        "label": "Step Up",
        "description": "Functional stepping exercise for lower extremity",
        "category": "knee",
        "targetMuscles": ["quadriceps", "gluteus_maximus", "hip_flexors"],
        "difficulty": "intermediate",
        "targetReps": 8,
        "angleChecks": [
            {
                "name": "knee_angle",
                "points": ["left_hip", "left_knee", "left_ankle"],
                "targetMin": 80,
                "targetMax": 100,
                "feedbackLow": "Step up more fully",
                "feedbackHigh": "Control your descent",
                "feedbackGood": "Great step up form"
            }
        ],
        "repLogic": {
            "primaryAngle": "knee_angle",
            "downThreshold": 95,
            "upThreshold": 165,
            "minHoldMs": 300
        },
        "contraindications": ["severe_knee_pain", "balance_impairment"],
        "instructions": [
            "Stand in front of a step or low platform",
            "Step up with one foot, pushing through the heel",
            "Bring the other foot up, then step back down"
        ]
    },
    {
        "id": "quad_set",
        "label": "Quad Set",
        "description": "Isometric quadriceps contraction",
        "category": "knee",
        "targetMuscles": ["quadriceps"],
        "difficulty": "beginner",
        "targetReps": 15,
        "angleChecks": [
            {
                "name": "knee_angle",
                "points": ["left_hip", "left_knee", "left_ankle"],
                "targetMin": 170,
                "targetMax": 180,
                "feedbackLow": "Press the back of your knee down harder",
                "feedbackHigh": "Good contraction",
                "feedbackGood": "Strong quad contraction"
            }
        ],
        "repLogic": {
            "primaryAngle": "knee_angle",
            "downThreshold": 165,
            "upThreshold": 175,
            "minHoldMs": 3000
        },
        "contraindications": [],
        "instructions": [
            "Sit with legs extended",
            "Tighten your quadriceps, pressing knee into the floor",
            "Hold for 5 seconds then relax"
        ]
    },
    {
        "id": "ankle_pump",
        "label": "Ankle Pump",
        "description": "Ankle dorsiflexion/plantarflexion for circulation",
        "category": "knee",
        "targetMuscles": ["tibialis_anterior", "gastrocnemius"],
        "difficulty": "beginner",
        "targetReps": 20,
        "angleChecks": [
            {
                "name": "ankle_angle",
                "points": ["left_knee", "left_ankle", "left_hip"],
                "targetMin": 100,
                "targetMax": 130,
                "feedbackLow": "Pull your toes up more",
                "feedbackHigh": "Point your toes down more",
                "feedbackGood": "Good ankle range"
            }
        ],
        "repLogic": {
            "primaryAngle": "ankle_angle",
            "downThreshold": 125,
            "upThreshold": 105,
            "minHoldMs": 200
        },
        "contraindications": [],
        "instructions": [
            "Sit or lie with legs extended",
            "Point toes away, then pull toes toward you",
            "Repeat in a pumping motion"
        ]
    },
    {
        "id": "prone_knee_bend",
        "label": "Prone Knee Bend",
        "description": "Face-down knee flexion for deeper range of motion",
        "category": "knee",
        "targetMuscles": ["hamstrings", "quadriceps"],
        "difficulty": "intermediate",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "knee_angle",
                "points": ["left_hip", "left_knee", "left_ankle"],
                "targetMin": 60,
                "targetMax": 90,
                "feedbackLow": "Bend your knee more",
                "feedbackHigh": "Ease off slightly",
                "feedbackGood": "Good prone knee bend"
            }
        ],
        "repLogic": {
            "primaryAngle": "knee_angle",
            "downThreshold": 85,
            "upThreshold": 155,
            "minHoldMs": 500
        },
        "contraindications": ["acute_knee_injury", "knee_effusion"],
        "instructions": [
            "Lie face down on a flat surface",
            "Slowly bend your knee bringing heel toward buttock",
            "Hold briefly then slowly straighten"
        ]
    },

    # ═══════════════════════════════════════════
    #  SHOULDER REHABILITATION (12 exercises)
    # ═══════════════════════════════════════════
    {
        "id": "arm_press",
        "label": "Arm Press (Shoulder Press)",
        "description": "Overhead arm press for shoulder strength and vertical mobility",
        "category": "shoulder",
        "targetMuscles": ["deltoids", "triceps", "upper_trapezius"],
        "difficulty": "advanced",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "shoulder_angle",
                "points": ["left_hip", "left_shoulder", "left_elbow"],
                "targetMin": 160,
                "targetMax": 180,
                "feedbackLow": "Press higher overhead",
                "feedbackHigh": "Perfect extension",
                "feedbackGood": "Excellent press"
            },
            {
                "name": "elbow_angle",
                "points": ["left_shoulder", "left_elbow", "left_wrist"],
                "targetMin": 160,
                "targetMax": 180,
                "feedbackLow": "Straighten the elbow completely",
                "feedbackHigh": "Don't lock the elbow too hard",
                "feedbackGood": "Good elbow extension"
            }
        ],
        "repLogic": {
            "primaryAngle": "elbow_angle",
            "downThreshold": 90,
            "upThreshold": 160,
            "minHoldMs": 200
        },
        "contraindications": ["acute_shoulder_injury", "frozen_shoulder_acute"],
        "instructions": [
            "Sit or stand tall",
            "Start with hands near shoulders, elbows bent at 90°",
            "Smoothly press arms straight up overhead",
            "Slowly lower back to starting position"
        ]
    },
    {
        "id": "arm_raise",
        "label": "Arm Raise",
        "description": "Forward arm elevation for shoulder mobility",
        "category": "shoulder",
        "targetMuscles": ["anterior_deltoid", "supraspinatus"],
        "difficulty": "beginner",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "shoulder_angle",
                "points": ["left_hip", "left_shoulder", "left_elbow"],
                "targetMin": 160,
                "targetMax": 180,
                "feedbackLow": "Raise your arm higher",
                "feedbackHigh": "Perfect height",
                "feedbackGood": "Excellent arm raise"
            }
        ],
        "repLogic": {
            "primaryAngle": "shoulder_angle",
            "downThreshold": 50,
            "upThreshold": 155,
            "minHoldMs": 300
        },
        "contraindications": ["acute_shoulder_injury", "rotator_cuff_tear_acute"],
        "instructions": [
            "Stand with arm at your side",
            "Slowly raise arm forward overhead",
            "Hold at the top briefly",
            "Slowly lower back to starting position"
        ]
    },
    {
        "id": "shoulder_abduction",
        "label": "Shoulder Abduction",
        "description": "Lateral arm raise for shoulder mobility",
        "category": "shoulder",
        "targetMuscles": ["middle_deltoid", "supraspinatus"],
        "difficulty": "beginner",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "shoulder_angle",
                "points": ["left_hip", "left_shoulder", "left_elbow"],
                "targetMin": 85,
                "targetMax": 95,
                "feedbackLow": "Raise your arm out to the side more",
                "feedbackHigh": "Don't raise above shoulder height",
                "feedbackGood": "Perfect shoulder level"
            }
        ],
        "repLogic": {
            "primaryAngle": "shoulder_angle",
            "downThreshold": 30,
            "upThreshold": 80,
            "minHoldMs": 300
        },
        "contraindications": ["shoulder_impingement", "rotator_cuff_tear_acute"],
        "instructions": [
            "Stand with arms at your sides",
            "Raise arm out to the side to shoulder height",
            "Hold for 1 second",
            "Slowly lower"
        ]
    },
    {
        "id": "shoulder_flexion",
        "label": "Shoulder Flexion",
        "description": "Overhead reach for shoulder flexion range",
        "category": "shoulder",
        "targetMuscles": ["anterior_deltoid", "biceps"],
        "difficulty": "beginner",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "shoulder_angle",
                "points": ["left_hip", "left_shoulder", "left_elbow"],
                "targetMin": 160,
                "targetMax": 180,
                "feedbackLow": "Reach higher overhead",
                "feedbackHigh": "Full range achieved",
                "feedbackGood": "Great shoulder flexion"
            }
        ],
        "repLogic": {
            "primaryAngle": "shoulder_angle",
            "downThreshold": 40,
            "upThreshold": 155,
            "minHoldMs": 300
        },
        "contraindications": ["frozen_shoulder_acute"],
        "instructions": [
            "Stand with arm at side, palm facing forward",
            "Raise arm forward and overhead as high as comfortable",
            "Lower slowly"
        ]
    },
    {
        "id": "shoulder_external_rotation",
        "label": "Shoulder External Rotation",
        "description": "Rotator cuff strengthening exercise",
        "category": "shoulder",
        "targetMuscles": ["infraspinatus", "teres_minor"],
        "difficulty": "beginner",
        "targetReps": 12,
        "angleChecks": [
            {
                "name": "elbow_angle",
                "points": ["left_shoulder", "left_elbow", "left_wrist"],
                "targetMin": 85,
                "targetMax": 95,
                "feedbackLow": "Keep elbow at 90 degrees",
                "feedbackHigh": "Don't extend arm too much",
                "feedbackGood": "Good elbow position"
            }
        ],
        "repLogic": {
            "primaryAngle": "elbow_angle",
            "downThreshold": 80,
            "upThreshold": 100,
            "minHoldMs": 500
        },
        "contraindications": ["rotator_cuff_tear_acute"],
        "instructions": [
            "Stand with elbow bent at 90 degrees, tucked to side",
            "Rotate forearm outward keeping elbow at side",
            "Hold, then slowly return"
        ]
    },
    {
        "id": "wall_pushup",
        "label": "Wall Push-Up",
        "description": "Modified push-up against wall for upper body",
        "category": "shoulder",
        "targetMuscles": ["pectoralis_major", "triceps", "anterior_deltoid"],
        "difficulty": "beginner",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "elbow_angle",
                "points": ["left_shoulder", "left_elbow", "left_wrist"],
                "targetMin": 80,
                "targetMax": 100,
                "feedbackLow": "Bend elbows more toward the wall",
                "feedbackHigh": "Don't bend too deep",
                "feedbackGood": "Perfect push-up depth"
            }
        ],
        "repLogic": {
            "primaryAngle": "elbow_angle",
            "downThreshold": 95,
            "upThreshold": 160,
            "minHoldMs": 300
        },
        "contraindications": ["wrist_injury", "severe_shoulder_pain"],
        "instructions": [
            "Stand arm's length from a wall",
            "Place palms on wall at shoulder height",
            "Bend elbows lowering chest toward wall",
            "Push back to starting position"
        ]
    },
    {
        "id": "pendulum_exercise",
        "label": "Pendulum Exercise",
        "description": "Gentle shoulder mobility through gravity-assisted swinging",
        "category": "shoulder",
        "targetMuscles": ["rotator_cuff", "deltoid"],
        "difficulty": "beginner",
        "targetReps": 15,
        "angleChecks": [
            {
                "name": "shoulder_angle",
                "points": ["left_hip", "left_shoulder", "left_elbow"],
                "targetMin": 10,
                "targetMax": 40,
                "feedbackLow": "Let arm swing more freely",
                "feedbackHigh": "Smaller swings please",
                "feedbackGood": "Good pendulum motion"
            }
        ],
        "repLogic": {
            "primaryAngle": "shoulder_angle",
            "downThreshold": 15,
            "upThreshold": 35,
            "minHoldMs": 200
        },
        "contraindications": [],
        "instructions": [
            "Lean forward supporting yourself with one hand",
            "Let injured arm hang freely",
            "Gently swing arm in small circles",
            "Gradually increase circle size"
        ]
    },
    {
        "id": "scapular_squeeze",
        "label": "Scapular Squeeze",
        "description": "Shoulder blade retraction for posture",
        "category": "shoulder",
        "targetMuscles": ["rhomboids", "middle_trapezius"],
        "difficulty": "beginner",
        "targetReps": 12,
        "angleChecks": [
            {
                "name": "shoulder_angle",
                "points": ["left_hip", "left_shoulder", "left_elbow"],
                "targetMin": 5,
                "targetMax": 20,
                "feedbackLow": "Squeeze shoulder blades together more",
                "feedbackHigh": "Relax slightly",
                "feedbackGood": "Good scapular retraction"
            }
        ],
        "repLogic": {
            "primaryAngle": "shoulder_angle",
            "downThreshold": 10,
            "upThreshold": 25,
            "minHoldMs": 2000
        },
        "contraindications": [],
        "instructions": [
            "Sit or stand with arms at sides",
            "Squeeze shoulder blades together",
            "Hold for 5 seconds",
            "Release slowly"
        ]
    },
    {
        "id": "bicep_curl",
        "label": "Bicep Curl",
        "description": "Elbow flexion for arm strength",
        "category": "shoulder",
        "targetMuscles": ["biceps_brachii", "brachialis"],
        "difficulty": "beginner",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "elbow_angle",
                "points": ["left_shoulder", "left_elbow", "left_wrist"],
                "targetMin": 30,
                "targetMax": 60,
                "feedbackLow": "Curl your arm more",
                "feedbackHigh": "Don't squeeze too tight",
                "feedbackGood": "Perfect curl"
            }
        ],
        "repLogic": {
            "primaryAngle": "elbow_angle",
            "downThreshold": 50,
            "upThreshold": 150,
            "minHoldMs": 300
        },
        "contraindications": ["elbow_injury"],
        "instructions": [
            "Stand with arms at sides, palms facing forward",
            "Curl your hand toward your shoulder",
            "Squeeze at the top, then slowly lower"
        ]
    },
    {
        "id": "tricep_extension",
        "label": "Tricep Extension",
        "description": "Elbow extension for arm strength",
        "category": "shoulder",
        "targetMuscles": ["triceps_brachii"],
        "difficulty": "intermediate",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "elbow_angle",
                "points": ["left_shoulder", "left_elbow", "left_wrist"],
                "targetMin": 160,
                "targetMax": 180,
                "feedbackLow": "Extend your arm fully",
                "feedbackHigh": "Don't hyperextend",
                "feedbackGood": "Full extension achieved"
            }
        ],
        "repLogic": {
            "primaryAngle": "elbow_angle",
            "downThreshold": 70,
            "upThreshold": 155,
            "minHoldMs": 300
        },
        "contraindications": ["elbow_injury"],
        "instructions": [
            "Raise arm overhead",
            "Bend elbow to lower hand behind head",
            "Extend arm back to full overhead position"
        ]
    },

    # ═══════════════════════════════════════════
    #  HIP REHABILITATION (10 exercises)
    # ═══════════════════════════════════════════
    {
        "id": "hip_abduction",
        "label": "Hip Abduction",
        "description": "Side-lying leg raise for hip strengthening",
        "category": "hip",
        "targetMuscles": ["gluteus_medius", "tensor_fasciae_latae"],
        "difficulty": "beginner",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "hip_angle",
                "points": ["left_shoulder", "left_hip", "left_knee"],
                "targetMin": 140,
                "targetMax": 165,
                "feedbackLow": "Lift your leg higher to the side",
                "feedbackHigh": "Don't lift too high",
                "feedbackGood": "Perfect hip abduction"
            }
        ],
        "repLogic": {
            "primaryAngle": "hip_angle",
            "downThreshold": 170,
            "upThreshold": 145,
            "minHoldMs": 500
        },
        "contraindications": ["hip_replacement_week1"],
        "instructions": [
            "Lie on your side with legs straight",
            "Lift top leg to about 45 degrees",
            "Hold for 2 seconds",
            "Slowly lower"
        ]
    },
    {
        "id": "hip_adduction",
        "label": "Hip Adduction",
        "description": "Inner thigh strengthening exercise",
        "category": "hip",
        "targetMuscles": ["adductor_magnus", "adductor_longus"],
        "difficulty": "beginner",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "hip_angle",
                "points": ["left_shoulder", "left_hip", "left_knee"],
                "targetMin": 165,
                "targetMax": 180,
                "feedbackLow": "Squeeze your legs together more",
                "feedbackHigh": "Good squeeze",
                "feedbackGood": "Great adduction"
            }
        ],
        "repLogic": {
            "primaryAngle": "hip_angle",
            "downThreshold": 170,
            "upThreshold": 178,
            "minHoldMs": 1000
        },
        "contraindications": ["groin_strain"],
        "instructions": [
            "Lie on your side with a pillow between knees",
            "Squeeze the pillow with your inner thighs",
            "Hold for 5 seconds then release"
        ]
    },
    {
        "id": "glute_bridge",
        "label": "Glute Bridge",
        "description": "Bridge exercise for gluteal and core activation",
        "category": "hip",
        "targetMuscles": ["gluteus_maximus", "hamstrings", "core"],
        "difficulty": "beginner",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "hip_angle",
                "points": ["left_shoulder", "left_hip", "left_knee"],
                "targetMin": 160,
                "targetMax": 180,
                "feedbackLow": "Push your hips up higher",
                "feedbackHigh": "Don't overarch your back",
                "feedbackGood": "Perfect bridge position"
            }
        ],
        "repLogic": {
            "primaryAngle": "hip_angle",
            "downThreshold": 100,
            "upThreshold": 165,
            "minHoldMs": 1000
        },
        "contraindications": ["acute_lower_back_pain"],
        "instructions": [
            "Lie on your back with knees bent, feet flat",
            "Push through heels to lift hips to ceiling",
            "Squeeze glutes at the top",
            "Hold 3 seconds then lower slowly"
        ]
    },
    {
        "id": "clamshell",
        "label": "Clamshell",
        "description": "Hip external rotation for gluteal activation",
        "category": "hip",
        "targetMuscles": ["gluteus_medius", "piriformis"],
        "difficulty": "beginner",
        "targetReps": 12,
        "angleChecks": [
            {
                "name": "knee_angle",
                "points": ["left_hip", "left_knee", "left_ankle"],
                "targetMin": 80,
                "targetMax": 100,
                "feedbackLow": "Open your knees more",
                "feedbackHigh": "Don't force the opening",
                "feedbackGood": "Good clamshell opening"
            }
        ],
        "repLogic": {
            "primaryAngle": "knee_angle",
            "downThreshold": 95,
            "upThreshold": 85,
            "minHoldMs": 500
        },
        "contraindications": ["hip_replacement_precautions"],
        "instructions": [
            "Lie on your side with knees bent at 90 degrees",
            "Keep feet together, lift top knee open like a clamshell",
            "Hold briefly then slowly close"
        ]
    },
    {
        "id": "hip_flexion",
        "label": "Hip Flexion",
        "description": "Standing hip flexion for hip mobility",
        "category": "hip",
        "targetMuscles": ["hip_flexors", "rectus_femoris"],
        "difficulty": "beginner",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "hip_angle",
                "points": ["left_shoulder", "left_hip", "left_knee"],
                "targetMin": 90,
                "targetMax": 120,
                "feedbackLow": "Bring your knee up higher",
                "feedbackHigh": "Don't lift too high",
                "feedbackGood": "Good hip flexion range"
            }
        ],
        "repLogic": {
            "primaryAngle": "hip_angle",
            "downThreshold": 115,
            "upThreshold": 165,
            "minHoldMs": 500
        },
        "contraindications": ["hip_replacement_week1", "acute_hip_pain"],
        "instructions": [
            "Stand holding a support for balance",
            "Lift one knee toward chest",
            "Hold for 2 seconds",
            "Slowly lower"
        ]
    },
    {
        "id": "fire_hydrant",
        "label": "Fire Hydrant",
        "description": "Quadruped hip abduction for glute strengthening",
        "category": "hip",
        "targetMuscles": ["gluteus_medius", "gluteus_minimus"],
        "difficulty": "intermediate",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "hip_angle",
                "points": ["left_shoulder", "left_hip", "left_knee"],
                "targetMin": 100,
                "targetMax": 130,
                "feedbackLow": "Lift your knee out more",
                "feedbackHigh": "Don't rotate too far",
                "feedbackGood": "Great fire hydrant form"
            }
        ],
        "repLogic": {
            "primaryAngle": "hip_angle",
            "downThreshold": 125,
            "upThreshold": 105,
            "minHoldMs": 300
        },
        "contraindications": ["wrist_injury", "knee_on_floor_pain"],
        "instructions": [
            "Start on hands and knees",
            "Keeping knee bent, lift leg out to the side",
            "Hold briefly then lower back down"
        ]
    },
    {
        "id": "hip_extension",
        "label": "Hip Extension",
        "description": "Standing hip extension for gluteal strength",
        "category": "hip",
        "targetMuscles": ["gluteus_maximus", "hamstrings"],
        "difficulty": "beginner",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "hip_angle",
                "points": ["left_shoulder", "left_hip", "left_knee"],
                "targetMin": 170,
                "targetMax": 200,
                "feedbackLow": "Extend your leg further behind",
                "feedbackHigh": "Don't overarch your back",
                "feedbackGood": "Good hip extension"
            }
        ],
        "repLogic": {
            "primaryAngle": "hip_angle",
            "downThreshold": 170,
            "upThreshold": 195,
            "minHoldMs": 500
        },
        "contraindications": ["acute_lower_back_pain"],
        "instructions": [
            "Stand holding a support",
            "Extend one leg straight behind you",
            "Squeeze your glute at the top",
            "Slowly return to standing"
        ]
    },

    # ═══════════════════════════════════════════
    #  BALANCE EXERCISES (6 exercises)
    # ═══════════════════════════════════════════
    {
        "id": "single_leg_stand",
        "label": "Single Leg Stand",
        "description": "Static balance on one leg",
        "category": "balance",
        "targetMuscles": ["ankle_stabilizers", "core", "hip_stabilizers"],
        "difficulty": "intermediate",
        "targetReps": 6,
        "angleChecks": [
            {
                "name": "hip_angle",
                "points": ["left_shoulder", "left_hip", "left_knee"],
                "targetMin": 170,
                "targetMax": 180,
                "feedbackLow": "Stand taller",
                "feedbackHigh": "Stay centered",
                "feedbackGood": "Good balance posture"
            }
        ],
        "repLogic": {
            "primaryAngle": "hip_angle",
            "downThreshold": 170,
            "upThreshold": 178,
            "minHoldMs": 10000
        },
        "contraindications": ["severe_balance_impairment", "fall_risk_high"],
        "instructions": [
            "Stand near a support for safety",
            "Lift one foot off the ground",
            "Hold for 10-30 seconds",
            "Switch legs"
        ]
    },
    {
        "id": "tandem_stance",
        "label": "Tandem Stance",
        "description": "Heel-to-toe standing balance",
        "category": "balance",
        "targetMuscles": ["ankle_stabilizers", "core"],
        "difficulty": "intermediate",
        "targetReps": 6,
        "angleChecks": [
            {
                "name": "hip_angle",
                "points": ["left_shoulder", "left_hip", "left_knee"],
                "targetMin": 170,
                "targetMax": 180,
                "feedbackLow": "Keep body upright",
                "feedbackHigh": "Good alignment",
                "feedbackGood": "Great tandem stance"
            }
        ],
        "repLogic": {
            "primaryAngle": "hip_angle",
            "downThreshold": 170,
            "upThreshold": 178,
            "minHoldMs": 10000
        },
        "contraindications": ["severe_balance_impairment"],
        "instructions": [
            "Place one foot directly in front of the other (heel to toe)",
            "Hold this position for 10-30 seconds",
            "Switch feet"
        ]
    },

    # ═══════════════════════════════════════════
    #  GENERAL / COMPOUND EXERCISES (11 exercises)
    # ═══════════════════════════════════════════
    {
        "id": "squat",
        "label": "Squat",
        "description": "Full body squat for lower extremity strength",
        "category": "general",
        "targetMuscles": ["quadriceps", "gluteus_maximus", "hamstrings", "core"],
        "difficulty": "intermediate",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "knee_angle",
                "points": ["left_hip", "left_knee", "left_ankle"],
                "targetMin": 80,
                "targetMax": 100,
                "feedbackLow": "Squat deeper",
                "feedbackHigh": "Don't go too deep for now",
                "feedbackGood": "Perfect squat depth"
            },
            {
                "name": "hip_angle",
                "points": ["left_shoulder", "left_hip", "left_knee"],
                "targetMin": 70,
                "targetMax": 90,
                "feedbackLow": "Lean forward slightly",
                "feedbackHigh": "Keep torso more upright",
                "feedbackGood": "Good torso angle"
            }
        ],
        "repLogic": {
            "primaryAngle": "knee_angle",
            "downThreshold": 95,
            "upThreshold": 165,
            "minHoldMs": 300
        },
        "contraindications": ["severe_knee_pain", "post_surgery_week2"],
        "instructions": [
            "Stand with feet shoulder-width apart",
            "Push hips back and bend knees",
            "Lower until thighs parallel to floor",
            "Push through heels to return to standing"
        ]
    },
    {
        "id": "lunge",
        "label": "Lunge",
        "description": "Forward lunge for lower body strength and balance",
        "category": "general",
        "targetMuscles": ["quadriceps", "gluteus_maximus", "hamstrings"],
        "difficulty": "intermediate",
        "targetReps": 8,
        "angleChecks": [
            {
                "name": "knee_angle",
                "points": ["left_hip", "left_knee", "left_ankle"],
                "targetMin": 85,
                "targetMax": 95,
                "feedbackLow": "Step forward more",
                "feedbackHigh": "Don't lunge too deep",
                "feedbackGood": "Perfect lunge depth"
            }
        ],
        "repLogic": {
            "primaryAngle": "knee_angle",
            "downThreshold": 95,
            "upThreshold": 160,
            "minHoldMs": 300
        },
        "contraindications": ["severe_knee_pain", "balance_impairment"],
        "instructions": [
            "Stand with feet together",
            "Step forward with one leg",
            "Lower until front knee is at 90 degrees",
            "Push back to starting position"
        ]
    },
    {
        "id": "bird_dog",
        "label": "Bird Dog",
        "description": "Core stability with opposite arm/leg extension",
        "category": "general",
        "targetMuscles": ["erector_spinae", "core", "gluteus_maximus"],
        "difficulty": "intermediate",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "hip_angle",
                "points": ["left_shoulder", "left_hip", "left_knee"],
                "targetMin": 170,
                "targetMax": 180,
                "feedbackLow": "Extend leg further behind",
                "feedbackHigh": "Keep hips level",
                "feedbackGood": "Perfect bird dog form"
            }
        ],
        "repLogic": {
            "primaryAngle": "hip_angle",
            "downThreshold": 130,
            "upThreshold": 170,
            "minHoldMs": 2000
        },
        "contraindications": ["wrist_injury", "acute_lower_back_pain"],
        "instructions": [
            "Start on hands and knees",
            "Extend opposite arm and leg simultaneously",
            "Hold for 3-5 seconds",
            "Return to starting position and switch sides"
        ]
    },
    {
        "id": "dead_bug",
        "label": "Dead Bug",
        "description": "Core stability exercise lying on back",
        "category": "general",
        "targetMuscles": ["transverse_abdominis", "rectus_abdominis", "hip_flexors"],
        "difficulty": "intermediate",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "hip_angle",
                "points": ["left_shoulder", "left_hip", "left_knee"],
                "targetMin": 90,
                "targetMax": 100,
                "feedbackLow": "Lower your leg more slowly",
                "feedbackHigh": "Don't let your back arch",
                "feedbackGood": "Great core control"
            }
        ],
        "repLogic": {
            "primaryAngle": "hip_angle",
            "downThreshold": 95,
            "upThreshold": 155,
            "minHoldMs": 500
        },
        "contraindications": ["acute_lower_back_pain"],
        "instructions": [
            "Lie on back with arms extended to ceiling, knees at 90°",
            "Lower opposite arm and leg toward floor",
            "Keep lower back pressed into floor",
            "Return and switch sides"
        ]
    },
    {
        "id": "pelvic_tilt",
        "label": "Pelvic Tilt",
        "description": "Core activation and lower back mobility",
        "category": "general",
        "targetMuscles": ["transverse_abdominis", "rectus_abdominis"],
        "difficulty": "beginner",
        "targetReps": 15,
        "angleChecks": [
            {
                "name": "hip_angle",
                "points": ["left_shoulder", "left_hip", "left_knee"],
                "targetMin": 150,
                "targetMax": 170,
                "feedbackLow": "Flatten your lower back more",
                "feedbackHigh": "Don't overarch",
                "feedbackGood": "Good pelvic tilt"
            }
        ],
        "repLogic": {
            "primaryAngle": "hip_angle",
            "downThreshold": 155,
            "upThreshold": 170,
            "minHoldMs": 2000
        },
        "contraindications": [],
        "instructions": [
            "Lie on back with knees bent",
            "Flatten lower back against the floor by tilting pelvis",
            "Hold for 5 seconds then release"
        ]
    },
    {
        "id": "cat_cow_stretch",
        "label": "Cat-Cow Stretch",
        "description": "Spinal mobility exercise on all fours",
        "category": "general",
        "targetMuscles": ["erector_spinae", "rectus_abdominis"],
        "difficulty": "beginner",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "hip_angle",
                "points": ["left_shoulder", "left_hip", "left_knee"],
                "targetMin": 80,
                "targetMax": 100,
                "feedbackLow": "Arch your back more",
                "feedbackHigh": "Round your back more",
                "feedbackGood": "Good spinal motion"
            }
        ],
        "repLogic": {
            "primaryAngle": "hip_angle",
            "downThreshold": 85,
            "upThreshold": 110,
            "minHoldMs": 1000
        },
        "contraindications": ["wrist_injury"],
        "instructions": [
            "Start on hands and knees",
            "Cat: Round back up toward ceiling, tuck chin",
            "Cow: Drop belly toward floor, lift head",
            "Flow between positions smoothly"
        ]
    },
    {
        "id": "neck_flexion",
        "label": "Neck Flexion",
        "description": "Gentle neck forward bend for cervical mobility",
        "category": "general",
        "targetMuscles": ["sternocleidomastoid", "scalenes"],
        "difficulty": "beginner",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "neck_angle",
                "points": ["left_eye", "left_ear", "left_shoulder"],
                "targetMin": 40,
                "targetMax": 60,
                "feedbackLow": "Tilt your chin down more",
                "feedbackHigh": "Don't force the stretch",
                "feedbackGood": "Good neck flexion"
            }
        ],
        "repLogic": {
            "primaryAngle": "neck_angle",
            "downThreshold": 55,
            "upThreshold": 80,
            "minHoldMs": 2000
        },
        "contraindications": ["cervical_spine_injury", "neck_surgery"],
        "instructions": [
            "Sit upright with good posture",
            "Slowly bring chin toward chest",
            "Hold for 5 seconds",
            "Slowly return to neutral"
        ]
    },
    {
        "id": "trunk_rotation",
        "label": "Trunk Rotation",
        "description": "Seated or standing torso rotation for spinal mobility",
        "category": "general",
        "targetMuscles": ["obliques", "erector_spinae"],
        "difficulty": "beginner",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "shoulder_angle",
                "points": ["left_hip", "left_shoulder", "left_elbow"],
                "targetMin": 20,
                "targetMax": 50,
                "feedbackLow": "Rotate further",
                "feedbackHigh": "Don't twist too far",
                "feedbackGood": "Good rotation range"
            }
        ],
        "repLogic": {
            "primaryAngle": "shoulder_angle",
            "downThreshold": 25,
            "upThreshold": 45,
            "minHoldMs": 1000
        },
        "contraindications": ["spinal_fusion", "acute_back_pain"],
        "instructions": [
            "Sit with arms crossed on chest",
            "Slowly rotate torso to one side",
            "Hold for 3 seconds",
            "Return to center and rotate to other side"
        ]
    },
    {
        "id": "wrist_curl",
        "label": "Wrist Curl",
        "description": "Wrist flexion strengthening",
        "category": "general",
        "targetMuscles": ["wrist_flexors"],
        "difficulty": "beginner",
        "targetReps": 12,
        "angleChecks": [
            {
                "name": "wrist_angle",
                "points": ["left_elbow", "left_wrist", "left_hip"],
                "targetMin": 50,
                "targetMax": 80,
                "feedbackLow": "Curl your wrist more",
                "feedbackHigh": "Don't over-flex",
                "feedbackGood": "Good wrist curl"
            }
        ],
        "repLogic": {
            "primaryAngle": "wrist_angle",
            "downThreshold": 75,
            "upThreshold": 55,
            "minHoldMs": 300
        },
        "contraindications": ["carpal_tunnel_acute", "wrist_fracture"],
        "instructions": [
            "Rest forearm on a surface with hand off edge",
            "Curl wrist upward",
            "Hold briefly then lower"
        ]
    },

    # ═══════════════════════════════════════════
    #  ADDITIONAL EXERCISES (13 more = 52 total)
    # ═══════════════════════════════════════════
    {
        "id": "seated_hamstring_stretch",
        "label": "Seated Hamstring Stretch",
        "description": "Seated forward lean to stretch hamstrings",
        "category": "general",
        "targetMuscles": ["hamstrings"],
        "difficulty": "beginner",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "hip_angle",
                "points": ["left_shoulder", "left_hip", "left_knee"],
                "targetMin": 60,
                "targetMax": 80,
                "feedbackLow": "Lean forward more",
                "feedbackHigh": "Don't overstretch",
                "feedbackGood": "Good stretch depth"
            }
        ],
        "repLogic": {"primaryAngle": "hip_angle", "downThreshold": 75, "upThreshold": 155, "minHoldMs": 3000},
        "contraindications": ["acute_lower_back_pain"],
        "instructions": ["Sit with one leg extended", "Lean forward reaching toward toes", "Hold for 15-20 seconds"]
    },
    {
        "id": "standing_calf_stretch",
        "label": "Standing Calf Stretch",
        "description": "Wall-supported calf stretch",
        "category": "general",
        "targetMuscles": ["gastrocnemius", "soleus"],
        "difficulty": "beginner",
        "targetReps": 8,
        "angleChecks": [
            {
                "name": "knee_angle",
                "points": ["left_hip", "left_knee", "left_ankle"],
                "targetMin": 160,
                "targetMax": 180,
                "feedbackLow": "Keep back leg straighter",
                "feedbackHigh": "Good leg position",
                "feedbackGood": "Great calf stretch"
            }
        ],
        "repLogic": {"primaryAngle": "knee_angle", "downThreshold": 165, "upThreshold": 175, "minHoldMs": 5000},
        "contraindications": ["achilles_tendon_injury"],
        "instructions": ["Place hands on wall", "Step one foot back keeping heel down", "Lean into wall until you feel calf stretch"]
    },
    {
        "id": "heel_to_toe_walk",
        "label": "Heel-to-Toe Walk",
        "description": "Dynamic balance walking exercise",
        "category": "balance",
        "targetMuscles": ["ankle_stabilizers", "core", "hip_stabilizers"],
        "difficulty": "intermediate",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "hip_angle",
                "points": ["left_shoulder", "left_hip", "left_knee"],
                "targetMin": 170,
                "targetMax": 180,
                "feedbackLow": "Stand up straighter",
                "feedbackHigh": "Good posture",
                "feedbackGood": "Excellent balance"
            }
        ],
        "repLogic": {"primaryAngle": "hip_angle", "downThreshold": 170, "upThreshold": 178, "minHoldMs": 500},
        "contraindications": ["severe_balance_impairment", "fall_risk_high"],
        "instructions": ["Walk in a straight line", "Place heel directly in front of other toe", "Walk 10 steps"]
    },
    {
        "id": "balance_reach",
        "label": "Balance Reach",
        "description": "Single-leg reach for dynamic balance",
        "category": "balance",
        "targetMuscles": ["core", "hip_stabilizers", "ankle_stabilizers"],
        "difficulty": "advanced",
        "targetReps": 8,
        "angleChecks": [
            {
                "name": "hip_angle",
                "points": ["left_shoulder", "left_hip", "left_knee"],
                "targetMin": 100,
                "targetMax": 140,
                "feedbackLow": "Reach further",
                "feedbackHigh": "Don't lean too far",
                "feedbackGood": "Great balance reach"
            }
        ],
        "repLogic": {"primaryAngle": "hip_angle", "downThreshold": 135, "upThreshold": 165, "minHoldMs": 1000},
        "contraindications": ["severe_balance_impairment", "fall_risk_high"],
        "instructions": ["Stand on one leg", "Reach forward with opposite hand", "Return to standing"]
    },
    {
        "id": "side_lunge",
        "label": "Side Lunge",
        "description": "Lateral lunge for hip and inner thigh mobility",
        "category": "general",
        "targetMuscles": ["adductors", "quadriceps", "gluteus_medius"],
        "difficulty": "intermediate",
        "targetReps": 8,
        "angleChecks": [
            {
                "name": "knee_angle",
                "points": ["left_hip", "left_knee", "left_ankle"],
                "targetMin": 80,
                "targetMax": 100,
                "feedbackLow": "Bend deeper into the lunge",
                "feedbackHigh": "Don't go too deep",
                "feedbackGood": "Good side lunge depth"
            }
        ],
        "repLogic": {"primaryAngle": "knee_angle", "downThreshold": 95, "upThreshold": 160, "minHoldMs": 300},
        "contraindications": ["groin_strain", "severe_knee_pain"],
        "instructions": ["Stand with feet wide apart", "Shift weight to one side bending that knee", "Push back to center"]
    },
    {
        "id": "step_down",
        "label": "Step Down",
        "description": "Controlled step-down for eccentric quad strength",
        "category": "knee",
        "targetMuscles": ["quadriceps", "gluteus_maximus"],
        "difficulty": "intermediate",
        "targetReps": 8,
        "angleChecks": [
            {
                "name": "knee_angle",
                "points": ["left_hip", "left_knee", "left_ankle"],
                "targetMin": 80,
                "targetMax": 100,
                "feedbackLow": "Lower more slowly",
                "feedbackHigh": "Control the descent",
                "feedbackGood": "Good step-down control"
            }
        ],
        "repLogic": {"primaryAngle": "knee_angle", "downThreshold": 95, "upThreshold": 165, "minHoldMs": 500},
        "contraindications": ["severe_knee_pain", "balance_impairment"],
        "instructions": ["Stand on a step", "Slowly lower one foot to the ground", "Push back up with the step leg"]
    },
    {
        "id": "wall_angel",
        "label": "Wall Angel",
        "description": "Wall slide for shoulder mobility and posture",
        "category": "shoulder",
        "targetMuscles": ["lower_trapezius", "serratus_anterior", "rotator_cuff"],
        "difficulty": "intermediate",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "shoulder_angle",
                "points": ["left_hip", "left_shoulder", "left_elbow"],
                "targetMin": 140,
                "targetMax": 170,
                "feedbackLow": "Slide arms higher up the wall",
                "feedbackHigh": "Don't force overhead",
                "feedbackGood": "Great wall angel form"
            }
        ],
        "repLogic": {"primaryAngle": "shoulder_angle", "downThreshold": 50, "upThreshold": 145, "minHoldMs": 300},
        "contraindications": ["frozen_shoulder_acute", "severe_shoulder_pain"],
        "instructions": ["Stand with back against wall", "Arms in 'W' position against wall", "Slide arms up into 'Y' position", "Slowly return to 'W'"]
    },
    {
        "id": "doorway_stretch",
        "label": "Doorway Chest Stretch",
        "description": "Pectoral stretch using a doorframe",
        "category": "shoulder",
        "targetMuscles": ["pectoralis_major", "anterior_deltoid"],
        "difficulty": "beginner",
        "targetReps": 8,
        "angleChecks": [
            {
                "name": "shoulder_angle",
                "points": ["left_hip", "left_shoulder", "left_elbow"],
                "targetMin": 85,
                "targetMax": 100,
                "feedbackLow": "Lean into the stretch more",
                "feedbackHigh": "Don't overstretch",
                "feedbackGood": "Good chest stretch"
            }
        ],
        "repLogic": {"primaryAngle": "shoulder_angle", "downThreshold": 80, "upThreshold": 105, "minHoldMs": 5000},
        "contraindications": ["shoulder_dislocation_recent"],
        "instructions": ["Stand in a doorway with arms on frame", "Lean forward through the doorway", "Hold stretch for 15-30 seconds"]
    },
    # ── Gentle Shoulder Exercises (for dislocation/early recovery) ──
    {
        "id": "shoulder_isometric_hold",
        "label": "Shoulder Isometric Hold",
        "description": "Gentle static hold to build shoulder stability without movement",
        "category": "shoulder",
        "targetMuscles": ["deltoid", "rotator_cuff", "supraspinatus"],
        "difficulty": "beginner",
        "targetReps": 8,
        "angleChecks": [
            {
                "name": "shoulder_angle",
                "points": ["left_hip", "left_shoulder", "left_elbow"],
                "targetMin": 25,
                "targetMax": 45,
                "feedbackLow": "Raise arm slightly against resistance",
                "feedbackHigh": "Don't raise too high, keep it gentle",
                "feedbackGood": "Perfect isometric hold position"
            }
        ],
        "repLogic": {"primaryAngle": "shoulder_angle", "downThreshold": 15, "upThreshold": 30, "minHoldMs": 3000},
        "contraindications": ["acute_shoulder_injury"],
        "instructions": [
            "Stand with arm at your side",
            "Push arm gently outward against a wall or doorframe",
            "Hold for 5 seconds without moving the arm",
            "Release and repeat — focus on engaging, not lifting"
        ]
    },
    {
        "id": "towel_slide",
        "label": "Towel Slide (Assisted Raise)",
        "description": "Use a towel for gentle assisted shoulder elevation — great for post-dislocation",
        "category": "shoulder",
        "targetMuscles": ["anterior_deltoid", "supraspinatus"],
        "difficulty": "beginner",
        "targetReps": 8,
        "angleChecks": [
            {
                "name": "shoulder_angle",
                "points": ["left_hip", "left_shoulder", "left_elbow"],
                "targetMin": 60,
                "targetMax": 90,
                "feedbackLow": "Slide the towel a bit higher",
                "feedbackHigh": "Don't go above shoulder height",
                "feedbackGood": "Perfect assisted raise"
            }
        ],
        "repLogic": {"primaryAngle": "shoulder_angle", "downThreshold": 30, "upThreshold": 65, "minHoldMs": 500},
        "contraindications": ["acute_shoulder_injury"],
        "instructions": [
            "Hold a towel with both hands on a table",
            "Slowly slide the towel forward to raise the injured arm",
            "Go only as far as comfortable — stop at shoulder height",
            "Slowly slide back to starting position"
        ]
    },
    {
        "id": "cross_body_stretch",
        "label": "Cross-Body Shoulder Stretch",
        "description": "Gentle cross-body stretch for posterior shoulder flexibility",
        "category": "shoulder",
        "targetMuscles": ["posterior_deltoid", "infraspinatus", "teres_minor"],
        "difficulty": "beginner",
        "targetReps": 6,
        "angleChecks": [
            {
                "name": "shoulder_angle",
                "points": ["left_hip", "left_shoulder", "left_elbow"],
                "targetMin": 70,
                "targetMax": 95,
                "feedbackLow": "Bring arm further across your body",
                "feedbackHigh": "Don't force it — keep it gentle",
                "feedbackGood": "Good stretch position"
            }
        ],
        "repLogic": {"primaryAngle": "shoulder_angle", "downThreshold": 30, "upThreshold": 75, "minHoldMs": 5000},
        "contraindications": ["acute_shoulder_injury", "labrum_tear_acute"],
        "instructions": [
            "Bring injured arm across your chest",
            "Use your other hand to gently pull at the elbow",
            "Hold the stretch for 15-20 seconds",
            "Release slowly — never bounce or force the stretch"
        ]
    },
    {
        "id": "finger_wall_walk",
        "label": "Finger Wall Walk",
        "description": "Walk fingers up a wall to gradually increase shoulder range of motion",
        "category": "shoulder",
        "targetMuscles": ["anterior_deltoid", "supraspinatus", "upper_trapezius"],
        "difficulty": "beginner",
        "targetReps": 6,
        "angleChecks": [
            {
                "name": "shoulder_angle",
                "points": ["left_hip", "left_shoulder", "left_elbow"],
                "targetMin": 90,
                "targetMax": 140,
                "feedbackLow": "Walk fingers a bit higher",
                "feedbackHigh": "Don't push past your comfort zone",
                "feedbackGood": "Great height — nice progress"
            }
        ],
        "repLogic": {"primaryAngle": "shoulder_angle", "downThreshold": 40, "upThreshold": 100, "minHoldMs": 1000},
        "contraindications": ["acute_shoulder_injury"],
        "instructions": [
            "Stand facing a wall, arm's length away",
            "Place fingertips on the wall at waist level",
            "Slowly walk your fingers up the wall",
            "Stop when you feel a gentle stretch, then walk back down"
        ]
    },
    {
        "id": "passive_external_rotation",
        "label": "Passive External Rotation",
        "description": "Gentle external rotation using a stick or towel for assistance",
        "category": "shoulder",
        "targetMuscles": ["infraspinatus", "teres_minor", "posterior_deltoid"],
        "difficulty": "beginner",
        "targetReps": 8,
        "angleChecks": [
            {
                "name": "elbow_angle",
                "points": ["left_shoulder", "left_elbow", "left_wrist"],
                "targetMin": 80,
                "targetMax": 100,
                "feedbackLow": "Keep elbow bent at 90 degrees",
                "feedbackHigh": "Don't straighten elbow",
                "feedbackGood": "Good arm position"
            }
        ],
        "repLogic": {"primaryAngle": "elbow_angle", "downThreshold": 75, "upThreshold": 95, "minHoldMs": 2000},
        "contraindications": ["acute_shoulder_dislocation"],
        "instructions": [
            "Hold a stick or towel with both hands",
            "Keep elbow of injured arm bent at 90° and tucked to your side",
            "Use the other hand to gently push the injured arm outward",
            "Hold for 5 seconds, then slowly return — don't force it"
        ]
    },
    {
        "id": "prone_press_up",
        "label": "Prone Press-Up",
        "description": "McKenzie extension for lower back mobility",
        "category": "general",
        "targetMuscles": ["erector_spinae", "abdominals"],
        "difficulty": "beginner",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "elbow_angle",
                "points": ["left_shoulder", "left_elbow", "left_wrist"],
                "targetMin": 160,
                "targetMax": 180,
                "feedbackLow": "Press up higher",
                "feedbackHigh": "Don't lock elbows",
                "feedbackGood": "Good spinal extension"
            }
        ],
        "repLogic": {"primaryAngle": "elbow_angle", "downThreshold": 80, "upThreshold": 155, "minHoldMs": 1000},
        "contraindications": ["spinal_stenosis", "spinal_fusion"],
        "instructions": ["Lie face down", "Place hands under shoulders", "Press up straightening elbows", "Keep hips on the floor"]
    },
    {
        "id": "standing_march",
        "label": "Standing March",
        "description": "Marching in place for hip flexion and balance",
        "category": "balance",
        "targetMuscles": ["hip_flexors", "core", "ankle_stabilizers"],
        "difficulty": "beginner",
        "targetReps": 20,
        "angleChecks": [
            {
                "name": "hip_angle",
                "points": ["left_shoulder", "left_hip", "left_knee"],
                "targetMin": 90,
                "targetMax": 120,
                "feedbackLow": "Lift knees higher",
                "feedbackHigh": "Don't lean back",
                "feedbackGood": "Good marching form"
            }
        ],
        "repLogic": {"primaryAngle": "hip_angle", "downThreshold": 115, "upThreshold": 165, "minHoldMs": 200},
        "contraindications": [],
        "instructions": ["Stand with arms at sides", "March in place lifting knees to hip height", "Swing arms naturally"]
    },
    {
        "id": "ankle_circles",
        "label": "Ankle Circles",
        "description": "Circular ankle mobility exercise",
        "category": "general",
        "targetMuscles": ["tibialis_anterior", "peroneal_muscles"],
        "difficulty": "beginner",
        "targetReps": 20,
        "angleChecks": [
            {
                "name": "knee_angle",
                "points": ["left_hip", "left_knee", "left_ankle"],
                "targetMin": 160,
                "targetMax": 180,
                "feedbackLow": "Keep leg steady",
                "feedbackHigh": "Good stability",
                "feedbackGood": "Good ankle mobility"
            }
        ],
        "repLogic": {"primaryAngle": "knee_angle", "downThreshold": 165, "upThreshold": 175, "minHoldMs": 200},
        "contraindications": ["ankle_fracture_acute"],
        "instructions": ["Sit or lie with leg elevated", "Rotate ankle in circles", "Do 10 clockwise then 10 counterclockwise"]
    },
    {
        "id": "wrist_extension",
        "label": "Wrist Extension",
        "description": "Wrist extension strengthening",
        "category": "general",
        "targetMuscles": ["wrist_extensors"],
        "difficulty": "beginner",
        "targetReps": 12,
        "angleChecks": [
            {
                "name": "wrist_angle",
                "points": ["left_elbow", "left_wrist", "left_hip"],
                "targetMin": 50,
                "targetMax": 80,
                "feedbackLow": "Extend your wrist more",
                "feedbackHigh": "Don't over-extend",
                "feedbackGood": "Good wrist extension"
            }
        ],
        "repLogic": {"primaryAngle": "wrist_angle", "downThreshold": 75, "upThreshold": 55, "minHoldMs": 300},
        "contraindications": ["carpal_tunnel_acute", "wrist_fracture"],
        "instructions": ["Rest forearm on surface palm down", "Lift hand upward at wrist", "Hold briefly then lower"]
    },
    {
        "id": "piriformis_stretch",
        "label": "Piriformis Stretch",
        "description": "Figure-4 stretch for piriformis and hip rotators",
        "category": "hip",
        "targetMuscles": ["piriformis", "gluteus_medius"],
        "difficulty": "beginner",
        "targetReps": 8,
        "angleChecks": [
            {
                "name": "hip_angle",
                "points": ["left_shoulder", "left_hip", "left_knee"],
                "targetMin": 80,
                "targetMax": 100,
                "feedbackLow": "Pull knee closer to chest",
                "feedbackHigh": "Don't force the stretch",
                "feedbackGood": "Good piriformis stretch"
            }
        ],
        "repLogic": {"primaryAngle": "hip_angle", "downThreshold": 95, "upThreshold": 155, "minHoldMs": 5000},
        "contraindications": ["hip_replacement_week1"],
        "instructions": ["Lie on back", "Cross one ankle over opposite knee", "Pull bottom knee toward chest", "Hold for 20-30 seconds"]
    },
    # ═══════════════════════════════════════════
    #  GENTLE RECOVERY (all body regions)
    # ═══════════════════════════════════════════

    # ── Ankle Gentle ──
    {
        "id": "ankle_alphabet",
        "label": "Ankle Alphabet Trace",
        "description": "Trace the alphabet in the air using your foot for gentle ankle mobility",
        "category": "knee",
        "targetMuscles": ["tibialis_anterior", "peroneus", "calf"],
        "difficulty": "beginner",
        "targetReps": 6,
        "angleChecks": [
            {
                "name": "knee_angle",
                "points": ["left_hip", "left_knee", "left_ankle"],
                "targetMin": 160,
                "targetMax": 180,
                "feedbackLow": "Keep leg extended while tracing",
                "feedbackHigh": "Good, keep going",
                "feedbackGood": "Nice ankle movement"
            }
        ],
        "repLogic": {"primaryAngle": "knee_angle", "downThreshold": 140, "upThreshold": 165, "minHoldMs": 500},
        "contraindications": ["acute_ankle_fracture"],
        "instructions": [
            "Sit with leg extended off the edge of a bed or chair",
            "Use your big toe like a pen",
            "Trace the letters A-B-C-D-E-F in the air",
            "Each full set of 6 letters = 1 rep"
        ]
    },
    {
        "id": "ankle_dorsiflexion",
        "label": "Ankle Dorsiflexion (Towel)",
        "description": "Pull toes toward shin with a towel for gentle dorsiflexion stretch",
        "category": "knee",
        "targetMuscles": ["tibialis_anterior", "calf"],
        "difficulty": "beginner",
        "targetReps": 8,
        "angleChecks": [
            {
                "name": "knee_angle",
                "points": ["left_hip", "left_knee", "left_ankle"],
                "targetMin": 160,
                "targetMax": 180,
                "feedbackLow": "Keep leg straight",
                "feedbackHigh": "Good",
                "feedbackGood": "Great stretch"
            }
        ],
        "repLogic": {"primaryAngle": "knee_angle", "downThreshold": 140, "upThreshold": 165, "minHoldMs": 3000},
        "contraindications": ["achilles_tendon_rupture"],
        "instructions": [
            "Sit with leg straight out in front of you",
            "Wrap a towel around the ball of your foot",
            "Gently pull the towel toward you until you feel a calf stretch",
            "Hold for 5 seconds then release"
        ]
    },
    {
        "id": "toe_raises",
        "label": "Seated Toe Raises",
        "description": "Raise toes off the floor while keeping heels down for gentle ankle strengthening",
        "category": "knee",
        "targetMuscles": ["tibialis_anterior", "ankle_stabilizers"],
        "difficulty": "beginner",
        "targetReps": 12,
        "angleChecks": [
            {
                "name": "knee_angle",
                "points": ["left_hip", "left_knee", "left_ankle"],
                "targetMin": 80,
                "targetMax": 100,
                "feedbackLow": "Sit upright with feet flat",
                "feedbackHigh": "Good",
                "feedbackGood": "Good seated position"
            }
        ],
        "repLogic": {"primaryAngle": "knee_angle", "downThreshold": 75, "upThreshold": 95, "minHoldMs": 500},
        "contraindications": [],
        "instructions": [
            "Sit in a chair with feet flat on the floor",
            "Keep heels on the ground",
            "Lift your toes as high as you can",
            "Hold for 2 seconds then lower — very gentle"
        ]
    },

    # ── Knee Gentle ──
    {
        "id": "patella_glide",
        "label": "Patella Mobilization",
        "description": "Gently glide the kneecap to reduce stiffness after surgery",
        "category": "knee",
        "targetMuscles": ["quadriceps", "patellar_tendon"],
        "difficulty": "beginner",
        "targetReps": 8,
        "angleChecks": [
            {
                "name": "knee_angle",
                "points": ["left_hip", "left_knee", "left_ankle"],
                "targetMin": 160,
                "targetMax": 180,
                "feedbackLow": "Keep leg straight and relaxed",
                "feedbackHigh": "Good",
                "feedbackGood": "Good position for patella work"
            }
        ],
        "repLogic": {"primaryAngle": "knee_angle", "downThreshold": 140, "upThreshold": 165, "minHoldMs": 2000},
        "contraindications": ["acute_knee_injury"],
        "instructions": [
            "Sit with injured leg straight",
            "Relax the quadriceps completely",
            "Gently push your kneecap up, down, left, and right",
            "Each cycle of 4 directions = 1 rep"
        ]
    },
    {
        "id": "hamstring_wall_stretch",
        "label": "Hamstring Wall Stretch",
        "description": "Gentle hamstring stretch using a wall for support",
        "category": "knee",
        "targetMuscles": ["hamstrings", "calf"],
        "difficulty": "beginner",
        "targetReps": 6,
        "angleChecks": [
            {
                "name": "hip_angle",
                "points": ["left_shoulder", "left_hip", "left_knee"],
                "targetMin": 70,
                "targetMax": 100,
                "feedbackLow": "Move closer to the wall",
                "feedbackHigh": "Don't overstretch",
                "feedbackGood": "Good hamstring stretch"
            }
        ],
        "repLogic": {"primaryAngle": "hip_angle", "downThreshold": 120, "upThreshold": 85, "minHoldMs": 5000},
        "contraindications": [],
        "instructions": [
            "Lie on your back near a doorway",
            "Place injured leg up against the wall",
            "Scoot closer until you feel a stretch behind the knee",
            "Hold for 20 seconds — never bounce"
        ]
    },

    # ── Hip Gentle ──
    {
        "id": "gentle_hip_circles",
        "label": "Gentle Hip Circles",
        "description": "Small circles with the leg to improve hip joint lubrication",
        "category": "hip",
        "targetMuscles": ["hip_flexors", "hip_abductors", "glutes"],
        "difficulty": "beginner",
        "targetReps": 8,
        "angleChecks": [
            {
                "name": "hip_angle",
                "points": ["left_shoulder", "left_hip", "left_knee"],
                "targetMin": 80,
                "targetMax": 110,
                "feedbackLow": "Lift knee a bit higher",
                "feedbackHigh": "Keep circles small and controlled",
                "feedbackGood": "Nice controlled circles"
            }
        ],
        "repLogic": {"primaryAngle": "hip_angle", "downThreshold": 120, "upThreshold": 90, "minHoldMs": 500},
        "contraindications": ["hip_replacement_week1"],
        "instructions": [
            "Stand holding a chair for balance",
            "Lift one knee to waist height",
            "Make small clockwise circles (4 circles)",
            "Then reverse direction (4 circles) = 1 rep"
        ]
    },
    {
        "id": "supine_hip_flexion",
        "label": "Supine Hip Flexion",
        "description": "Lying hip flexion for gentle range of motion recovery",
        "category": "hip",
        "targetMuscles": ["hip_flexors", "psoas"],
        "difficulty": "beginner",
        "targetReps": 8,
        "angleChecks": [
            {
                "name": "hip_angle",
                "points": ["left_shoulder", "left_hip", "left_knee"],
                "targetMin": 70,
                "targetMax": 100,
                "feedbackLow": "Bring knee a little closer to chest",
                "feedbackHigh": "Don't force it past comfortable range",
                "feedbackGood": "Good hip flexion"
            }
        ],
        "repLogic": {"primaryAngle": "hip_angle", "downThreshold": 140, "upThreshold": 90, "minHoldMs": 1000},
        "contraindications": ["hip_replacement_week1", "acute_hip_injury"],
        "instructions": [
            "Lie flat on your back",
            "Slowly slide one heel toward your buttock, bending the knee",
            "Keep sliding until you feel a gentle hip stretch",
            "Slowly straighten the leg back out"
        ]
    },

    # ── Wrist Gentle ──
    {
        "id": "wrist_circles",
        "label": "Wrist Circles",
        "description": "Gentle wrist rotations for flexibility and pain relief",
        "category": "general",
        "targetMuscles": ["wrist_flexors", "wrist_extensors"],
        "difficulty": "beginner",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "elbow_angle",
                "points": ["left_shoulder", "left_elbow", "left_wrist"],
                "targetMin": 80,
                "targetMax": 100,
                "feedbackLow": "Bend elbow to 90 degrees",
                "feedbackHigh": "Good",
                "feedbackGood": "Good wrist circle position"
            }
        ],
        "repLogic": {"primaryAngle": "elbow_angle", "downThreshold": 75, "upThreshold": 95, "minHoldMs": 500},
        "contraindications": ["wrist_fracture_acute"],
        "instructions": [
            "Hold forearm still with elbow bent at 90°",
            "Slowly rotate your wrist clockwise 5 times",
            "Then counterclockwise 5 times",
            "Keep movements slow and controlled"
        ]
    },
    {
        "id": "wrist_flex_extend",
        "label": "Wrist Flexion/Extension",
        "description": "Bend wrist up and down for ROM and tendon flexibility",
        "category": "general",
        "targetMuscles": ["wrist_flexors", "wrist_extensors", "forearm"],
        "difficulty": "beginner",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "elbow_angle",
                "points": ["left_shoulder", "left_elbow", "left_wrist"],
                "targetMin": 80,
                "targetMax": 100,
                "feedbackLow": "Keep elbow bent",
                "feedbackHigh": "Good",
                "feedbackGood": "Good position"
            }
        ],
        "repLogic": {"primaryAngle": "elbow_angle", "downThreshold": 75, "upThreshold": 95, "minHoldMs": 500},
        "contraindications": ["carpal_tunnel_acute", "wrist_fracture_acute"],
        "instructions": [
            "Rest your forearm on a table with hand hanging off the edge",
            "Slowly bend wrist downward as far as comfortable",
            "Then slowly bend wrist upward",
            "One down-and-up cycle = 1 rep"
        ]
    },
    {
        "id": "prayer_stretch",
        "label": "Prayer Stretch",
        "description": "Press palms together to stretch wrist flexors and extensors",
        "category": "general",
        "targetMuscles": ["wrist_flexors", "wrist_extensors", "forearm"],
        "difficulty": "beginner",
        "targetReps": 6,
        "angleChecks": [
            {
                "name": "elbow_angle",
                "points": ["left_shoulder", "left_elbow", "left_wrist"],
                "targetMin": 80,
                "targetMax": 110,
                "feedbackLow": "Bring hands up to chest height",
                "feedbackHigh": "Don't force the stretch",
                "feedbackGood": "Good stretch position"
            }
        ],
        "repLogic": {"primaryAngle": "elbow_angle", "downThreshold": 75, "upThreshold": 95, "minHoldMs": 5000},
        "contraindications": ["wrist_fracture_acute"],
        "instructions": [
            "Press palms together in front of your chest (prayer position)",
            "Slowly lower your hands while keeping palms pressed together",
            "Hold for 15-20 seconds when you feel the stretch",
            "Release and repeat"
        ]
    },

    # ── Back / Spine Gentle ──
    {
        "id": "cat_cow_stretch",
        "label": "Cat-Cow Stretch",
        "description": "Alternating spinal flexion and extension for lower back relief",
        "category": "general",
        "targetMuscles": ["erector_spinae", "abdominals", "hip_flexors"],
        "difficulty": "beginner",
        "targetReps": 8,
        "angleChecks": [
            {
                "name": "hip_angle",
                "points": ["left_shoulder", "left_hip", "left_knee"],
                "targetMin": 80,
                "targetMax": 100,
                "feedbackLow": "Arch your back more (cow)",
                "feedbackHigh": "Round your back more (cat)",
                "feedbackGood": "Good spinal movement"
            }
        ],
        "repLogic": {"primaryAngle": "hip_angle", "downThreshold": 95, "upThreshold": 160, "minHoldMs": 1000},
        "contraindications": ["spinal_fusion"],
        "instructions": [
            "Get on hands and knees (tabletop position)",
            "Inhale: arch back, lift head (cow pose)",
            "Exhale: round back, tuck chin (cat pose)",
            "Move slowly between the two positions"
        ]
    },
    {
        "id": "pelvic_tilt",
        "label": "Pelvic Tilt",
        "description": "Flatten lower back against the floor to engage core and relieve back pain",
        "category": "general",
        "targetMuscles": ["abdominals", "lower_back", "glutes"],
        "difficulty": "beginner",
        "targetReps": 10,
        "angleChecks": [
            {
                "name": "hip_angle",
                "points": ["left_shoulder", "left_hip", "left_knee"],
                "targetMin": 120,
                "targetMax": 150,
                "feedbackLow": "Bend knees more",
                "feedbackHigh": "Good",
                "feedbackGood": "Perfect position for pelvic tilts"
            }
        ],
        "repLogic": {"primaryAngle": "hip_angle", "downThreshold": 130, "upThreshold": 155, "minHoldMs": 1000},
        "contraindications": [],
        "instructions": [
            "Lie on your back with knees bent, feet flat",
            "Tighten abs and press lower back flat into the floor",
            "Hold for 5 seconds",
            "Release and repeat — very gentle core activation"
        ]
    },
    {
        "id": "dead_bug",
        "label": "Dead Bug",
        "description": "Controlled core stabilization exercise great for back pain rehab",
        "category": "general",
        "targetMuscles": ["transverse_abdominis", "rectus_abdominis", "hip_flexors"],
        "difficulty": "beginner",
        "targetReps": 8,
        "angleChecks": [
            {
                "name": "hip_angle",
                "points": ["left_shoulder", "left_hip", "left_knee"],
                "targetMin": 80,
                "targetMax": 110,
                "feedbackLow": "Bring knees above hips",
                "feedbackHigh": "Keep lower back pressed to floor",
                "feedbackGood": "Good dead bug form"
            }
        ],
        "repLogic": {"primaryAngle": "hip_angle", "downThreshold": 120, "upThreshold": 90, "minHoldMs": 1000},
        "contraindications": ["acute_lower_back_pain"],
        "instructions": [
            "Lie on your back with arms reaching toward ceiling",
            "Bring knees up so hips and knees are at 90°",
            "Slowly extend one arm overhead and opposite leg straight",
            "Return to start and switch sides — keep lower back flat"
        ]
    },

    # ── Balance Gentle ──
    {
        "id": "tandem_stance",
        "label": "Tandem Stance",
        "description": "Stand heel-to-toe for gentle balance training",
        "category": "balance",
        "targetMuscles": ["ankle_stabilizers", "core", "hip_abductors"],
        "difficulty": "beginner",
        "targetReps": 6,
        "angleChecks": [
            {
                "name": "knee_angle",
                "points": ["left_hip", "left_knee", "left_ankle"],
                "targetMin": 160,
                "targetMax": 180,
                "feedbackLow": "Keep legs straight",
                "feedbackHigh": "Good",
                "feedbackGood": "Good tandem stance"
            }
        ],
        "repLogic": {"primaryAngle": "knee_angle", "downThreshold": 150, "upThreshold": 170, "minHoldMs": 5000},
        "contraindications": [],
        "instructions": [
            "Stand near a wall or counter for safety",
            "Place one foot directly in front of the other (heel to toe)",
            "Hold for 10-15 seconds",
            "Switch which foot is in front"
        ]
    },
]





def get_all_exercises():
    """Return the full exercise library."""
    return EXERCISES


def get_exercise_by_id(exercise_id: str):
    """Look up exercise by ID."""
    for ex in EXERCISES:
        if ex["id"] == exercise_id:
            return ex
    return None


def get_exercises_by_category(category: str):
    """Get all exercises in a category."""
    return [ex for ex in EXERCISES if ex["category"] == category]


def get_exercise_ids():
    """Get list of all exercise IDs."""
    return [ex["id"] for ex in EXERCISES]
