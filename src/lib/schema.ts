import { z } from "zod";
import { task_category_enum, task_subcategory_enum, task_skills_enum, task_effectors_enum, task_sensors_enum, environment_type_enum, failure_mode_enum, research_bottleneck_enum } from "./types";

export const Schema = z.object({
    assumptions_and_unknowns_abstraction: z.object({
        assumptions: z.array(z.string()),
        unknowns: z.array(z.string()),
    }),
    task_abstraction: z.object({
        task_category: task_category_enum,
        task_subcategory: task_subcategory_enum,
        task_description: z.string(),
        task_goal: z.string(),
        task_success_signals: z.array(z.object({
            name: z.string(),
            measurement: z.string(),
            threshold: z.number(),
        })),
        task_checkpoints: z.array(z.string()),
        task_onramp: z.string(),
        task_offramp: z.string(),
        task_required_skills: z.array(task_skills_enum),
        task_required_tools: z.array(z.object({
            task_effectors: task_effectors_enum,
            task_sensors: task_sensors_enum,
        })),
        task_required_embodiment: z.enum(["single-arm", "dual-arm", "mobile", "stationary", "aerial", "other"]),
        task_time_horizon: z.enum(["short", "medium", "long"]),
        task_intervention_profile: z.object({
            likely_triggers: z.array(z.string()),    
            expected_intervention_rate: z.string(), 
          }),
        task_throughput: z.number().describe("tasks/hr"),
    }), 
    environment_abstraction: z.object({
        environment_description: z.string(),
        environment_type: environment_type_enum,
        environment_entities: z.array(z.object({
            name: z.string(),
            description: z.string(),
            size: z.number(),
            movable: z.boolean(),
            deformable: z.boolean(),
            fragile: z.boolean(),
            hazardous: z.boolean(),
        })),
        environment_state_variables: z.array(z.object({
            name: z.string(), 
            type: z.enum(["continuous", "discrete", "categorical", "nominal", "ordinal", "binary", "integer", "float", "string"]),
            description: z.string(),
            unit: z.string(),
            range: z.array(z.object({
                min: z.number(),
                max: z.number(),
            })),
        })),
        environment_constraints: z.object({
            space_constraints: z.string(),
            time_constraints: z.string(),
            resource_constraints: z.string(),
            safety_constraints: z.string(),
            noise_constraints: z.string(),
        }),

        environment_generalization_axes: z.array(z.object({
            axis: z.enum(["lighting", "form factor", "SKU variance", "layout variation", "object occlusion", "human interaction", "other"]),
            expected_variability: z.enum(["low", "medium", "high"]),
            eval_hints: z.string(),
        })),

        environment_observability: z.enum(["partial", "full", "none"]),
    }),
    failure_mode_abstraction: z.object({
        failure_modes: z.array(failure_mode_enum),
    }),
    skill_capture_abstraction: z.object({
        research_bottlenecks: z.array(research_bottleneck_enum),
        data_collection_requirements: z.array(z.object({
            data_modalities: z.array(z.enum(["rgb", "egocentric video", "third-person video", "tactile", "lidar", "radar", "ultrasonic", "audio", "haptics", "thermal", "force_torque", "proprioception", "depth", "other"])),
            data_labels: z.array(z.string()),
        })),
    }),
    eval_abstraction: z.object({
        offline_metrics: z.array(z.string()),
        online_metrics: z.array(z.string()),
        stress_tests: z.array(z.string()),
        acceptance_criteria: z.array(z.string()),
    }), 
    priority_score: z.object({
        priority_customer_business_value: z.number().min(1).max(5),
        priority_pi_technical_feasibility: z.number().min(1).max(5),
        priority_pi_safety_risk: z.number().min(1).max(5),
        priority_pi_generalization_leverage: z.number(),
        priority_composite: z.number(),
        priority_reasoning: z.string(),
    }),
});