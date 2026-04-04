import { useState, useCallback } from "react";
import { Copy, Check, CirclePlay, Lightbulb, AlertTriangle } from "lucide-react";
import type { SimulatedTestRunData, SimTestCaseValue } from "../../shared/types";

interface SimulatedTestRunProps {
  data: SimulatedTestRunData;
  onSuggestFix?: (functionName: string) => void;
}

function ValueBlock({ label, values }: { label: string; values: SimTestCaseValue[] }) {
  return (
    <div>
      <div className="text-[11px] text-[#64748b] font-medium mb-1">{label}</div>
      <div className="bg-[#e2e8f0] rounded-md px-2.5 py-2 font-mono text-[12px] leading-relaxed">
        {values.map((v, i) => (
          <div key={i}>
            <span className="text-[#64748b]">{v.label} = </span>
            <ValueHighlight value={v.value} type={v.type} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ValueHighlight({ value, type }: { value: string; type?: string }) {
  const hint = type?.toLowerCase() ?? inferType(value);
  let cls = "text-[#1a2e2b]";
  if (hint === "string") cls = "text-[#166534]";
  else if (hint === "number") cls = "text-[#b45309]";
  else if (hint === "boolean") cls = "text-[#7c3aed]";
  else if (hint === "object" || hint === "array") cls = "text-[#c2410c]";
  return <span className={cls}>{value}</span>;
}

function inferType(value: string): string {
  const v = value.trim();
  if (v === "true" || v === "false") return "boolean";
  if (v === "null" || v === "undefined" || v === "NaN") return "object";
  if (/^-?\d+(\.\d+)?$/.test(v)) return "number";
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
    return "string";
  if (v.startsWith("[")) return "array";
  if (v.startsWith("{")) return "object";
  return "string";
}

export function SimulatedTestRun({ data, onSuggestFix }: SimulatedTestRunProps) {
  const firstFailIdx = data.testCases.findIndex((c) => !c.passed);
  const [activeTab, setActiveTab] = useState(firstFailIdx >= 0 ? firstFailIdx : 0);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const activeCase = data.testCases[activeTab];
  const allPassed = data.passedCases === data.totalCases;

  const handleCopyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(data.codeSnippet);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1500);
    } catch {
      setCopyState("failed");
      setTimeout(() => setCopyState("idle"), 1500);
    }
  }, [data.codeSnippet]);

  if (!activeCase) return null;

  return (
    <div className="mt-2">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <CirclePlay className="size-3.5 text-[#166534]" />
        <span className="text-[12px] font-semibold text-[#1a2e2b]">Simulated test run</span>
        <span
          className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            allPassed ? "bg-[#dcfce7] text-[#166534]" : "bg-[#fee2e2] text-[#991b1b]"
          }`}
        >
          {data.passedCases}/{data.totalCases} passed
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-0 overflow-x-auto mb-2 border-b border-[#e2e8f0]">
        {data.testCases.map((tc, i) => {
          const isActive = i === activeTab;
          const borderColor = tc.passed ? "#3b82f6" : "#ef4444";
          return (
            <button
              key={tc.id}
              onClick={() => setActiveTab(i)}
              className={`shrink-0 px-3 py-1.5 text-[12px] font-medium cursor-pointer transition-colors border-b-2 ${
                isActive
                  ? "text-[#1a2e2b]"
                  : "text-[#94a3b8] hover:text-[#64748b] border-transparent"
              }`}
              style={isActive ? { borderBottomColor: borderColor } : undefined}
            >
              Case {tc.id}{" "}
              <span className={tc.passed ? "text-[#166534]" : "text-[#dc2626]"}>
                {tc.passed ? "\u2713" : "\u2717"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Case detail */}
      <div className="space-y-2.5">
        {/* Input */}
        <ValueBlock label="Input" values={activeCase.input} />

        {/* Expected output */}
        <ValueBlock label="Expected output" values={activeCase.expectedOutput} />

        {/* Actual output */}
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[11px] text-[#64748b] font-medium">Your output</span>
            {activeCase.passed && (
              <span className="text-[10px] font-semibold text-[#166534] bg-[#dcfce7] px-1.5 py-0.5 rounded-full">
                matched {"\u2713"}
              </span>
            )}
          </div>
          <div
            className={`rounded-md px-2.5 py-2 font-mono text-[12px] leading-relaxed ${
              activeCase.passed ? "bg-[#e2e8f0]" : "bg-[#fef2f2] border-l-[3px] border-l-[#ef4444]"
            }`}
          >
            {activeCase.actualOutput.map((v, i) => (
              <div key={i}>
                <span className="text-[#64748b]">{v.label} = </span>
                <ValueHighlight value={v.value} type={v.type} />
              </div>
            ))}
            {!activeCase.passed && activeCase.explanation && (
              <div className="mt-1.5 flex items-start gap-1 text-[11px] text-[#dc2626]">
                <AlertTriangle className="size-3 shrink-0 mt-0.5" />
                <span>{activeCase.explanation}</span>
              </div>
            )}
          </div>
        </div>

        {/* Root cause (failed only) */}
        {!activeCase.passed && activeCase.rootCause && (
          <div className="rounded-md border border-[#e2e8f0] bg-white p-2.5">
            <div className="text-[11px] font-semibold text-[#dc2626] mb-1">Root cause</div>
            <p className="text-[12px] text-[#1a2e2b] leading-relaxed">{activeCase.rootCause}</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleCopyCode}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium bg-[#e2e8f0] text-[#475569] hover:bg-[#cbd5e1] transition-colors cursor-pointer"
        >
          {copyState === "copied" ? (
            <Check className="size-3" />
          ) : copyState === "failed" ? (
            <AlertTriangle className="size-3" />
          ) : (
            <Copy className="size-3" />
          )}
          {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy code"}
        </button>
        {!activeCase.passed && onSuggestFix && (
          <button
            onClick={() => onSuggestFix(data.functionName)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[12px] font-medium bg-[#dbeafe] text-[#1d4ed8] hover:bg-[#bfdbfe] transition-colors cursor-pointer"
          >
            <Lightbulb className="size-3" />
            Suggest fix
          </button>
        )}
      </div>
    </div>
  );
}
