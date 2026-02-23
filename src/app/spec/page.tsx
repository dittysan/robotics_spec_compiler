"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/* ── tiny helper components ─────────────────────────────────────────── */

function Badge({ children, color = "gray" }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    gray: "bg-gray-100 text-gray-700",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
    purple: "bg-purple-50 text-purple-700",
    indigo: "bg-indigo-50 text-indigo-700",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[color] ?? colors.gray}`}>
      {children}
    </span>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-1.5">
      <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-gray-400 w-44">{label}</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/60 px-5 py-3">
        <span className="text-base">{icon}</span>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function ScoreBar({ label, value, max = 5 }: { label: string; value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  const barColor =
    value <= 2 ? "bg-emerald-400" : value <= 3 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-xs text-gray-500 w-44 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-600 w-6 text-right">{value}</span>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  if (!items?.length) return <span className="text-sm text-gray-400 italic">None</span>;
  return (
    <ul className="list-disc list-inside space-y-0.5">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-gray-700">{item}</li>
      ))}
    </ul>
  );
}

function NumberedList({ items }: { items: string[] }) {
  if (!items?.length) return <span className="text-sm text-gray-400 italic">None</span>;
  return (
    <ol className="list-decimal list-inside space-y-0.5">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-gray-700">{item}</li>
      ))}
    </ol>
  );
}

/* ── main page ──────────────────────────────────────────────────────── */

export default function SpecPage() {
  const router = useRouter();
  const [sceneSpec, setSceneSpec] = useState<any>(null);
  const [stage1, setStage1] = useState<any>(null);

  useEffect(() => {
    const raw = localStorage.getItem("latest_sceneSpec");
    const s1 = localStorage.getItem("latest_stage1");
    if (!raw) return;
    setSceneSpec(JSON.parse(raw));
    if (s1) setStage1(JSON.parse(s1));
  }, []);

  const pretty = useMemo(() => {
    if (!sceneSpec) return "";
    return JSON.stringify(sceneSpec, null, 2);
  }, [sceneSpec]);

  if (!sceneSpec) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h1 className="text-2xl font-bold">Scene Spec</h1>
        <p className="mt-3 text-gray-500">No spec found. Run the compiler first.</p>
        <button
          onClick={() => router.push("/compile")}
          className="mt-5 px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 transition"
        >
          Go to Compile
        </button>
      </div>
    );
  }

  const task = sceneSpec.task_abstraction;
  const env = sceneSpec.environment_abstraction;
  const fail = sceneSpec.failure_mode_abstraction;
  const skill = sceneSpec.skill_capture_abstraction;
  const evalA = sceneSpec.eval_abstraction;
  const prio = sceneSpec.priority_score;
  const assume = sceneSpec.assumptions_and_unknowns_abstraction;

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge color="blue">{task?.task_category}</Badge>
            <Badge color="indigo">{task?.task_subcategory}</Badge>
            <Badge color="gray">{task?.task_required_embodiment}</Badge>
            <Badge color="amber">{task?.task_time_horizon} horizon</Badge>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{task?.task_description}</h1>
          <p className="mt-2 text-sm text-gray-500 max-w-2xl">
            <span className="font-medium text-gray-600">Goal:</span> {task?.task_goal}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => router.push("/compile")}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 transition"
          >
            New Compile
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(pretty)}
            className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition"
          >
            Copy JSON
          </button>
        </div>
      </div>

      {/* ── Priority bar ────────────────────────────────────── */}
      {prio && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">📊</span>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Priority Score</h2>
            <span className="ml-auto text-2xl font-bold text-gray-900">{prio.priority_composite}<span className="text-sm font-normal text-gray-400">/5</span></span>
          </div>
          <ScoreBar label="Business Value" value={prio.priority_customer_business_value} />
          <ScoreBar label="Technical Feasibility" value={prio.priority_pi_technical_feasibility} />
          <ScoreBar label="Safety Risk" value={prio.priority_pi_safety_risk} />
          <ScoreBar label="Generalization Leverage" value={prio.priority_pi_generalization_leverage} />
          {prio.priority_reasoning && (
            <p className="mt-3 text-xs text-gray-500 italic border-t border-gray-100 pt-3">{prio.priority_reasoning}</p>
          )}
        </div>
      )}

      {/* ── Main grid ───────────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Task */}
        <SectionCard title="Task Abstraction" icon="🤖">
          <KV label="Throughput" value={task?.task_throughput != null ? `${task.task_throughput} tasks/hr` : "—"} />
          <KV label="Initialization" value={task?.task_onramp || "—"} />
          <KV label="Termination" value={task?.task_offramp || "—"} />

          <div className="mt-3">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Checkpoints</span>
            <div className="mt-1"><NumberedList items={task?.task_checkpoints} /></div>
          </div>

          <div className="mt-3">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Success Signals</span>
            {task?.task_success_signals?.length ? (
              <table className="mt-1 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase">
                    <th className="pb-1 pr-3 font-medium">Signal</th>
                    <th className="pb-1 pr-3 font-medium">Measurement</th>
                    <th className="pb-1 font-medium">Threshold</th>
                  </tr>
                </thead>
                <tbody>
                  {task.task_success_signals.map((s: any, i: number) => (
                    <tr key={i} className="border-t border-gray-50">
                      <td className="py-1 pr-3 text-gray-700">{s.name}</td>
                      <td className="py-1 pr-3 text-gray-500">{s.measurement}</td>
                      <td className="py-1 font-mono text-gray-600">{s.threshold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mt-1 text-sm text-gray-400 italic">None</p>
            )}
          </div>

          <div className="mt-3">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Required Skills</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {task?.task_required_skills?.map((s: string, i: number) => (
                <Badge key={i} color="purple">{s}</Badge>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Required Tools</span>
            {task?.task_required_tools?.length ? (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {task.task_required_tools.map((t: any, i: number) => (
                  <span key={i} className="inline-flex items-center gap-1">
                    <Badge color="green">{t.task_effectors}</Badge>
                    <span className="text-gray-300">+</span>
                    <Badge color="blue">{t.task_sensors}</Badge>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-sm text-gray-400 italic">None</p>
            )}
          </div>

          <div className="mt-3">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Intervention Profile</span>
            <div className="mt-1">
              <KV label="Expected Rate" value={task?.task_intervention_profile?.expected_intervention_rate || "—"} />
              <BulletList items={task?.task_intervention_profile?.likely_triggers} />
            </div>
          </div>
        </SectionCard>

        {/* Environment */}
        <SectionCard title="Environment" icon="🏭">
          <div className="flex items-center gap-2 mb-2">
            <Badge color="blue">{env?.environment_type}</Badge>
            <Badge color="gray">{env?.environment_observability} observability</Badge>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{env?.environment_description}</p>

          <div className="mt-4">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Entities</span>
            {env?.environment_entities?.length ? (
              <div className="mt-1 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 uppercase">
                      <th className="pb-1 pr-2 font-medium">Name</th>
                      <th className="pb-1 pr-2 font-medium">Description</th>
                      <th className="pb-1 font-medium">Flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {env.environment_entities.map((e: any, i: number) => (
                      <tr key={i} className="border-t border-gray-50">
                        <td className="py-1 pr-2 font-medium text-gray-700">{e.name}</td>
                        <td className="py-1 pr-2 text-gray-500">{e.description}</td>
                        <td className="py-1">
                          <div className="flex flex-wrap gap-1">
                            {e.movable && <Badge color="blue">movable</Badge>}
                            {e.deformable && <Badge color="purple">deformable</Badge>}
                            {e.fragile && <Badge color="amber">fragile</Badge>}
                            {e.hazardous && <Badge color="red">hazardous</Badge>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-1 text-sm text-gray-400 italic">None</p>
            )}
          </div>

          <div className="mt-4">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Constraints</span>
            {env?.environment_constraints && (
              <div className="mt-1 space-y-0">
                {Object.entries(env.environment_constraints).map(([key, val]: [string, any]) => (
                  val ? <KV key={key} label={key.replace(/_/g, " ")} value={val} /> : null
                ))}
              </div>
            )}
          </div>

          <div className="mt-4">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Generalization Axes</span>
            {env?.environment_generalization_axes?.length ? (
              <table className="mt-1 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase">
                    <th className="pb-1 pr-2 font-medium">Axis</th>
                    <th className="pb-1 pr-2 font-medium">Variability</th>
                    <th className="pb-1 font-medium">Eval Hint</th>
                  </tr>
                </thead>
                <tbody>
                  {env.environment_generalization_axes.map((a: any, i: number) => (
                    <tr key={i} className="border-t border-gray-50">
                      <td className="py-1 pr-2 text-gray-700">{a.axis}</td>
                      <td className="py-1 pr-2">
                        <Badge color={a.expected_variability === "high" ? "red" : a.expected_variability === "medium" ? "amber" : "green"}>
                          {a.expected_variability}
                        </Badge>
                      </td>
                      <td className="py-1 text-gray-500">{a.eval_hints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mt-1 text-sm text-gray-400 italic">None</p>
            )}
          </div>

          <div className="mt-4">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">State Variables</span>
            {env?.environment_state_variables?.length ? (
              <div className="mt-1 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 uppercase">
                      <th className="pb-1 pr-2 font-medium">Name</th>
                      <th className="pb-1 pr-2 font-medium">Type</th>
                      <th className="pb-1 pr-2 font-medium">Unit</th>
                      <th className="pb-1 font-medium">Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {env.environment_state_variables.map((sv: any, i: number) => (
                      <tr key={i} className="border-t border-gray-50">
                        <td className="py-1 pr-2 font-medium text-gray-700">{sv.name}</td>
                        <td className="py-1 pr-2"><Badge>{sv.type}</Badge></td>
                        <td className="py-1 pr-2 text-gray-500 font-mono text-xs">{sv.unit || "—"}</td>
                        <td className="py-1 text-gray-500 font-mono text-xs">
                          {sv.range?.map((r: any, j: number) => (
                            <span key={j}>[{r.min}, {r.max}]</span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-1 text-sm text-gray-400 italic">None</p>
            )}
          </div>
        </SectionCard>

        {/* Failure Modes */}
        <SectionCard title="Failure Modes" icon="⚠️">
          <div className="flex flex-wrap gap-1.5">
            {fail?.failure_modes?.map((fm: string, i: number) => (
              <Badge key={i} color="red">{fm}</Badge>
            ))}
            {(!fail?.failure_modes?.length) && (
              <span className="text-sm text-gray-400 italic">None</span>
            )}
          </div>
        </SectionCard>

        {/* Assumptions & Unknowns */}
        <SectionCard title="Assumptions & Unknowns" icon="💡">
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Assumptions</span>
            <div className="mt-1"><BulletList items={assume?.assumptions} /></div>
          </div>
          <div className="mt-3">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Unknowns</span>
            <div className="mt-1"><BulletList items={assume?.unknowns} /></div>
          </div>
        </SectionCard>

        {/* Skill Capture */}
        <SectionCard title="Skill Capture" icon="🧠">
          <div>
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Research Bottlenecks</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {skill?.research_bottlenecks?.map((b: string, i: number) => (
                <Badge key={i} color="purple">{b}</Badge>
              ))}
              {(!skill?.research_bottlenecks?.length) && (
                <span className="text-sm text-gray-400 italic">None</span>
              )}
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Data Collection</span>
            {skill?.data_collection_requirements?.map((dc: any, i: number) => (
              <div key={i} className="mt-2 rounded-lg bg-gray-50 p-3">
                <div className="flex flex-wrap gap-1 mb-1">
                  {dc.data_modalities?.map((m: string, j: number) => (
                    <Badge key={j} color="blue">{m}</Badge>
                  ))}
                </div>
                <div className="mt-1">
                  <span className="text-xs text-gray-400">Labels: </span>
                  <span className="text-xs text-gray-600">{dc.data_labels?.join(", ") || "—"}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Evals */}
        <SectionCard title="Evaluation" icon="📋">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Offline Metrics</span>
              <div className="mt-1"><BulletList items={evalA?.offline_metrics} /></div>
            </div>
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Online Metrics</span>
              <div className="mt-1"><BulletList items={evalA?.online_metrics} /></div>
            </div>
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Stress Tests</span>
              <div className="mt-1"><BulletList items={evalA?.stress_tests} /></div>
            </div>
            <div>
              <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Acceptance Criteria</span>
              <div className="mt-1"><BulletList items={evalA?.acceptance_criteria} /></div>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ── Stage 1 debug (collapsible) ─────────────────────── */}
      {stage1 && (
        <div className="mt-6">
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-gray-500 hover:text-gray-700 transition">
              Stage 1 Output (Debug)
            </summary>
            <pre className="mt-2 p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs overflow-auto text-gray-600">
              {JSON.stringify(stage1, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* ── Full raw JSON ───────────────────────────────────── */}
      <div className="mt-4 mb-12">
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-gray-500 hover:text-gray-700 transition">
            Raw Full JSON
          </summary>
          <pre className="mt-2 p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs overflow-auto text-gray-600">
            {pretty}
          </pre>
        </details>
      </div>
    </div>
  );
}
