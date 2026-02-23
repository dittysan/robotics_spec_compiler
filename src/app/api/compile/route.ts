import { NextRequest, NextResponse } from "next/server";
import { intakeSchema } from "@/lib/intakeSchema";
import { z } from "zod";
import { followupfieldenum } from "@/lib/intakeSchema";
import {OpenAI} from "openai";
import { stage1Schema } from "@/lib/stage1Schema";
import { Schema } from "@/lib/schema";

const THRESHOLD = 0.7;


async function runStage1Compilation(input: any): Promise<any> {

    const {notes, intake_extracted, intake_followups} = input;
    const model = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
    const prompt = ` 
You are a structural abstraction compiler.

You are given:
1) Raw customer notes
2) Extracted grounded fields from intake (may contain nulls + confidences)
3) Followup answers from the user (ground truth overrides)

GOAL:
Return ONLY the structural abstraction JSON object with exactly these keys:
- task_abstraction
- environment_abstraction
- failure_mode_abstraction

ABSOLUTE RULES:
- Do NOT generate: assumptions_and_unknowns_abstraction, skill_capture_abstraction, eval_abstraction, priority_score.
- Do NOT speculate beyond provided information. If unknown, keep descriptions conservative.
- Obey enum constraints strictly. Do NOT invent enum values.
- Output must be valid JSON only (no markdown, no prose).

-----------------------------------------
STRICT ENUM CONSTRAINTS (INLINE)
-----------------------------------------

You may ONLY use these exact values:

task_category ∈ [
"Pick Place",
"Navigation",
"Manipulation",
"Assembly",
"Inspection/Maintenance",
"Fabrication",
"HRI",
"Other"
]

task_subcategory ∈ [
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
"multi-tasking"
]

task_required_skills[*] ∈ [
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
"mobile manipulation"
]

task_required_tools[*].task_effectors ∈ [
  "prehensile gripper",
  "non-prehensile gripper",
  "dextrous gripper",
]

task_required_tools[*].task_sensors ∈ [
  "visual sensors",
  "audio sensors",
  "haptic sensors",
  "thermal sensors",
  "force sensors",
  "torque sensors",
  "depth sensors"
]

task_required_embodiment ∈ [
"single-arm",
"dual-arm",
"mobile",
"stationary",
"aerial",
"other"
]

task_time_horizon ∈ ["short","medium","long"]

environment_type ∈ [
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
"Other"
]

environment_state_variables[*].type ∈ [
"continuous",
"discrete",
"categorical",
"nominal",
"ordinal",
"binary",
"integer",
"float",
"string"
]

environment_generalization_axes[*].axis ∈ [
"lighting",
"form factor",
"SKU variance",
"layout variation",
"object occlusion",
"human interaction",
"other"
]

environment_generalization_axes[*].expected_variability ∈ [
"low",
"medium",
"high"
]

environment_observability ∈ ["partial","full","none"]

failure_modes[*] ∈ [
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
"Other"
]

"Other" RULE:
- Choose "Other" ONLY if none of the enum values clearly apply.
- When choosing "Other", ensure task_description / environment_description makes the category understandable.

-----------------------------------------
FIELD DEFINITIONS (STRUCTURAL ONLY)
-----------------------------------------

task_abstraction.task_category:
- High-level family of task (pick/place, assembly, inspection, etc.)
- Must be one of the allowed enum values.

task_abstraction.task_subcategory:
- More specific class of task (e.g., "bin picking", "insertion", "machine tending").
- Must be one of the allowed enum values.

task_abstraction.task_description:
- One clear sentence describing the physical action sequence (what moves where).
- Should be grounded in notes + followups.
- Avoid including business value or research strategy.

task_abstraction.task_goal:
- Concrete, externally verifiable “done condition”.
- If not explicit, infer minimally from description but keep conservative.

task_abstraction.task_success_signals:
- 1–3 measurable signals corresponding to task_goal.
- Each includes:
  - name: signal name (e.g., "insertion depth")
  - measurement: how measured (e.g., "vision pose estimate", "force spike", "operator confirmation")
  - threshold: numeric threshold when possible; if unknown choose a conservative placeholder threshold (e.g., 1) but make measurement text precise.
- Do NOT invent sensors; use task_required_tools/task_required_sensors implied by notes if possible.

task_abstraction.task_checkpoints:
- 2–5 intermediate milestones (not final success).
- Examples: "approach object", "grasp acquired", "aligned to target", "insert started".

task_abstraction.task_onramp:
- The initial preconditions to start an episode (e.g., "part in bin", "tool attached", "robot at home pose").

task_abstraction.task_offramp:
- The terminal state after completion or safe abort (e.g., "robot retreats", "part placed", "returns to home pose").

task_abstraction.task_required_skills:
- Select only skills clearly needed (avoid listing all).
- Must be subset of enum values.

task_abstraction.task_required_tools:
- List the minimum effector + sensor types needed/available.
- Use enum values ONLY.
- If notes don’t specify sensors, include the most conservative minimal set (e.g., RGB) only if implied; otherwise choose what's explicitly mentioned.

task_abstraction.task_required_embodiment:
- Choose based on task nature (mobile if navigation required; dual-arm if bimanual implied).
- Must be one of the allowed values.

task_abstraction.task_time_horizon:
- short: seconds–<1 minute
- medium: 1–10 minutes
- long: >10 minutes or multi-stage workflow

task_abstraction.task_intervention_profile:
- likely_triggers: 2–5 situations where teleop intervention likely occurs (occlusion, misgrasp, alignment failure, human interference).
- expected_intervention_rate: qualitative (e.g., "low", "medium", "high" or "~1 per 20 attempts"). If unknown, choose "unknown".

task_abstraction.task_throughput:
- Numeric tasks/hr if present in intake or followups; else set a conservative placeholder like 0 and ensure later unknowns are handled in Stage 2.

environment_abstraction.environment_description:
- 2–3 sentences describing physical layout (workcell, conveyor, bins, human proximity, lighting).

environment_abstraction.environment_type:
- One of enum values (Warehouse/Industrial/etc.). Choose "Other" only if truly ambiguous.

environment_abstraction.environment_entities:
- List 3–8 key physical entities involved.
- Each entity must have:
  - name (e.g., "bin", "SKU", "tote", "conveyor")
  - description (short)
  - size (rough scalar; if unknown use 0)
  - movable/deformable/fragile/hazardous as booleans (best-effort from notes; default false if unknown)

environment_abstraction.environment_state_variables:
- 3–8 state variables that vary and matter for perception/control.
- Each must include:
  - name
  - type (enum)
  - description
  - unit (if unknown use "")
  - range: include one {min,max} object; if unknown use {min:0,max:0}.

environment_abstraction.environment_constraints:
- space_constraints: physical clearance / reach / workspace limits
- time_constraints: timing windows / cycle time constraints
- resource_constraints: tools, power, consumables, staffing constraints
- safety_constraints: human zones, PPE, hazardous equipment (do not invent)
- noise_constraints: sensing noise/occlusion/lighting variability

environment_abstraction.environment_generalization_axes:
- Choose 2–5 axes that meaningfully vary in deployment.
- axis must be allowed enum.
- expected_variability must be low/medium/high.
- eval_hints: how to test that axis (e.g., "vary lighting from 200–800 lux").

environment_abstraction.environment_observability:
- full: all relevant state is directly observable via sensors
- partial: some hidden state (occluded objects, internal machine state)
- none: cannot observe reliably (rare)

failure_mode_abstraction.failure_modes:
- Select 3–8 plausible failure modes for this task/environment.
- Must be from enum only.

-----------------------------------------
INPUTS
-----------------------------------------

Raw Notes:
${notes}

Intake Extracted (may include confidences; use values as evidence):
${JSON.stringify(intake_extracted, null, 2)}

Followup Answers (override intake when conflict):
${JSON.stringify(intake_followups, null, 2)}

-----------------------------------------
OUTPUT TEMPLATE (RETURN JSON ONLY)
-----------------------------------------

Return JSON with EXACTLY this structure and keys:

{
  "task_abstraction": {
    "task_category": "",
    "task_subcategory": "",
    "task_description": "",
    "task_goal": "",
    "task_success_signals": [
      { "name": "", "measurement": "", "threshold": 0 }
    ],
    "task_checkpoints": [],
    "task_onramp": "",
    "task_offramp": "",
    "task_required_skills": [],
    "task_required_tools": [
      { "task_effectors": "", "task_sensors": "" }
    ],
    "task_required_embodiment": "",
    "task_time_horizon": "",
    "task_intervention_profile": {
      "likely_triggers": [],
      "expected_intervention_rate": ""
    },
    "task_throughput": 0
  },
  "environment_abstraction": {
    "environment_description": "",
    "environment_type": "",
    "environment_entities": [
      {
        "name": "",
        "description": "",
        "size": 0,
        "movable": false,
        "deformable": false,
        "fragile": false,
        "hazardous": false
      }
    ],
    "environment_state_variables": [
      {
        "name": "",
        "type": "",
        "description": "",
        "unit": "",
        "range": [{ "min": 0, "max": 0 }]
      }
    ],
    "environment_constraints": {
      "space_constraints": "",
      "time_constraints": "",
      "resource_constraints": "",
      "safety_constraints": "",
      "noise_constraints": ""
    },
    "environment_generalization_axes": [
      {
        "axis": "",
        "expected_variability": "",
        "eval_hints": ""
      }
    ],
    "environment_observability": ""
  },
  "failure_mode_abstraction": {
    "failure_modes": []
  }
}

No markdown. No commentary. Only JSON.
`
    
    const response = await model.chat.completions.create({
        model: "gpt-5.2",
        max_completion_tokens: 4500,
        temperature: 0.0,
        messages: [{role: "system", content: "Return only valid JSON. No trailing commas. No markdown."}, { role: "user", content: prompt }],
    });

    const raw = response.choices[0]?.message?.content??"";
    const parsed = JSON.parse(raw);
    const validated = stage1Schema.safeParse(parsed);
    if (!validated.success) {
        throw new Error("Stage1 compilation failed: " + validated.error.message);
    }

    return validated.data;
}

export async function stage2Compilation(input: any): Promise<any> {
    const {notes, stage1_output, business_context} = input;
    const model = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
    const prompt = ` 
You are a deterministic research compiler.

INPUTS:
1) Raw customer notes
2) Stage 1 Output (structural abstraction) — IMMUTABLE SOURCE OF TRUTH
3) Business priority (1–5) — IMMUTABLE

GOAL:
Return a SINGLE JSON object that matches the template exactly.
You must:
A) COPY Stage 1 fields verbatim (byte-for-byte identical strings where applicable).
B) FILL ONLY the remaining sections:
   - assumptions_and_unknowns_abstraction
   - skill_capture_abstraction
   - eval_abstraction
   - priority_score

ABSOLUTE IMMUTABILITY RULE:
- You are NOT allowed to modify, rewrite, paraphrase, reorder, or “improve” ANY content under:
  - task_abstraction
  - environment_abstraction
  - failure_mode_abstraction
These must be copied exactly from Stage 1 Output into the final JSON.
If there is any conflict between your reasoning and Stage 1 Output, Stage 1 Output wins.

ENUM CONSTRAINTS (STRICT):
You may ONLY use the following exact values.

task_category ∈ [
"Pick Place",
"Navigation",
"Manipulation",
"Assembly",
"Inspection/Maintenance",
"Fabrication",
"HRI",
"Other"
]

task_subcategory ∈ [
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
"multi-tasking"
]

task_required_skills ∈ [
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
"mobile manipulation"
]

task_required_tools[*].task_effectors ∈ [
  "prehensile gripper",
  "non-prehensile gripper",
  "dextrous gripper",
]

task_required_tools[*].task_sensors ∈ [
  "visual sensors",
  "audio sensors",
  "haptic sensors",
  "thermal sensors",
  "force sensors",
  "torque sensors",
  "depth sensors"
]

task_required_embodiment ∈ [
"single-arm",
"dual-arm",
"mobile",
"stationary",
"aerial",
"other"
]

task_time_horizon ∈ ["short","medium","long"]

environment_type ∈ [
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
"Other"
]

environment_state_variables[*].type ∈ [
"continuous",
"discrete",
"categorical",
"nominal",
"ordinal",
"binary",
"integer",
"float",
"string"
]

environment_generalization_axes.axis ∈ [
"lighting",
"form factor",
"SKU variance",
"layout variation",
"object occlusion",
"human interaction",
"other"
]

environment_generalization_axes.expected_variability ∈ [
"low",
"medium",
"high"
]

environment_observability ∈ ["partial","full","none"]

failure_modes ∈ [
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
"Other"
]

research_bottlenecks ∈ [
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
]

data_modalities ∈ [
"rgb",
"egocentric video",
"third-person video",
"tactile",
"lidar",
"radar",
"ultrasonic",
"audio",
"haptics",
"thermal",
"force_torque",
"proprioception",
"depth",
"other"
]

If none apply, use "Other" or "other" EXACTLY as written and justify in assumptions.

FIELD DEFINITIONS (ONLY FOR FIELDS YOU GENERATE IN STAGE 2):

assumptions_and_unknowns_abstraction.assumptions:
- Operating assumptions required to proceed (e.g., “fixed workcell”, “known SKU set”, “stable lighting”).
- Use this to capture any justified “Other/other” enum choice.

assumptions_and_unknowns_abstraction.unknowns:
- Missing facts that could materially change feasibility, safety, evaluation design, or scope.

skill_capture_abstraction.research_bottlenecks:
- Only include bottlenecks that are necessary blockers implied by task/environment (do not list everything).
- Prefer fewer, higher-signal bottlenecks.

skill_capture_abstraction.data_collection_requirements:
- data_modalities: sensor streams needed to learn/teleop/validate.
- data_labels: supervision signals required (success/failure, contact events, pose labels, intervention triggers, etc.)

eval_abstraction.offline_metrics:
- Lab measurable metrics (success rate, time-to-complete, collisions, dropped objects, force thresholds exceeded).
eval_abstraction.online_metrics:
- Live deployment metrics (intervention rate, uptime, throughput achieved, safety events, abort rate).
eval_abstraction.stress_tests:
- Perturbations across generalization axes (lighting, occlusion, SKU variance, layout variation, human interaction).
eval_abstraction.acceptance_criteria:
- Clear go/no-go thresholds (e.g., “>98% success over 200 trials” or “<1 intervention / 30 mins”).

priority_score:
- priority_customer_business_value MUST equal the provided business priority exactly: ${business_context.priority_customer_business_value}
- priority_pi_technical_feasibility: integer 1–5 (5 = easiest)
- priority_pi_safety_risk: integer 1–5 (5 = highest risk)
- priority_pi_generalization_leverage: integer 1–5 (5 = highest leverage)
- priority_composite: integer 1–5 (no floats). If unsure, choose a reasonable integer consistent with reasoning.
- priority_reasoning: short, concrete justification based on task complexity, risk, generalization axes, and business value.

CONSERVATIVE RULES:
- If info is insufficient: add to unknowns; do not hallucinate.
- Do not inflate generalization leverage.
- Do not invent research bottlenecks unless implied.
- Do not introduce new enum values.
- If selecting "Other"/"other": justify explicitly.

RAW NOTES:
${notes}

STAGE 1 OUTPUT (COPY VERBATIM):
${JSON.stringify(stage1_output, null, 2)}

BUSINESS PRIORITY (IMMUTABLE):
${business_context.priority_customer_business_value}

OUTPUT REQUIREMENTS:
- Return ONLY valid JSON (no markdown, no prose).
- Match EXACTLY the following template’s keys and nesting.
- IMPORTANT: task_abstraction, environment_abstraction, failure_mode_abstraction must be copied exactly from Stage 1 output.

Return JSON with EXACTLY this structure:
${JSON.stringify({
  assumptions_and_unknowns_abstraction: { assumptions: [], unknowns: [] },
  task_abstraction: {
    task_category: "",
    task_subcategory: "",
    task_description: "",
    task_goal: "",
    task_success_signals: [{ name: "", measurement: "", threshold: 0 }],
    task_checkpoints: [],
    task_onramp: "",
    task_offramp: "",
    task_required_skills: [],
    task_required_tools: [{ task_effectors: "", task_sensors: "" }],
    task_required_embodiment: "",
    task_time_horizon: "",
    task_intervention_profile: { likely_triggers: [], expected_intervention_rate: "" },
    task_throughput: 0
  },
  environment_abstraction: {
    environment_description: "",
    environment_type: "",
    environment_entities: [{
      name: "",
      description: "",
      size: 0,
      movable: false,
      deformable: false,
      fragile: false,
      hazardous: false
    }],
    environment_state_variables: [{
      name: "",
      type: "",
      description: "",
      unit: "",
      range: [{ min: 0, max: 0 }]
    }],
    environment_constraints: {
      space_constraints: "",
      time_constraints: "",
      resource_constraints: "",
      safety_constraints: "",
      noise_constraints: ""
    },
    environment_generalization_axes: [{
      axis: "",
      expected_variability: "",
      eval_hints: ""
    }],
    environment_observability: ""
  },
  failure_mode_abstraction: { failure_modes: [] },
  skill_capture_abstraction: {
    research_bottlenecks: [],
    data_collection_requirements: [{ data_modalities: [], data_labels: [] }]
  },
  eval_abstraction: {
    offline_metrics: [],
    online_metrics: [],
    stress_tests: [],
    acceptance_criteria: []
  },
  priority_score: {
    priority_customer_business_value: 0,
    priority_pi_technical_feasibility: 0,
    priority_pi_safety_risk: 0,
    priority_pi_generalization_leverage: 0,
    priority_composite: 0,
    priority_reasoning: ""
  }
}, null, 2)}
`

    
    const response = await model.chat.completions.create({
        model: "gpt-5.2",
        max_completion_tokens: 4500,
        temperature: 0.0,
        messages: [{role: "system", content: "Return only valid JSON. No trailing commas. No markdown."}, { role: "user", content: prompt }],
    });

    const raw = response.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw);

    const validated = Schema.safeParse(parsed);
    if (!validated.success) throw new Error("Stage2 failed: " + validated.error.message);

    // immutability check (hard fail if mutated)
    if (JSON.stringify(validated.data.task_abstraction) !== JSON.stringify(input.stage1_output.task_abstraction)) {
        throw new Error("Stage2 mutated task_abstraction");
    }
    if (JSON.stringify(validated.data.environment_abstraction) !== JSON.stringify(input.stage1_output.environment_abstraction)) {
        throw new Error("Stage2 mutated environment_abstraction");
    }
    if (JSON.stringify(validated.data.failure_mode_abstraction) !== JSON.stringify(input.stage1_output.failure_mode_abstraction)) {
        throw new Error("Stage2 mutated failure_mode_abstraction");
    }

    return validated.data;

}

export async function POST(request: NextRequest) {
    try {
        const { notes, intake_extracted, intake_followups, business_context } = await request.json();
    
        const stage1Out = await runStage1Compilation({ notes, intake_extracted, intake_followups });
    
        const full = await stage2Compilation({
          notes,
          stage1_output: stage1Out,
          business_context,
        });
    
        return NextResponse.json({ ok: true, stage1: stage1Out, sceneSpec: full });
      } catch (err: any) {
        return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
      }
}

