"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type IntakeResponse =
  | {
      ok: true;
      extracted: Record<
        string,
        { value: any; confidence: number; evidence?: string }
      >;
      needs_followup: string[];
      followups: Array<{ value: string; question: string; why_needed?: string }>;
    }
  | { ok: false; error: string };

type CompileResponse =
  | { ok: true; stage1?: any; sceneSpec: any }
  | { ok: false; error: string };

export default function CompilePage() {
  const router = useRouter();

  const [notes, setNotes] = useState("");
  const [businessValue, setBusinessValue] = useState<number>(3);

  const [intake, setIntake] = useState<IntakeResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"idle" | "intake" | "compile">("idle");
  const [error, setError] = useState<string | null>(null);

  const followups = useMemo(() => {
    if (!intake || !("ok" in intake) || !intake.ok) return [];
    return intake.followups ?? [];
  }, [intake]);

  const needsFollowups = followups.length > 0;
  const allAnswered = followups.every(
    (f) => (answers[f.value] ?? "").trim().length > 0
  );

  async function runIntake() {
    setLoading(true);
    setPhase("intake");
    setError(null);
    setIntake(null);
    setAnswers({});

    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const json = (await res.json()) as IntakeResponse;

      if (!json.ok) {
        setError(json.error);
        return;
      }
      setIntake(json);

      // Pre-fill any already-extracted values (nice UX)
      const prefill: Record<string, string> = {};
      for (const f of json.followups) {
        const v = json.extracted?.[f.value]?.value;
        if (typeof v === "string" && v.trim().length > 0) prefill[f.value] = v;
      }
      setAnswers(prefill);
    } catch (e: any) {
      setError(e?.message ?? "Intake failed");
    } finally {
      setLoading(false);
      setPhase("idle");
    }
  }

  function buildIntakeFollowupsPayload() {
    // Your stage1 compiler expects followup answers (ground truth).
    // Keep it simple: map field -> answer string.
    return answers;
  }

  async function runCompile() {
    if (!intake || !("ok" in intake) || !intake.ok) {
      setError("Run intake first.");
      return;
    }
    if (needsFollowups && !allAnswered) {
      setError("Please answer the follow-up questions.");
      return;
    }

    setLoading(true);
    setPhase("compile");
    setError(null);

    try {
      const res = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          business_context: { priority_customer_business_value: businessValue },
          intake_extracted: intake.extracted,
          intake_followups: buildIntakeFollowupsPayload(),
        }),
      });

      const json = (await res.json()) as CompileResponse;
      if (!json.ok) {
        setError(json.error);
        return;
      }

      localStorage.setItem("latest_sceneSpec", JSON.stringify(json.sceneSpec));
      if (json.stage1) localStorage.setItem("latest_stage1", JSON.stringify(json.stage1));

      router.push("/spec");
    } catch (e: any) {
      setError(e?.message ?? "Compile failed");
    } finally {
      setLoading(false);
      setPhase("idle");
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Scene → Spec Compiler</h1>
      <p style={{ color: "#555", marginTop: 6 }}>
        Step 1: Intake extraction + followups. Step 2: Compile full spec.
      </p>

      <div style={{ marginTop: 18 }}>
        <label style={{ fontWeight: 700 }}>Customer Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={12}
          placeholder="Paste task and environment notes…"
          style={{
            width: "100%",
            marginTop: 8,
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 12,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: 13,
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 14, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontWeight: 700 }}>Customer Business Value (1–5)</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={businessValue}
              onChange={(e) => setBusinessValue(Number(e.target.value))}
              style={{ width: 280 }}
            />
            <div style={{ fontWeight: 800 }}>{businessValue}</div>
          </div>
        </div>

        <button
          onClick={runIntake}
          disabled={loading || notes.trim().length < 20}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #111",
            background: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {phase === "intake" ? "Extracting…" : "Run Intake"}
        </button>

        <button
          onClick={runCompile}
          disabled={loading || !intake || (needsFollowups && !allAnswered)}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #111",
            background: "#111",
            color: "#fff",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: !intake || (needsFollowups && !allAnswered) ? 0.5 : 1,
          }}
        >
          {phase === "compile" ? "Compiling…" : "Compile Spec"}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 14, padding: 12, border: "1px solid #f5c2c7", background: "#f8d7da", borderRadius: 12 }}>
          <b>Error:</b> {error}
        </div>
      )}

      {/* Intake results + followups */}
      {intake && "ok" in intake && intake.ok && (
        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Intake Extracted</div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 12 }}>
              {JSON.stringify(intake.extracted, null, 2)}
            </pre>
          </div>

          <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>
              Follow-up Questions ({followups.length})
            </div>

            {followups.length === 0 && (
              <div style={{ color: "#555" }}>No followups needed. You can compile.</div>
            )}

            {followups.map((f) => (
              <div key={f.value} style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700 }}>{f.question}</div>
                {f.why_needed && <div style={{ color: "#666", fontSize: 12 }}>{f.why_needed}</div>}
                <input
                  value={answers[f.value] ?? ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [f.value]: e.target.value }))}
                  placeholder={`Answer for ${f.value}…`}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid #ddd",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}