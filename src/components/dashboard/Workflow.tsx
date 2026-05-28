import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Calendar,
  ArrowRight,
  MoreVertical,
  Edit,
  Trash,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Play,
  Workflow as WorkflowIcon,
  Link,
  Copy,
  Check,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { v4 as uuid } from "uuid";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CreateWorkflowDialog from "@/components/dashboard/workflow/CreateWorkflowDialog";
import QuickScanDialog from "@/components/dashboard/workflow/QuickScanDialog";
import { useWorkflowStore } from "@/lib/store";
import { WORKFLOW_TEMPLATES } from "@/data/workflowTemplates";
import { workflowApi } from "@/hooks/useWorkflow";
import { Workflow } from "@/types/workflow";

const ACCENT: Record<string, string> = {
  blue:   "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  red:    "bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
  purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  yellow: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  green:  "bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800",
};

// ── Compact template card (used in the collapsed strip) ───────────────────────

function TemplateCard({
  template,
  onUse,
  loading,
}: {
  template: (typeof WORKFLOW_TEMPLATES)[0];
  onUse: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex-shrink-0 w-64 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex flex-col gap-2">
      <p className="text-sm font-semibold leading-tight">{template.name}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
        {template.description}
      </p>
      <div className="flex flex-wrap gap-1 mt-auto pt-1">
        {template.tools.slice(0, 3).map((tool) => (
          <span
            key={tool}
            className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${ACCENT[template.accentColor]}`}
          >
            {tool}
          </span>
        ))}
        {template.tools.length > 3 && (
          <span className="text-xs text-zinc-400">+{template.tools.length - 3}</span>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        className="w-full mt-1 h-7 text-xs gap-1"
        disabled={loading}
        onClick={onUse}
      >
        {loading ? "Creating…" : "Use template"}
        {!loading && <ArrowRight className="w-3 h-3" />}
      </Button>
    </div>
  );
}

// ── Workflow row card ─────────────────────────────────────────────────────────

function WebhookCopyButton({ secret }: { secret?: string }) {
  const [copied, setCopied] = useState(false);
  if (!secret) return null;
  const url = `${import.meta.env.VITE_BACKEND_URL}/api/webhooks/${secret}`;
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
      title={url}
    >
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Link className="w-3 h-3" />}
      {copied ? "Copied!" : "Webhook URL"}
      <Copy className="w-3 h-3" />
    </button>
  );
}

function WorkflowCard({
  workflow,
  running,
  onRun,
  onEdit,
  onDelete,
  onClick,
}: {
  workflow: Workflow & { webhookSecret?: string };
  running: boolean;
  onRun: (e: React.MouseEvent) => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  const trigger = workflow.nodes?.find((n: any) => n.type === "trigger");
  const frequency = trigger?.data?.frequency;
  const sourceUrl = trigger?.data?.sourceUrl;
  const dataSource = trigger?.data?.dataSource;
  const toolNodes = workflow.nodes?.filter(
    (n: any) => !["trigger", "email", "slack", "github-issue"].includes(n.type)
  ) ?? [];

  return (
    <div
      className="group bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all duration-200 cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          {/* Icon + name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <WorkflowIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {workflow.name}
              </p>
              {sourceUrl && (
                <p className="text-xs text-zinc-400 truncate mt-0.5">{sourceUrl}</p>
              )}
            </div>
          </div>

          {/* Overflow menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRun} disabled={running}>
                <Play className="mr-2 h-4 w-4 text-green-500" />
                {running ? "Starting…" : "Run Now"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          {dataSource && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
              {dataSource}
            </span>
          )}
          {frequency && frequency !== "manual" && (
            <span className="text-xs text-zinc-400">{frequency}</span>
          )}
          {frequency === "manual" && (
            <span className="text-xs text-zinc-400">Manual</span>
          )}
          {toolNodes.length > 0 && (
            <span className="text-xs text-zinc-400">
              {toolNodes.length} {toolNodes.length === 1 ? "tool" : "tools"}
            </span>
          )}
          <span className="text-xs text-zinc-400 ml-auto">
            {format(new Date(workflow.createdAt), "MMM d, yyyy")}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950"
            disabled={running}
            onClick={onRun}
          >
            <Play className="w-3 h-3" />
            {running ? "Starting…" : "Run Now"}
          </Button>
          <div onClick={(e) => e.stopPropagation()}>
            <WebhookCopyButton secret={(workflow as any).webhookSecret} />
          </div>
        </div>
        <span className="text-xs text-zinc-400 flex items-center gap-1">
          Open <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const WorkflowPage = () => {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [quickScanOpen, setQuickScanOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [templatesOpen, setTemplatesOpen] = useState(false); // collapsed by default
  const [usingTemplate, setUsingTemplate] = useState<string | null>(null);
  const [runningWorkflow, setRunningWorkflow] = useState<string | null>(null);

  const { workflows, isLoading, error, fetchWorkflows, deleteWorkflow, setActiveWorkflow } =
    useWorkflowStore();

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const filteredWorkflows = workflows.filter((w) =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRunNow = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRunningWorkflow(id);
    try {
      await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/reports/trigger/${id}`, {
        method: "POST",
        credentials: "include",
      });
      toast.success(`Running "${name}"`, {
        description: "Check the Reports tab for results.",
      });
    } catch {
      toast.error("Failed to trigger workflow");
    } finally {
      setTimeout(() => setRunningWorkflow(null), 3000);
    }
  };

  const handleDeleteWorkflow = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await deleteWorkflow(id);
      toast.success(`"${name}" deleted`);
    } catch {
      // store handles toast
    }
  };

  const handleUseTemplate = async (templateId: string) => {
    const template = WORKFLOW_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    setUsingTemplate(templateId);
    try {
      const newWorkflow = await workflowApi.createWorkflow({
        id: uuid(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...template.build(""),
      } as any);
      await fetchWorkflows();
      toast.success(`"${template.name}" created`, {
        description: "Open it and set your target URL to get started.",
      });
      navigate(`/workflow/${newWorkflow.id}`);
    } catch {
      toast.error("Failed to create workflow from template");
    } finally {
      setUsingTemplate(null);
    }
  };

  const hasWorkflows = workflows.length > 0;

  return (
    <>
      <div className="max-w-5xl mx-auto px-6 pt-8 pb-12">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">Workflows</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              {hasWorkflows
                ? `${workflows.length} workflow${workflows.length !== 1 ? "s" : ""}`
                : "Automate your security scanning"}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {hasWorkflows && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                <Input
                  placeholder="Search…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-44 sm:w-56 h-9"
                />
              </div>
            )}
            <Button
              variant="outline"
              className="h-9 gap-2 border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950"
              onClick={() => setQuickScanOpen(true)}
            >
              <Zap className="w-4 h-4" />
              Quick Scan
            </Button>
            <Button onClick={() => setDialogOpen(true)} className="h-9 gap-2">
              <Plus className="w-4 h-4" />
              New Workflow
            </Button>
          </div>
        </div>

        {/* ── Loading ── */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            ))}
          </div>
        )}

        {/* ── Error ── */}
        {error && !isLoading && (
          <div className="text-center py-16">
            <p className="text-destructive mb-3 text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchWorkflows()}>Try Again</Button>
          </div>
        )}

        {/* ── No workflows → show templates as primary CTA ── */}
        {!isLoading && !error && !hasWorkflows && (
          <div>
            <div className="text-center py-10 mb-8">
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <WorkflowIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="font-semibold text-lg mb-1">No workflows yet</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
                Start from a template or create a blank workflow.
              </p>
              <div className="flex gap-2 justify-center flex-wrap">
                <Button
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                  onClick={() => setQuickScanOpen(true)}
                >
                  <Zap className="w-4 h-4" />
                  Quick Scan — scan a URL in 3 clicks
                </Button>
                <Button variant="outline" onClick={() => setDialogOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Build custom workflow
                </Button>
              </div>
            </div>

            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" /> Or start from a template
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {WORKFLOW_TEMPLATES.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUse={() => handleUseTemplate(template.id)}
                  loading={usingTemplate === template.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Has workflows → show grid, search result, then templates below ── */}
        {!isLoading && !error && hasWorkflows && (
          <>
            {/* Search empty state */}
            {searchTerm && filteredWorkflows.length === 0 ? (
              <div className="text-center py-16 text-zinc-400">
                <Search className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No workflows match "{searchTerm}"</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredWorkflows.map((workflow) => (
                  <WorkflowCard
                    key={workflow.id}
                    workflow={workflow}
                    running={runningWorkflow === workflow.id}
                    onRun={(e) => handleRunNow(workflow.id, workflow.name, e)}
                    onEdit={(e) => { e.stopPropagation(); setActiveWorkflow(workflow.id); navigate(`/workflow/${workflow.id}`); }}
                    onDelete={(e) => handleDeleteWorkflow(workflow.id, workflow.name, e)}
                    onClick={() => { setActiveWorkflow(workflow.id); navigate(`/workflow/${workflow.id}`); }}
                  />
                ))}
              </div>
            )}

            {/* ── Templates strip — collapsed by default ── */}
            {!searchTerm && (
              <div className="mt-10 border-t border-zinc-100 dark:border-zinc-800 pt-6">
                <button
                  className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors mb-4"
                  onClick={() => setTemplatesOpen((o) => !o)}
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="font-medium">Start from a template</span>
                  {templatesOpen
                    ? <ChevronUp className="w-4 h-4" />
                    : <ChevronDown className="w-4 h-4" />}
                </button>

                {templatesOpen && (
                  <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                    {WORKFLOW_TEMPLATES.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onUse={() => handleUseTemplate(template.id)}
                        loading={usingTemplate === template.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <CreateWorkflowDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <QuickScanDialog
        open={quickScanOpen}
        onOpenChange={setQuickScanOpen}
        onDone={() => navigate("/dashboard/report")}
      />
    </>
  );
};

export default WorkflowPage;
