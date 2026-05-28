import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield,
  Search,
  Globe,
  Zap,
  Mail,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { BACKEND_URL } from "@/lib/constant";
import { useWorkflowStore } from "@/lib/store";
import useAuth from "@/hooks/useAuth";

const API = `${BACKEND_URL}/api`;

// ── Scan check options (plain English) ────────────────────────────────────────

const CHECKS = [
  {
    id: "nmap",
    label: "Open ports",
    description: "Find open entry points on your server that could be exploited",
    icon: <Globe className="w-5 h-5" />,
    color: "text-blue-500",
    bg: "bg-blue-500/10 border-blue-200 dark:border-blue-800",
    selected: true,
  },
  {
    id: "gobuster",
    label: "Hidden pages",
    description: "Check if private admin or config pages are accidentally exposed",
    icon: <Search className="w-5 h-5" />,
    color: "text-pink-500",
    bg: "bg-pink-500/10 border-pink-200 dark:border-pink-800",
    selected: true,
  },
  {
    id: "nikto",
    label: "Web server issues",
    description: "Scan for outdated software and dangerous misconfigurations",
    icon: <Shield className="w-5 h-5" />,
    color: "text-orange-500",
    bg: "bg-orange-500/10 border-orange-200 dark:border-orange-800",
    selected: true,
  },
  {
    id: "sqlmap",
    label: "Database attacks",
    description: "Test if your site is vulnerable to SQL injection attacks",
    icon: <Zap className="w-5 h-5" />,
    color: "text-red-500",
    bg: "bg-red-500/10 border-red-200 dark:border-red-800",
    selected: false,
  },
];

// ── Workflow builder ──────────────────────────────────────────────────────────

function buildQuickScanWorkflow(
  name: string,
  url: string,
  selectedChecks: string[],
  email: string,
  username: string
) {
  const triggerId = `trigger-${uuidv4()}`;
  const emailId   = `email-${uuidv4()}`;

  const nodes: any[] = [
    {
      id: triggerId,
      type: "trigger",
      position: { x: 80, y: 200 },
      data: { dataSource: "Domain", frequency: "manual", sourceUrl: url },
    },
  ];
  const edges: any[] = [];

  // Place tool nodes vertically fanned out from trigger
  const startY = 200 - ((selectedChecks.length - 1) * 100) / 2;
  let firstToolId: string | null = null;

  selectedChecks.forEach((check, i) => {
    const nodeId = `${check}-${uuidv4()}`;
    if (!firstToolId) firstToolId = nodeId;
    nodes.push({
      id: nodeId,
      type: check,
      position: { x: 380, y: startY + i * 120 },
      data: {},
    });
    edges.push({
      id: `e-trigger-${nodeId}`,
      source: triggerId,
      target: nodeId,
      type: "smoothstep",
      animated: true,
    });
    // Connect the first tool to email so it's reachable via BFS
    if (i === 0) {
      edges.push({
        id: `e-${nodeId}-email`,
        source: nodeId,
        target: emailId,
        type: "smoothstep",
        animated: true,
      });
    }
  });

  nodes.push({
    id: emailId,
    type: "email",
    position: { x: 680, y: 200 },
    data: { config: { email } },
  });

  return {
    id: uuidv4(),
    name,
    username,
    nodes,
    edges,
  };
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepDot({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
      done   ? "bg-green-500 border-green-500 text-white" :
      active ? "bg-blue-500 border-blue-500 text-white" :
               "border-zinc-200 dark:border-zinc-700 text-zinc-400"
    }`}>
      {done ? <CheckCircle2 className="w-4 h-4" /> : n}
    </div>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────

export default function QuickScanDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const { user } = useAuth();
  const { fetchWorkflows } = useWorkflowStore();
  const [step, setStep] = useState(1);
  const [url, setUrl]   = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [checks, setChecks] = useState<Record<string, boolean>>(
    Object.fromEntries(CHECKS.map((c) => [c.id, c.selected]))
  );
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const reset = () => { setStep(1); setUrl(""); setEmail(user?.email ?? ""); setChecks(Object.fromEntries(CHECKS.map((c) => [c.id, c.selected]))); setRunning(false); setDone(false); };

  const handleClose = (v: boolean) => { if (!v) reset(); onOpenChange(v); };

  const selectedChecks = CHECKS.filter((c) => checks[c.id]).map((c) => c.id);

  const handleLaunch = async () => {
    if (!email.includes("@")) { toast.error("Enter a valid email address"); return; }
    setRunning(true);
    try {
      const workflowName = `Quick Scan — ${new URL(url).hostname}`;
      const workflow = buildQuickScanWorkflow(workflowName, url, selectedChecks, email, user?.username ?? "");

      // Create workflow
      const createRes = await fetch(`${API}/workflows`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workflow),
      });
      if (!createRes.ok) throw new Error("Failed to create workflow");
      const { workflow: saved } = await createRes.json();

      // Trigger immediately
      await fetch(`${API}/reports/trigger/${saved.id}`, {
        method: "POST",
        credentials: "include",
      });

      setDone(true);
      fetchWorkflows();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
      setRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Quick Security Scan
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        {!done && (
          <div className="flex items-center gap-2 mb-2">
            <StepDot n={1} active={step === 1} done={step > 1} />
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
            <StepDot n={2} active={step === 2} done={step > 2} />
            <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
            <StepDot n={3} active={step === 3} done={done} />
          </div>
        )}

        {/* ── Step 1: URL ── */}
        {!done && step === 1 && (
          <div className="space-y-4 py-2">
            <div>
              <p className="text-base font-semibold">What's your website URL?</p>
              <p className="text-sm text-zinc-500 mt-0.5">We'll run a security scan against it right now.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Website URL</Label>
              <Input
                autoFocus
                placeholder="https://yoursite.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && url.startsWith("https://") && setStep(2)}
              />
              {url && !url.startsWith("https://") && (
                <p className="text-xs text-amber-500">URL must start with https://</p>
              )}
            </div>
            <Button
              className="w-full gap-2"
              disabled={!url.startsWith("https://")}
              onClick={() => setStep(2)}
            >
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* ── Step 2: Checks ── */}
        {!done && step === 2 && (
          <div className="space-y-4 py-2">
            <div>
              <p className="text-base font-semibold">What should we check?</p>
              <p className="text-sm text-zinc-500 mt-0.5">We recommend running all of these — takes about 3 minutes.</p>
            </div>
            <div className="grid gap-2.5">
              {CHECKS.map((check) => {
                const on = checks[check.id];
                return (
                  <button
                    key={check.id}
                    onClick={() => setChecks((c) => ({ ...c, [check.id]: !c[check.id] }))}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      on ? check.bg + " " + check.color : "border-zinc-100 dark:border-zinc-800 text-zinc-500"
                    }`}
                  >
                    <div className={`flex-shrink-0 ${on ? check.color : "text-zinc-300 dark:text-zinc-600"}`}>
                      {check.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-tight">{check.label}</p>
                      <p className="text-xs mt-0.5 opacity-80 leading-snug">{check.description}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${on ? "border-current bg-current" : "border-zinc-300 dark:border-zinc-600"}`}>
                      {on && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedChecks.length === 0 && (
              <p className="text-xs text-amber-500 text-center">Select at least one check</p>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="gap-2" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                className="flex-1 gap-2"
                disabled={selectedChecks.length === 0}
                onClick={() => setStep(3)}
              >
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Email ── */}
        {!done && step === 3 && (
          <div className="space-y-4 py-2">
            <div>
              <p className="text-base font-semibold">Where should we send the results?</p>
              <p className="text-sm text-zinc-500 mt-0.5">You'll get a full report with what we found and what to fix.</p>
            </div>

            {/* Summary */}
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 p-3.5 space-y-1.5">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Scan summary</p>
              <p className="text-sm font-medium truncate">{url}</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {selectedChecks.map((id) => {
                  const c = CHECKS.find((x) => x.id === id)!;
                  return (
                    <span key={id} className={`text-xs px-2 py-0.5 rounded-full font-medium border ${c.bg} ${c.color}`}>
                      {c.label}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  autoFocus
                  className="pl-9"
                  placeholder="you@yourcompany.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLaunch()}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="gap-2" onClick={() => setStep(2)} disabled={running}>
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button className="flex-1 gap-2" onClick={handleLaunch} disabled={running}>
                {running ? <><Loader2 className="w-4 h-4 animate-spin" /> Starting scan…</> : <><Zap className="w-4 h-4" /> Start scan</>}
              </Button>
            </div>
          </div>
        )}

        {/* ── Done state ── */}
        {done && (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <p className="text-lg font-bold">Scan started!</p>
              <p className="text-sm text-zinc-500 mt-1">
                We're scanning <span className="font-medium text-zinc-700 dark:text-zinc-300">{url}</span> right now.
                Results will be emailed to <span className="font-medium text-zinc-700 dark:text-zinc-300">{email}</span> and
                will appear in your Reports tab in a few minutes.
              </p>
            </div>
            <Button
              className="w-full gap-2"
              onClick={() => { handleClose(false); onDone(); }}
            >
              View Reports <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
