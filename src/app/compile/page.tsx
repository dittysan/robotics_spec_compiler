"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* ── Types ──────────────────────────────────────────────────────────── */

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
  | { ok: true; stage1?: any; sceneSpec?: any }
  | { ok: false; error: string };

/* ── Typewriter hook ────────────────────────────────────────────────── */

function useTypewriter(text: string, speed = 10) {
  const [displayed, setDisplayed] = useState("");
  const idxRef = useRef(0);
  const pauseRef = useRef(false);

  useEffect(() => {
    idxRef.current = 0;
    pauseRef.current = false;
    setDisplayed("");
  }, [text]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (pauseRef.current) return;

      idxRef.current++;
      if (idxRef.current > text.length) {
        // pause briefly, then reset to empty and start over
        pauseRef.current = true;
        setTimeout(() => {
          idxRef.current = 0;
          setDisplayed("");
          pauseRef.current = false;
        }, 600);
        return;
      }
      setDisplayed(text.slice(0, idxRef.current));
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return displayed;
}

/* ── Loading Modal ──────────────────────────────────────────────────── */

function LoadingModal({ message }: { message: string }) {
  const typed = useTypewriter(message, 35);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop blur */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* modal */}
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl px-10 py-8 flex flex-col items-center gap-5 min-w-[380px] max-w-[480px]">
        {/* spinner */}
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-[3px] border-gray-200" />
          <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-gray-900 animate-spin" />
          <div className="absolute inset-2 rounded-full border-[2px] border-transparent border-b-blue-500 animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.8s" }} />
        </div>

        {/* typewriter text */}
        <div className="text-center min-h-[48px] flex items-center">
          <span className="text-sm text-gray-700 font-mono">
            {typed}
            <span className="inline-block w-[2px] h-4 bg-gray-900 ml-0.5 animate-pulse align-middle" />
          </span>
        </div>

        {/* subtle pulsing dots */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main page ──────────────────────────────────────────────────────── */

export default function CompilePage() {
  const router = useRouter();

  const [notes, setNotes] = useState("");
  const [businessValue, setBusinessValue] = useState<number>(3);

  const [intake, setIntake] = useState<IntakeResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"idle" | "intake" | "compile_stage1" | "compile_stage2">("idle");
  const [error, setError] = useState<string | null>(null);

  const followups = useMemo(() => {
    if (!intake || !("ok" in intake) || !intake.ok) return [];
    return intake.followups ?? [];
  }, [intake]);

  const needsFollowups = followups.length > 0;
  const allAnswered = followups.every(
    (f) => (answers[f.value] ?? "").trim().length > 0
  );

  const loadingMessage = (() => {
    switch (phase) {
      case "intake":
        return "Extracting data...";
      case "compile_stage1":
        return "Building task, environment and failure_modes abstractions...";
      case "compile_stage2":
        return "Building skill capture, eval, and scoring abstractions...";
      default:
        return "";
    }
  })();

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
    setError(null);

    try {
      // ── Stage 1 ──
      setPhase("compile_stage1");
      const res1 = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 1,
          notes,
          intake_extracted: intake.extracted,
          intake_followups: buildIntakeFollowupsPayload(),
        }),
      });
      const json1 = (await res1.json()) as CompileResponse;
      if (!json1.ok) {
        setError(json1.error);
        return;
      }

      // ── Stage 2 ──
      setPhase("compile_stage2");
      const res2 = await fetch("/api/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: 2,
          notes,
          stage1_output: json1.stage1,
          business_context: { priority_customer_business_value: businessValue },
        }),
      });
      const json2 = (await res2.json()) as CompileResponse;
      if (!json2.ok) {
        setError(json2.error);
        return;
      }

      localStorage.setItem("latest_sceneSpec", JSON.stringify(json2.sceneSpec));
      if (json1.stage1) localStorage.setItem("latest_stage1", JSON.stringify(json1.stage1));

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
      {/* ── Loading overlay ──────────────────────────────── */}
      {loading && <LoadingModal message={loadingMessage} />}

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

        {!intake || !("ok" in intake) || !intake.ok ? (
          <button
            onClick={runIntake}
            disabled={loading || notes.trim().length < 20}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              cursor: loading || notes.trim().length < 20 ? "not-allowed" : "pointer",
              opacity: loading || notes.trim().length < 20 ? 0.5 : 1,
            }}
          >
            {phase === "intake" ? "Extracting…" : "Run Intake"}
          </button>
        ) : (
          <button
            onClick={runCompile}
            disabled={loading || (needsFollowups && !allAnswered)}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              cursor: loading || (needsFollowups && !allAnswered) ? "not-allowed" : "pointer",
              opacity: loading || (needsFollowups && !allAnswered) ? 0.5 : 1,
            }}
          >
            {phase === "compile_stage1" || phase === "compile_stage2"
              ? "Compiling…"
              : "Compile Spec"}
          </button>
        )}
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
