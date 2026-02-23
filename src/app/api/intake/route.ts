import { NextRequest, NextResponse } from "next/server";
import { intakeSchema } from "@/lib/intakeSchema";
import { z } from "zod";
import { followupfieldenum } from "@/lib/intakeSchema";
import {Anthropic} from "@anthropic-ai/sdk";

const THRESHOLD = 0.7;


function defaultQuestionFor(field: string): string {
    const map: Record<string, string> = {
      task_description: "In one sentence, what is the operator/robot doing step-by-step?",
      task_goal: "What is the concrete done condition (how do we know the task succeeded)?",
      task_throughput: "Roughly what throughput is required (tasks/hour), even a range is fine?",
      environment_type: "What type of environment is this (warehouse, industrial, retail, etc.)?",
      environment_description: "Describe the physical setup/layout in 2–3 sentences.",
      safety_requirements: "What safety constraints exist (humans nearby, sharp objects, PPE, zones)?",
      key_environment_constraints: "What constraints matter most (space, time, resource, noise/variability)?",
      key_environment_entities: "List the key objects/entities involved (bins, trays, SKUs, tools, etc.).",
      required_tools: "What tools/sensors are actually available (RGB, depth, force/torque, gripper type)?",
    };
    return map[field] ?? `Can you clarify: ${field}?`;
}


async function callModeltoExtractFields(notes: string): Promise<string> {
    const model = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const prompt = ` 
    You are a robotics research ops lead at Physical Intelligence. 

    Your job:
    - Extract structured information ONLY from the notes.
    - Do NOT hallucinate.
    - If a field is not supported by the notes, set value = null and confidence <= 0.4.
    - Quote short evidence snippets when possible.
    - confidence must be between 0 and 1.
    - Return STRICT JSON. No markdown. No explanations.

    Field Definitions (be precise and conservative):
    task_description:
    - Describe the physical sequence of actions performed.
    - Focus on observable motion (pick, place, insert, inspect).
    - Do NOT include goals, constraints, or throughput.
    - One sentence only.

    task_goal:
    - The measurable completion condition.
    - Examples: "Part is inserted flush", "Item placed in tote", "Surface fully sanded".
    - Must describe how success is externally verified.
    - If no explicit done condition is stated, set value = null.

    task_throughput:
    - Numeric estimate of tasks/hour or cycles/hour.
    - If only qualitative language like "fast" or "high volume" appears, set value = null.
    - Do not guess numbers.

    environment_type:
    - Categorize the deployment setting.
    - Must be EXACTLY one of: "Industrial", "Warehouse", "Corporate", "Retail", "Home", "Lab", "Hospital", "Construction", "Agriculture", "Outdoor", "Other".
    - Case-sensitive. Use the exact strings above.
    - Must be directly supported by notes.
    - If ambiguous, set null.

    environment_description:
    - Physical layout details: workcells, bins, conveyors, lighting conditions, proximity to humans.
    - Avoid repeating task_description.

    safety_requirements:
    - Any explicit safety constraints: human proximity, PPE, safety zones, hazardous tools, compliance requirements.
    - Do not invent safety risks.

    key_environment_constraints:
    - Real constraints that affect deployment:
    - space limitations
    - time deadlines
    - SKU variability
    - lighting variability
    - noise
    - resource limits
    - Only include constraints mentioned or strongly implied.

    key_environment_entities:
    - Physical objects involved in the task (bins, trays, SKUs, tools, machines).
    - Do NOT include abstract concepts.

    required_tools:
    - Sensors or effectors explicitly mentioned (RGB camera, depth, force/torque, suction gripper, etc.).
    - If not mentioned, set value = null.
    
    Return this exact top-level structure:
    {
    "extracted": {
        "task_description": { "value": string|null, "confidence": number, "evidence": string|null },
        "task_goal": { "value": string|null, "confidence": number, "evidence": string|null },
        "task_throughput": { "value": number|null, "confidence": number, "evidence": string|null },
        "environment_type": { "value": string|null, "confidence": number, "evidence": string|null },
        "environment_description": { "value": string|null, "confidence": number, "evidence": string|null },
        "safety_requirements": { "value": string|null, "confidence": number, "evidence": string|null },
        "key_environment_constraints": { "value": string|null, "confidence": number, "evidence": string|null },
        "key_environment_entities": { "value": string[]|null, "confidence": number, "evidence": string|null },
        "required_tools": { "value": string[]|null, "confidence": number, "evidence": string|null }
    },
    "followups": [{
      "value": string,
      "question": string,
      "why_needed": string
    }],
    "customer_business_value": { "value": number|null, "confidence": number, "evidence": string|null }
    }

    customer_business_value:
    - Integer 1–5 representing business priority (1 = low, 5 = critical).
    - Only extract if explicitly stated or strongly implied.
    - If not mentioned, set value = null.

    Only include followups for fields where value is null or confidence < 0.7.
    Maximum 5 followups.
    Notes: ${notes}

    `
    
    const response = await model.messages.create({
        model: "claude-opus-4-20250514",
        max_tokens: 1500,
        temperature: 0.0,
        messages: [{ role: "user", content: prompt }],
    });

    // Anthropic response is structured content blocks
    const contentBlock = response.content.find(
        (block) => block.type === "text"
    )
    return contentBlock?.text ?? "";
}

// type for the extracted fields
type FollowupKey = z.infer<typeof followupfieldenum>;
type ExtractedKey = FollowupKey;


// get followup questions
function normalizeFollowups(followups: z.infer<typeof intakeSchema>["followups"], neededFollowupFields: ExtractedKey[]): z.infer<typeof intakeSchema>["followups"] {
    // keep only the model generated followups that are needed
    const model_generated_followups = followups.filter((f) => neededFollowupFields.includes(f.value));

    // existing followups are the followups that are already generated the model
    const existing_followups = new Set(model_generated_followups.map((f) => f.value));
    const new_followups = neededFollowupFields.filter((f) => !existing_followups.has(f));
    const generated_followups = new_followups.map((f) => ({
        value: f,
        question: defaultQuestionFor(f),
        why_needed: "Needed to complete the minimum grounding facts from site notes."
    }));
    return [...model_generated_followups, ...generated_followups].slice(0, 5);
}

export async function POST(request: NextRequest) {
    const {notes} = await request.json();
    const raw = await callModeltoExtractFields(notes);

    // parse the JSON
    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch (error) {
        return NextResponse.json({ok: false, error: "Model output is not valid JSON" }, { status: 400 });
    }

    // validate the JSON
    const validated = intakeSchema.safeParse(parsed);
    if (!validated.success) {
        return NextResponse.json({ok: false, error: validated.error.message }, { status: 400 });
    }

    // clean the data
    const validatedData = validated.data;
    const requiredFields = Object.keys(validatedData.extracted) as Array<keyof typeof validatedData.extracted>;

    // get thte followup fields that are required (where confidence is below threshold or value is null or undefined)
    const neededFollowupFields = requiredFields.filter((k) => {
        if (validatedData.extracted[k as keyof typeof validatedData.extracted].confidence < THRESHOLD ||
            validatedData.extracted[k as keyof typeof validatedData.extracted].value === null || 
            validatedData.extracted[k as keyof typeof validatedData.extracted].value === undefined) {
            return true;
        }
        return false;
    }) as ExtractedKey[];

    // normalize the followups
    const followups = normalizeFollowups(validatedData.followups, neededFollowupFields);

    return NextResponse.json({
        ok: true, 
        extracted: validatedData.extracted,
        needs_followup: neededFollowupFields,
        followups: followups,
    });
}

