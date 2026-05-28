import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NodeType } from "@/types/workflow";

interface NodeConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeType: NodeType;
  initialData?: any;
  onSave: (data: any) => void;
}

// ── Per-tool config components ────────────────────────────────────────────────

function NmapConfig({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Scan Mode</Label>
        <Select value={data.scanMode || "standard"} onValueChange={(v) => onChange({ ...data, scanMode: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="quick">Quick (-F) — top 100 ports, fastest</SelectItem>
            <SelectItem value="standard">Standard (-sV --open) — version detection</SelectItem>
            <SelectItem value="full">Full (-p-) — all 65535 ports, slow</SelectItem>
            <SelectItem value="aggressive">Aggressive (-A) — OS + version + scripts</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Skip Host Discovery</Label>
        <Select value={String(data.skipHostDiscovery ?? false)} onValueChange={(v) => onChange({ ...data, skipHostDiscovery: v === "true" })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="false">No (default)</SelectItem>
            <SelectItem value="true">Yes (-Pn) — treat host as always up, useful for CDN-protected targets</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function GobusterConfig({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Wordlist</Label>
        <Select value={data.wordlist || "common"} onValueChange={(v) => onChange({ ...data, wordlist: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="common">Common (~4,600 entries) — fast</SelectItem>
            <SelectItem value="medium">Medium (~220,000 entries) — thorough</SelectItem>
            <SelectItem value="big">Big (~20,000 entries) — balanced</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>File Extensions to check</Label>
        <Input
          value={data.extensions || ""}
          onChange={(e) => onChange({ ...data, extensions: e.target.value })}
          placeholder="php,asp,html,js  (comma-separated, leave blank to skip)"
        />
      </div>
      <div className="space-y-2">
        <Label>Threads</Label>
        <Input
          type="number"
          min={1}
          max={50}
          value={data.threads || 10}
          onChange={(e) => onChange({ ...data, threads: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}

function SqlmapConfig({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Scan Forms</Label>
        <Select value={String(data.forms ?? false)} onValueChange={(v) => onChange({ ...data, forms: v === "true" })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="false">URL parameters only</SelectItem>
            <SelectItem value="true">Crawl and test all forms (--forms)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Level (depth of tests, 1–3)</Label>
        <Select value={String(data.level || 1)} onValueChange={(v) => onChange({ ...data, level: Number(v) })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 — Basic (fastest, recommended)</SelectItem>
            <SelectItem value="2">2 — Medium</SelectItem>
            <SelectItem value="3">3 — Deep (slow)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Risk (aggressiveness, 1–2)</Label>
        <Select value={String(data.risk || 1)} onValueChange={(v) => onChange({ ...data, risk: Number(v) })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 — Safe (default, no destructive tests)</SelectItem>
            <SelectItem value="2">2 — Medium (includes heavy time-based tests)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function WpscanConfig({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Enumerate</Label>
        <Select value={data.enumerate || "ap,at,u"} onValueChange={(v) => onChange({ ...data, enumerate: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ap,at,u">All: plugins, themes, users (recommended)</SelectItem>
            <SelectItem value="ap">Plugins only</SelectItem>
            <SelectItem value="at">Themes only</SelectItem>
            <SelectItem value="u">Users only</SelectItem>
            <SelectItem value="vp">Vulnerable plugins only (fastest)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Detection Mode</Label>
        <Select value={data.detectionMode || "mixed"} onValueChange={(v) => onChange({ ...data, detectionMode: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="passive">Passive — minimal requests, stealthy</SelectItem>
            <SelectItem value="mixed">Mixed — balanced (default)</SelectItem>
            <SelectItem value="aggressive">Aggressive — more requests, more findings</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>WPScan API Token <span className="text-muted-foreground font-normal">(optional — unlocks CVE data)</span></Label>
        <Input
          type="password"
          value={data.apiToken || ""}
          onChange={(e) => onChange({ ...data, apiToken: e.target.value })}
          placeholder="Get free token at wpscan.com"
        />
      </div>
    </div>
  );
}

function NiktoConfig({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Force SSL</Label>
        <Select value={String(data.ssl ?? false)} onValueChange={(v) => onChange({ ...data, ssl: v === "true" })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="false">Auto-detect from URL</SelectItem>
            <SelectItem value="true">Force SSL (-ssl)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Scan Tuning <span className="text-muted-foreground font-normal">(what to check)</span></Label>
        <Select value={data.tuning || ""} onValueChange={(v) => onChange({ ...data, tuning: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All checks (default)</SelectItem>
            <SelectItem value="1">File upload vulnerabilities only</SelectItem>
            <SelectItem value="2">Misconfiguration / default files</SelectItem>
            <SelectItem value="4">Injection (XSS/Script)</SelectItem>
            <SelectItem value="9">SQL injection</SelectItem>
            <SelectItem value="x">Reverse tuning — exclude selected</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ── Notification node configs (unchanged) ─────────────────────────────────────

function EmailConfig({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="space-y-2">
      <Label htmlFor="email">Email Address</Label>
      <Input
        id="email"
        type="email"
        value={data.email || ""}
        onChange={(e) => onChange({ ...data, email: e.target.value })}
        placeholder="user@example.com"
      />
    </div>
  );
}

function GithubIssueConfig({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const githubRepos: string[] = JSON.parse(localStorage.getItem("repos") || "[]");
  return (
    <div className="space-y-2">
      <Label>GitHub Repository</Label>
      <Select value={data.repo || ""} onValueChange={(v) => onChange({ ...data, repo: v })}>
        <SelectTrigger><SelectValue placeholder="Select a repository" /></SelectTrigger>
        <SelectContent>
          {githubRepos.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function SlackConfig({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="space-y-2">
      <Label htmlFor="channel">Slack Channel</Label>
      <Input
        id="channel"
        value={data.channel || ""}
        onChange={(e) => onChange({ ...data, channel: e.target.value })}
        placeholder="#general"
      />
    </div>
  );
}

// ── Meta ──────────────────────────────────────────────────────────────────────

function ConditionConfig({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Severity threshold</Label>
        <Select
          value={data.severity ?? "high"}
          onValueChange={(v) => onChange({ ...data, severity: v })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="info">Info (any finding)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Operator</Label>
        <Select
          value={data.operator ?? "gte"}
          onValueChange={(v) => onChange({ ...data, operator: v })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="gte">≥ (this severity or worse)</SelectItem>
            <SelectItem value="lte">≤ (this severity or better)</SelectItem>
            <SelectItem value="eq">= (exactly this severity)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground leading-snug rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-2.5">
        The <span className="font-semibold text-green-600 dark:text-green-400">green handle</span> fires when the condition is met.
        The <span className="font-semibold text-red-500">red handle</span> fires when it is not. Connect notification nodes to either or both.
      </p>
    </div>
  );
}

const NODE_META: Record<string, { title: string; description: string }> = {
  nmap:      { title: "Configure Nmap",      description: "Set scan depth and host-discovery behaviour." },
  gobuster:  { title: "Configure Gobuster",  description: "Choose wordlist, file extensions, and thread count." },
  sqlmap:    { title: "Configure SQLMap",    description: "Set injection level, risk, and form scanning mode." },
  wpscan:    { title: "Configure WPScan",    description: "Choose what to enumerate and detection aggressiveness." },
  nikto:     { title: "Configure Nikto",     description: "Set SSL mode and check tuning." },
  condition: { title: "Configure Condition", description: "Route the workflow based on the scan's severity level." },
  email:          { title: "Configure Email",        description: "Set the recipient address." },
  "github-issue": { title: "Configure GitHub Issue", description: "Select the repository where issues are created." },
  slack:          { title: "Configure Slack",        description: "Set the channel where messages are posted." },
};

// ── Main dialog ───────────────────────────────────────────────────────────────

const NodeConfigDialog = ({
  open,
  onOpenChange,
  nodeType,
  initialData,
  onSave,
}: NodeConfigDialogProps) => {
  const [config, setConfig] = useState<any>(initialData || {});

  const meta = NODE_META[nodeType] || { title: `Configure ${nodeType}`, description: "" };

  const renderForm = () => {
    switch (nodeType) {
      case "nmap":           return <NmapConfig data={config} onChange={setConfig} />;
      case "gobuster":       return <GobusterConfig data={config} onChange={setConfig} />;
      case "sqlmap":         return <SqlmapConfig data={config} onChange={setConfig} />;
      case "wpscan":         return <WpscanConfig data={config} onChange={setConfig} />;
      case "nikto":          return <NiktoConfig data={config} onChange={setConfig} />;
      case "condition":      return <ConditionConfig data={config} onChange={setConfig} />;
      case "email":          return <EmailConfig data={config} onChange={setConfig} />;
      case "github-issue":   return <GithubIssueConfig data={config} onChange={setConfig} />;
      case "slack":          return <SlackConfig data={config} onChange={setConfig} />;
      default:               return <p className="text-sm text-muted-foreground">No configuration available for this node.</p>;
    }
  };

  const handleSave = () => {
    onSave(config);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[480px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{meta.title}</DialogTitle>
          {meta.description && <DialogDescription>{meta.description}</DialogDescription>}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4 pr-1">{renderForm()}</div>
        <DialogFooter className="flex-shrink-0 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NodeConfigDialog;
