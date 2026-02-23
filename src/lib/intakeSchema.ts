import {z} from "zod"
import { task_category_enum, task_subcategory_enum, task_skills_enum, task_effectors_enum, task_sensors_enum, environment_type_enum, failure_mode_enum, research_bottleneck_enum } from "./types";

export const followupfieldenum = z.enum([
    "task_description",
    "task_goal",
    "task_throughput",
    "environment_type",
    "environment_description",
    "safety_requirements",
    "key_environment_constraints",
    "key_environment_entities",
    "required_tools",
]);

const fieldExtraction = <T extends z.ZodTypeAny>(schema: T) => 
    z.object({
        value: schema.optional().nullable(),
        confidence: z.number().min(0).max(1),
        evidence: z.string().optional().nullable()
    });

export const intakeSchema = z.object({
    extracted: z.object({
        task_description: fieldExtraction(z.string()),
        task_goal: fieldExtraction(z.string()),
        task_throughput: fieldExtraction(z.number().describe("tasks/hr")),
        environment_type: fieldExtraction(environment_type_enum),
        environment_description: fieldExtraction(z.string()),
        safety_requirements: fieldExtraction(z.string()),
        key_environment_constraints: fieldExtraction(z.string()),
        key_environment_entities: fieldExtraction(z.array(z.string())),
        required_tools: fieldExtraction(z.array(z.string())),
    }),

    followups: z.array(z.object({
        value: followupfieldenum,
        question: z.string(),
        why_needed: z.string().optional()
    })),

    customer_business_value: fieldExtraction(z.number().min(1).max(5)),
});