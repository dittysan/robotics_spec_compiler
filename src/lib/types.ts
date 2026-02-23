import { z } from "zod";

export const task_category_enum = z.enum([
    "Pick Place",
    "Navigation",
    "Manipulation",
    "Assembly",
    "Inspection/Maintenance",
    "Fabrication",
    "HRI",
    "Other",
]);

export const task_subcategory_enum = z.enum([
    "bin picking",
    "part assembly/disassembly",
    "pick and place",
    "kitting", 
    "sorting",
    "packing",
    "loading/unloading",
    "palletizing",
    "grasping",
    "threading",
    "attaching",
    "in hand manipulation",
    "pouring",
    "insertion",
    "welding",
    "cutting", 
    "grinding",
    "spraying",
    "soldering",
    "sanding",
    "drilling",
    "bolting/screwing",
    "sealing",
    "measurement",
    "visual inspection",
    "sensory inspection",
    "scanning",
    "transportation",
    "docking",
    "machine tending",
    "collaborative assembly",
    "human handover",
    "human social interaction",
    "cleaning",
    "defect detection", 
    "exploration",
    "navigation",
    "long horizon planning",
    "multi-tasking",
]);

export const task_skills_enum = z.enum([
    "tool use",
    "force control",
    "localization",
    "long horizon planning",
    "grasp planning",
    "motion planning",
    "multi-tasking",
    "object recognition",
    "deformable object handling",
    "bimanual manipulation",
    "mobile manipulation",
]);

export const task_effectors_enum = z.enum([
    "prehensile gripper",
    "non-prehensile gripper",
    "dextrous gripper",
]);

export const task_sensors_enum = z.enum([
    "visual sensors",
    "audio sensors",
    "haptic sensors",
    "thermal sensors",
    "force sensors",
    "torque sensors",
    "depth sensors"
]);

export const environment_type_enum = z.enum([
    "Industrial",
    "Warehouse",
    "Corporate",
    "Retail",
    "Home",
    "Lab",
    "Hospital",
    "Construction",
    "Agriculture",
    "Outdoor",
    "Other",
]);

export const failure_mode_enum = z.enum([
    "Perception Failure",
    "Grasping/Manipulation Failure",
    "Planning Failure",
    "Task Timeout",
    "Environment Failure",
    "Tool Use Failure",
    "Action Execution Failure",
    "Safety Violation",
    "Premature Termination",
    "Recovery Failure",
    "Human Social Interaction Failure",
    "Other",
]);

export const research_bottleneck_enum = z.enum([
    "scene understanding", 
    "object recognition", 
    "deformable object handling",
    "pose estimation",
    "human-object interaction",
    "long-term planning", 
    "multi-task / object reasoning",
    "bimanual / interrobot coordination",
    "mobile manipulation",
    "tool use",
    "precision control",
    "memory management",
    "safety alignment",
    "force control",
    "noise and uncertainty",
    "reward shaping / specification",
    "action latency / timing",
    "other"
]);