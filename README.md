# Scene Compiler

From messy field notes to structured robotics deployment specs.

Scene Compiler is a two-stage LLM-powered system that translates real-world customer site observations into formal robotics task abstractions, environment models, evaluation frameworks, and deployment priority scoring.

It is designed to bridge the gap between research frontier and real-world automation.

---

## Why This Exists

Robotics deployments fail when:

- Sites are unstructured
- Requirements are underspecified
- Evaluation criteria are unclear
- Research bottlenecks are misidentified
- Priority is driven by intuition instead of structure

Scene Compiler formalizes this process.

Instead of treating evaluation as an afterthought, it treats structured abstraction as the primary artifact.

---

## System Overview

The compiler operates in three logical stages:

### 1. Intake (Grounded Extraction)

Extracts structured signals directly from messy site notes.

- Task description
- Goal
- Throughput
- Environment type
- Safety constraints
- Key entities
- Tool availability

If information is missing or low-confidence, the system generates targeted follow-up questions.

Output:
- `extracted`
- `needs_followup`
- `followups`

---

### 2. Structural Abstraction (Stage 1)

Transforms grounded intake into formal task and environment models.

Produces:

- Task abstraction
- Environment abstraction
- Failure mode abstraction

This stage is deterministic and strictly enum-constrained.

No research speculation is introduced here.

---

### 3. Research Compilation (Stage 2)

Takes structural abstraction and business priority and generates:

- Assumptions and unknowns
- Research bottlenecks
- Data collection requirements
- Offline + online evaluation metrics
- Stress tests
- Acceptance criteria
- Deployment priority scoring

Stage 1 outputs are immutable and copied verbatim.

---

## Architecture

---

## Core Concepts

### Deterministic Structural Abstraction

All task categories, subcategories, failure modes, and research bottlenecks are enum-constrained.

The system does not invent new ontology terms.

### Immutability Between Stages

Stage 2 is forbidden from modifying:

- `task_abstraction`
- `environment_abstraction`
- `failure_mode_abstraction`

If it does, validation fails.

### Conservative Inference

If information is missing:
- It is added to `unknowns`
- It is not hallucinated

---

## Tech Stack

- Next.js (App Router)
- TypeScript
- Zod (schema validation)
- Anthropic Claude Opus 4 (Intake extraction)
- OpenAI GPT 5.2 (Stage 1 + Stage 2 compilation)

---

## Running Locally

1. Clone repo
git clone https://github.com/yourname/scene-compiler.git
cd scene-compiler

2. Install dependencies


3. Add environment variables
Create `.env.local`:
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

4. Run
npm run dev

5. Open
http://localhost:3000/

---

## Example Flow

1. Paste messy warehouse kitting notes.
2. Intake generates follow-up questions.
3. Provide missing details.
4. Compiler generates:
   - Task model
   - Environment model
   - Failure modes
   - Research bottlenecks
   - Eval plan
   - Deployment priority score

---

## Potential Future Work

- Persistent spec storage
- Versioned abstraction diffs
- Multi-site comparison
- Generalization scoring across tasks
- Auto-eval harness generation
- Simulation integration
- Benchmark dataset export
