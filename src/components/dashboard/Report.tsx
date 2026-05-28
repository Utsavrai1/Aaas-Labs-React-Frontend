import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Globe,
  Github,
  Play,
  Terminal,
  ShieldAlert,
  Wrench,
  ExternalLink,
  TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  Legend,
  CartesianGrid,
} from "recharts";
import { MermaidDiagram } from "@/components/shared/MermaidDiagram";
import { BACKEND_URL } from "@/lib/constant";

const API = `${BACKEND_URL}/api`;

interface NodeResult {
  nodeId: string;
  nodeType: string;
  status: "success" | "failed";
  output: string;
  interpretation: string | null;
  duration: number;
}

interface Report {
  _id: string;
  workflowId: string;
  workflowName: string;
  status: "running" | "success" | "failed";
  dataSource: string;
  sourceUrl: string;
  results: NodeResult[];
  startedAt: string;
  completedAt: string;
}

const TOOL_LABELS: Record<string, string> = {
  nmap:                    "Port Scanner",
  gobuster:                "Hidden Page Finder",
  sqlmap:                  "SQL Injection Test",
  wpscan:                  "WordPress Check",
  nikto:                   "Web Server Scanner",
  nkito:                   "Web Server Scanner",
  condition:               "Smart Filter",
  "owasp-vulnerabilities": "Code Security Review",
  "flow-chart":            "Architecture Map",
  email:                   "Email",
  slack:                   "Slack",
  "github-issue":          "GitHub Issue",
};

const TOOL_DESC: Record<string, string> = {
  nmap:                    "Open ports & services",
  gobuster:                "Exposed pages & directories",
  sqlmap:                  "Database injection vulnerabilities",
  wpscan:                  "WordPress plugin & theme issues",
  nikto:                   "Web server misconfigurations",
  nkito:                   "Web server misconfigurations",
  condition:               "Severity-based routing",
  "owasp-vulnerabilities": "OWASP Top 10 code issues",
  "flow-chart":            "Codebase architecture",
  email:                   "Email notification",
  slack:                   "Slack notification",
  "github-issue":          "GitHub issue",
};

const TERMINAL_TYPES = new Set(["email", "slack", "github-issue"]);

function getRelativeTime(dateStr: string) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getDuration(start: string, end: string) {
  if (!start || !end) return null;
  const secs = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

// ── Risk grade ────────────────────────────────────────────────────────────────

const GRADE_CONFIG = {
  F: { label: "F", title: "Critical risk",    bg: "bg-red-500/10",    text: "text-red-600 dark:text-red-400",    border: "border-red-200 dark:border-red-800" },
  D: { label: "D", title: "High risk",        bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", border: "border-orange-200 dark:border-orange-800" },
  C: { label: "C", title: "Medium risk",      bg: "bg-amber-500/10",  text: "text-amber-600 dark:text-amber-500",  border: "border-amber-200 dark:border-amber-800" },
  B: { label: "B", title: "Low risk",         bg: "bg-yellow-500/10", text: "text-yellow-700 dark:text-yellow-400", border: "border-yellow-200 dark:border-yellow-800" },
  A: { label: "A", title: "All clear",        bg: "bg-green-500/10",  text: "text-green-600 dark:text-green-400",  border: "border-green-200 dark:border-green-800" },
  "?": { label: "?", title: "Not yet scored", bg: "bg-zinc-100",      text: "text-zinc-400",                        border: "border-zinc-200 dark:border-zinc-700" },
} as const;

type Grade = keyof typeof GRADE_CONFIG;

function deriveGrade(results: NodeResult[]): Grade {
  const SEVERITY_MAP: Record<string, number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
  let maxRank = 0;
  let hasInterpretation = false;
  let hasCVEs = false;

  for (const r of results) {
    if (!r.interpretation) continue;
    hasInterpretation = true;

    const severityMatch = r.interpretation.match(/\*\*Severity:\*\*\s*(\w+)/i);
    if (severityMatch) {
      const rank = SEVERITY_MAP[severityMatch[1].toLowerCase()] ?? 0;
      maxRank = Math.max(maxRank, rank);
    }

    // Check if any real CVEs were referenced (not "None")
    const cveSection = r.interpretation.match(/\*\*CVE References:\*\*\s*([\s\S]*?)(?=\*\*|$)/i);
    if (cveSection && /CVE-\d{4}-\d+/i.test(cveSection[1])) {
      hasCVEs = true;
    }
  }

  if (!hasInterpretation) return "?";

  // Critical or High always D/F regardless
  if (maxRank >= 5) return "F";
  if (maxRank >= 4) return "D";

  // Medium with CVEs → C. Medium without CVEs (config observation only) → B
  if (maxRank >= 3) return hasCVEs ? "C" : "B";

  // Low with CVEs → B. Low without → A
  if (maxRank >= 2) return hasCVEs ? "B" : "A";

  return "A";
}

function RiskGrade({ results }: { results: NodeResult[] }) {
  const grade = deriveGrade(results);
  const cfg = GRADE_CONFIG[grade];
  return (
    <span
      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border-2 font-bold text-base flex-shrink-0 ${cfg.bg} ${cfg.text} ${cfg.border}`}
      title={cfg.title}
    >
      {cfg.label}
    </span>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Report["status"] }) {
  if (status === "success")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
        <CheckCircle className="h-3 w-3" /> Passed
      </span>
    );
  if (status === "failed")
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
        <XCircle className="h-3 w-3" /> Failed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
      <Clock className="h-3 w-3 animate-pulse" /> Running
    </span>
  );
}

// ── Trends panel ─────────────────────────────────────────────────────────────

interface TrendDay {
  date: string;
  total: number;
  passed: number;
  failed: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

function TrendsPanel() {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(30);
  const [data, setData] = useState<TrendDay[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`${API}/reports/trends?days=${days}`, { credentials: "include" })
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, days]);

  const hasData = data.length > 0;
  const totalScans = data.reduce((s, d) => s + d.total, 0);
  const totalPassed = data.reduce((s, d) => s + d.passed, 0);
  const totalFailed = data.reduce((s, d) => s + d.failed, 0);
  const criticalDays = data.filter((d) => d.critical > 0).length;

  const shortDate = (d: string) => {
    const [, m, day] = d.split("-");
    return `${parseInt(m)}/${parseInt(day)}`;
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden mb-3">
      <div
        className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2.5">
          <TrendingUp className="h-4 w-4 text-blue-500" />
          <span className="font-semibold text-sm">Trends</span>
          <span className="text-xs text-zinc-400">last {days} days</span>
        </div>
        <div className="flex items-center gap-2">
          {open && (
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              {[7, 14, 30].map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${days === d ? "bg-blue-500 text-white border-blue-500" : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-blue-400"}`}
                >
                  {d}d
                </button>
              ))}
            </div>
          )}
          {open ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
        </div>
      </div>

      {open && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-4 space-y-5">
          {loading ? (
            <div className="h-32 flex items-center justify-center text-sm text-zinc-400">Loading trends…</div>
          ) : !hasData ? (
            <div className="h-24 flex items-center justify-center text-sm text-zinc-400">No completed scans in this period.</div>
          ) : (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Total scans", value: totalScans, color: "text-zinc-700 dark:text-zinc-200" },
                  { label: "Passed", value: totalPassed, color: "text-green-600 dark:text-green-400" },
                  { label: "Failed", value: totalFailed, color: "text-red-500 dark:text-red-400" },
                  { label: "Days with Critical", value: criticalDays, color: "text-orange-600 dark:text-orange-400" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-zinc-100 dark:border-zinc-800 px-3 py-2.5">
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Pass/fail over time */}
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Scan outcomes over time</p>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <RechartsTooltip
                      formatter={(v: number, name: string) => [v, name]}
                      labelFormatter={(l) => `Date: ${l}`}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Line type="monotone" dataKey="passed" stroke="#22c55e" strokeWidth={2} dot={false} name="Passed" />
                    <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} dot={false} name="Failed" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Severity distribution */}
              <div>
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Severity findings per day</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <RechartsTooltip contentStyle={{ fontSize: 12 }} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="critical" stackId="a" fill="#ef4444" name="Critical" />
                    <Bar dataKey="high"     stackId="a" fill="#f97316" name="High" />
                    <Bar dataKey="medium"   stackId="a" fill="#f59e0b" name="Medium" />
                    <Bar dataKey="low"      stackId="a" fill="#84cc16" name="Low" />
                    <Bar dataKey="info"     stackId="a" fill="#3b82f6" name="Info" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Interpretation parser ─────────────────────────────────────────────────────

interface ParsedInterpretation {
  severity: string | null;
  found: string | null;
  means: string | null;
  actions: string[] | null;
  cves: string[] | null;
  raw: string;
}

function parseInterpretation(text: string): ParsedInterpretation {
  const result: ParsedInterpretation = { severity: null, found: null, means: null, actions: null, cves: null, raw: text };
  if (!text) return result;

  const sectionRe = /\*\*([^*]+):\*\*[ \t]*([\s\S]*?)(?=\*\*[^*]+:\*\*|$)/g;
  let match;
  while ((match = sectionRe.exec(text)) !== null) {
    const key = match[1].trim().toLowerCase();
    const val = match[2].trim();
    if (key === "severity") result.severity = val.split(/\s/)[0];
    else if (key === "what was found") result.found = val;
    else if (key === "what it means") result.means = val;
    else if (key === "recommended actions") {
      const lines = val.split("\n").map((l) => l.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
      result.actions = lines.length > 0 ? lines : null;
    } else if (key === "cve references") {
      const lines = val.split("\n").map((l) => l.replace(/^[-•]\s*/, "").trim()).filter(Boolean);
      result.cves = lines.length > 0 && lines[0].toLowerCase() !== "none" ? lines : null;
    }
  }
  return result;
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
  high:     "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  medium:   "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  low:      "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-200 dark:border-yellow-800",
  info:     "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
};

function SeverityBadge({ severity }: { severity: string }) {
  const key = severity.toLowerCase();
  const style = SEVERITY_STYLES[key] ?? SEVERITY_STYLES.info;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border ${style}`}>
      <ShieldAlert className="w-3 h-3" />
      {severity}
    </span>
  );
}

function extractCveId(line: string): string | null {
  const m = line.match(/CVE-\d{4}-\d+/i);
  return m ? m[0].toUpperCase() : null;
}

// ── Node row ──────────────────────────────────────────────────────────────────

function NodeRow({ result }: { result: NodeResult }) {
  const [expanded, setExpanded] = useState(false);
  const isFlowChart = result.nodeType === "flow-chart";
  const isTerminal = TERMINAL_TYPES.has(result.nodeType);
  const hasDetails = !isTerminal && result.output && result.output.trim().length > 0;
  const label = TOOL_LABELS[result.nodeType] || result.nodeType;
  const desc = TOOL_DESC[result.nodeType] || "";
  const parsed = result.interpretation ? parseInterpretation(result.interpretation) : null;

  return (
    <div className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      {/* Row header */}
      <div
        className={`flex items-center gap-3 px-4 py-3 ${hasDetails ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50" : ""} transition-colors`}
        onClick={() => hasDetails && setExpanded((e) => !e)}
      >
        <div className={`h-2 w-2 rounded-full flex-shrink-0 ${result.status === "success" ? "bg-green-500" : "bg-red-500"}`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{label}</span>
            {parsed?.severity && <SeverityBadge severity={parsed.severity} />}
            {isTerminal && (
              <span className="text-xs text-zinc-400 flex items-center gap-1">
                <Terminal className="h-3 w-3" /> notification
              </span>
            )}
            {desc && !isTerminal && !parsed?.severity && (
              <span className="text-xs text-zinc-400 hidden sm:inline">{desc}</span>
            )}
          </div>
          {!expanded && parsed?.means && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">{parsed.means}</p>
          )}
          {!expanded && !parsed?.means && result.interpretation && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
              {result.interpretation.split("\n")[0].replace(/\*\*/g, "")}
            </p>
          )}
          {isTerminal && (
            <p className="text-xs text-zinc-400 mt-0.5">
              {result.status === "success" ? "Delivered successfully" : result.output}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {result.duration > 0 && (
            <span className="text-xs text-zinc-400">{(result.duration / 1000).toFixed(1)}s</span>
          )}
          {hasDetails && (expanded ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />)}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && hasDetails && (
        <div className="px-4 pb-4 space-y-3 bg-zinc-50/50 dark:bg-zinc-900/30">
          {result.interpretation && (
            parsed?.found ? (
              /* ── Structured view ── */
              <div className="space-y-3">
                {/* What was found */}
                <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3.5">
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">What was found</p>
                  <ul className="space-y-1">
                    {parsed.found.split("\n").filter(Boolean).map((line, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-zinc-400 flex-shrink-0" />
                        <span>{line.replace(/^[-•]\s*/, "")}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* What it means */}
                {parsed.means && (
                  <div className="rounded-lg border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 p-3.5">
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1.5">What it means</p>
                    <p className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed">{parsed.means}</p>
                  </div>
                )}

                {/* Recommended actions */}
                {parsed.actions && parsed.actions[0]?.toLowerCase() !== "no action required" && (
                  <div className="rounded-lg border border-green-100 dark:border-green-900 bg-green-50 dark:bg-green-950/30 p-3.5">
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5" /> Recommended Actions
                    </p>
                    <ol className="space-y-2">
                      {parsed.actions.map((action, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-600/20 text-green-700 dark:text-green-400 text-xs font-bold flex items-center justify-center mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-sm text-green-900 dark:text-green-100 leading-snug">{action}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* CVE references */}
                {parsed.cves && (
                  <div className="rounded-lg border border-orange-100 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/30 p-3.5">
                    <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide mb-2">CVE References</p>
                    <div className="flex flex-col gap-1.5">
                      {parsed.cves.map((line, i) => {
                        const cveId = extractCveId(line);
                        const description = cveId ? line.replace(cveId, "").replace(/^[\s—–-]+/, "") : line;
                        return (
                          <div key={i} className="flex items-start gap-2 flex-wrap">
                            {cveId ? (
                              <a
                                href={`https://nvd.nist.gov/vuln/detail/${cveId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-mono font-semibold px-2 py-0.5 rounded bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:underline flex-shrink-0"
                              >
                                {cveId} <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : null}
                            {description && (
                              <span className="text-xs text-orange-800 dark:text-orange-200 leading-snug">{description}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ── Legacy plain-text fallback ── */
              <div className="rounded-lg border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 p-3.5">
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2 uppercase tracking-wide">AI Interpretation</p>
                <div className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed whitespace-pre-line">{result.interpretation}</div>
              </div>
            )
          )}

          {isFlowChart ? (
            <MermaidDiagram code={result.output} />
          ) : (
            <details>
              <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-200 select-none py-1">
                Raw output
              </summary>
              <pre className="mt-2 text-xs leading-relaxed whitespace-pre-wrap overflow-auto max-h-64 text-zinc-600 dark:text-zinc-400 font-mono bg-zinc-100 dark:bg-zinc-900 rounded p-3">
                {result.output}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function ReportRow({
  report,
  onRegenerate,
  regenerating,
}: {
  report: Report;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const toolResults = report.results.filter((r) => !TERMINAL_TYPES.has(r.nodeType));
  const notifications = report.results.filter((r) => TERMINAL_TYPES.has(r.nodeType));
  const passed = toolResults.filter((r) => r.status === "success").length;
  const failed = toolResults.filter((r) => r.status === "failed").length;
  const duration = getDuration(report.startedAt, report.completedAt);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Report header row */}
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
        onClick={() => report.results.length > 0 && setExpanded((e) => !e)}
      >
        {/* Risk grade */}
        {report.status !== "running" && (
          <RiskGrade results={report.results} />
        )}

        {/* Status + name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <StatusBadge status={report.status} />
            <span className="font-semibold text-sm">{report.workflowName}</span>
          </div>

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {/* Target */}
            {report.sourceUrl && (
              <span className="flex items-center gap-1 text-xs text-zinc-400">
                {report.dataSource === "GitHub"
                  ? <Github className="h-3 w-3" />
                  : <Globe className="h-3 w-3" />
                }
                <span className="truncate max-w-[200px]">{report.sourceUrl}</span>
              </span>
            )}

            {/* Scan summary */}
            {toolResults.length > 0 && (
              <span className="text-xs text-zinc-400">
                {passed > 0 && <span className="text-green-500">{passed} passed</span>}
                {passed > 0 && failed > 0 && <span className="text-zinc-300 dark:text-zinc-600"> · </span>}
                {failed > 0 && <span className="text-red-500">{failed} failed</span>}
              </span>
            )}

            {/* Duration + time */}
            {duration && <span className="text-xs text-zinc-400">{duration}</span>}
            <span className="text-xs text-zinc-400">{getRelativeTime(report.startedAt)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-3 text-xs gap-1.5"
            onClick={onRegenerate}
            disabled={regenerating || report.status === "running"}
          >
            <Play className={`h-3 w-3 ${regenerating ? "animate-pulse" : ""}`} />
            {regenerating ? "Starting…" : "Run again"}
          </Button>
          {report.results.length > 0 && (
            expanded
              ? <ChevronUp className="h-4 w-4 text-zinc-400 mr-1" />
              : <ChevronDown className="h-4 w-4 text-zinc-400 mr-1" />
          )}
        </div>
      </div>

      {/* Expanded results */}
      {expanded && report.results.length > 0 && (
        <div className="border-t border-zinc-100 dark:border-zinc-800">
          {/* Scan nodes */}
          {toolResults.length > 0 && (
            <div>
              <div className="px-5 py-2 bg-zinc-50 dark:bg-zinc-800/50">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  Scan results
                </span>
              </div>
              {toolResults.map((r) => (
                <NodeRow key={r.nodeId} result={r} />
              ))}
            </div>
          )}

          {/* Notifications */}
          {notifications.length > 0 && (
            <div className="border-t border-zinc-100 dark:border-zinc-800">
              <div className="px-5 py-2 bg-zinc-50 dark:bg-zinc-800/50">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  Notifications
                </span>
              </div>
              {notifications.map((r) => (
                <NodeRow key={r.nodeId} result={r} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReportPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const res = await fetch(`${API}/reports`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setReports(data.sort((a: Report, b: Report) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        ));
      } catch (err: any) {
        if (err.name !== "AbortError") console.error("Failed to fetch reports:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 15000);
    return () => { clearInterval(interval); controller.abort(); };
  }, []);

  async function fetchReports() {
    try {
      const res = await fetch(`${API}/reports`, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReports(data.sort((a: Report, b: Report) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      ));
    } catch (err) {
      console.error("Failed to fetch reports:", err);
    }
  }

  async function handleRegenerate(workflowId: string, reportId: string) {
    setRegenerating(reportId);
    try {
      await fetch(`${API}/reports/trigger/${workflowId}`, {
        method: "POST",
        credentials: "include",
      });
      setTimeout(fetchReports, 3000);
      setTimeout(fetchReports, 8000);
      setTimeout(fetchReports, 20000);
    } catch (err) {
      console.error("Failed to trigger workflow:", err);
    } finally {
      setTimeout(() => setRegenerating(null), 5000);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Security scan history — click any row to expand findings
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchReports} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Trends */}
      <TrendsPanel />

      {/* Body */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20 text-zinc-400">
          <Clock className="h-8 w-8 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No reports yet</p>
          <p className="text-sm mt-1">Trigger a workflow to generate your first security report.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <ReportRow
              key={report._id}
              report={report}
              onRegenerate={() => handleRegenerate(report.workflowId, report._id)}
              regenerating={regenerating === report._id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
