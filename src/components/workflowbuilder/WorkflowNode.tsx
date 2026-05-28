import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import {
  Search,
  Network,
  Database,
  FileCode,
  Mail,
  Github,
  MessageCircle,
  Workflow,
  ShieldQuestion,
  ScanLine,
} from "lucide-react";
import { NodeType } from "@/types/workflow";

const niktoSummary = (c: any) =>
  c?.ssl !== undefined
    ? `SSL: ${c.ssl ? "forced" : "auto"}${c.tuning ? ` · tuning ${c.tuning}` : ""}`
    : "Double-click to configure";

const TOOL_CONFIG_SUMMARY: Partial<Record<string, (cfg: any) => string>> = {
  nmap:     (c) => c?.scanMode ? `Mode: ${c.scanMode}${c.skipHostDiscovery ? " · -Pn" : ""}` : "Double-click to configure",
  gobuster: (c) => c?.wordlist ? `Wordlist: ${c.wordlist}${c.extensions ? ` · .${c.extensions}` : ""}` : "Double-click to configure",
  sqlmap:   (c) => c?.level ? `Level ${c.level} · Risk ${c.risk ?? 1}${c.forms ? " · forms" : ""}` : "Double-click to configure",
  wpscan:   (c) => c?.enumerate ? `Enumerate: ${c.enumerate} · ${c.detectionMode ?? "mixed"}` : "Double-click to configure",
  nikto:    niktoSummary,
  nkito:    niktoSummary, // backward compat
};

const WorkflowNode = memo(({ type, data, isConnectable }: NodeProps) => {
  const nodeType = type as NodeType;
  const isTerminalNode = ["email", "github-issue", "slack"].includes(nodeType);

  const getNodeConfig = () => {
    switch (nodeType) {
      case "gobuster":
        return { label: "Gobuster", icon: <Search className="w-5 h-5" />, color: "bg-pink-500" };
      case "nmap":
        return { label: "Nmap", icon: <Network className="w-5 h-5" />, color: "bg-blue-500" };
      case "nikto":
      case "nkito": // backward compat
        return { label: "Nikto", icon: <ScanLine className="w-5 h-5" />, color: "bg-orange-500" };
      case "sqlmap":
        return { label: "SQLMap", icon: <Database className="w-5 h-5" />, color: "bg-red-500" };
      case "wpscan":
        return { label: "WPScan", icon: <FileCode className="w-5 h-5" />, color: "bg-green-500" };
      case "owasp-vulnerabilities":
        return { label: "OWASP Analysis", icon: <ShieldQuestion className="w-5 h-5" />, color: "bg-blue-500" };
      case "flow-chart":
        return { label: "Flow Chart", icon: <Workflow className="w-5 h-5" />, color: "bg-cyan-500" };
      case "email":
        return { label: "Email", icon: <Mail className="w-5 h-5" />, color: "bg-blue-500" };
      case "github-issue":
        return { label: "GitHub Issue", icon: <Github className="w-5 h-5" />, color: "bg-cyan-500" };
      case "slack":
        return { label: "Slack", icon: <MessageCircle className="w-5 h-5" />, color: "bg-green-500" };
      default:
        return { label: type ?? "Unknown", icon: <Search className="w-5 h-5" />, color: "bg-gray-400" };
    }
  };

  const config = getNodeConfig();

  const getSubtitle = () => {
    const summarizer = TOOL_CONFIG_SUMMARY[nodeType];
    if (summarizer) return summarizer(data?.config);
    if (nodeType === "email")        return data?.config?.email  ? `To: ${data.config.email}`    : "Double-click to configure";
    if (nodeType === "github-issue") return data?.config?.repo   ? `Repo: ${data.config.repo}`   : "Double-click to configure";
    if (nodeType === "slack")        return data?.config?.channel? `${data.config.channel}`      : "Double-click to configure";
    return null;
  };

  const subtitle = getSubtitle();

  return (
    <div className="workflow-node min-w-[180px]">
      <div className={`workflow-node-icon ${config.color}`}>{config.icon}</div>
      <div className="workflow-node-label">{config.label}</div>
      {subtitle && (
        <div className="text-xs text-muted-foreground mt-1 max-w-[160px] truncate text-center">{subtitle}</div>
      )}

      {/* Input handle - always present */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className=""
        isConnectable={isConnectable}
      />

      {/* Output handle - only present for non-terminal nodes */}
      {!isTerminalNode && (
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className="workflow-node-connection-point workflow-node-output"
          isConnectable={isConnectable}
        />
      )}
    </div>
  );
});

export default WorkflowNode;
