import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  useReactFlow,
  MarkerType,
  NodeTypes,
  ReactFlowProvider,
  NodeMouseHandler,
  Node,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Trash2,
  Network,
  Search,
  Database,
  FileCode,
  Mail,
  Github,
  MessageCircle,
  Workflow as WorkflowIcon,
  ShieldQuestion,
  ScanLine,
  AlertCircle,
  CheckCircle2,
  GitBranch,
} from "lucide-react";
import { useTheme } from "@/components/shared/ThemeProvider";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import TriggerNode from "@/components/workflowbuilder/TriggerNode";
import WorkflowNode from "@/components/workflowbuilder/WorkflowNode";
import FilterNode from "@/components/workflowbuilder/FilterNode";
import NodeConfigDialog from "@/components/workflowbuilder/NodeConfigDialog";
import { useWorkflowStore } from "@/lib/store";
import {
  DataSource,
  Workflow,
  NodeType,
  WorkflowNode as WorkflowNodeType,
} from "@/types/workflow";
import { v4 as uuidv4 } from "uuid";
import useAuth from "@/hooks/useAuth";

// ── ReactFlow node type registry ──────────────────────────────────────────────

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  gobuster: WorkflowNode,
  nmap: WorkflowNode,
  nikto: WorkflowNode,
  nkito: WorkflowNode,
  sqlmap: WorkflowNode,
  wpscan: WorkflowNode,
  "owasp-vulnerabilities": WorkflowNode,
  "flow-chart": WorkflowNode,
  condition: FilterNode,
  email: WorkflowNode,
  "github-issue": WorkflowNode,
  slack: WorkflowNode,
};

const TERMINAL_NODE_TYPES = ["email", "github-issue", "slack"];

// ── Node palette definition ───────────────────────────────────────────────────

interface PaletteNode {
  type: NodeType;
  label: string;
  icon: React.ReactNode;
  color: string;
  dataSource: DataSource | "both";
  description: string;
}

const PALETTE_NODES: PaletteNode[] = [
  // Scan (Domain)
  { type: "nmap",    label: "Port Scanner",         icon: <Network className="w-4 h-4" />,       color: "text-blue-500",   dataSource: "Domain", description: "Find open entry points on your server" },
  { type: "gobuster",label: "Hidden Page Finder",   icon: <Search className="w-4 h-4" />,        color: "text-pink-500",   dataSource: "Domain", description: "Discover exposed admin/config pages" },
  { type: "sqlmap",  label: "SQL Injection Test",   icon: <Database className="w-4 h-4" />,      color: "text-red-500",    dataSource: "Domain", description: "Test for database attack vulnerabilities" },
  { type: "wpscan",  label: "WordPress Check",      icon: <FileCode className="w-4 h-4" />,      color: "text-green-500",  dataSource: "Domain", description: "Scan WordPress plugins & themes" },
  { type: "nikto",   label: "Web Server Scanner",   icon: <ScanLine className="w-4 h-4" />,      color: "text-orange-500", dataSource: "Domain", description: "Detect outdated software & misconfigs" },
  // Analysis (GitHub)
  { type: "owasp-vulnerabilities", label: "Code Security Review", icon: <ShieldQuestion className="w-4 h-4" />, color: "text-blue-500",  dataSource: "GitHub", description: "Find OWASP Top 10 issues in your code" },
  { type: "flow-chart",            label: "Architecture Map",      icon: <WorkflowIcon className="w-4 h-4" />,  color: "text-cyan-500",  dataSource: "GitHub", description: "Visualise your codebase structure" },
  // Logic (both)
  { type: "condition", label: "Condition", icon: <GitBranch className="w-4 h-4" />, color: "text-amber-500", dataSource: "both", description: "Route by severity level" },
  // Notifications (both)
  { type: "email",        label: "Email",        icon: <Mail className="w-4 h-4" />,           color: "text-blue-500",  dataSource: "both", description: "Send email report" },
  { type: "slack",        label: "Slack",        icon: <MessageCircle className="w-4 h-4" />,  color: "text-green-500", dataSource: "both", description: "Post to Slack channel" },
  { type: "github-issue", label: "GitHub Issue", icon: <Github className="w-4 h-4" />,         color: "text-zinc-500",  dataSource: "both", description: "Create GitHub issue" },
];

// ── Node panel ────────────────────────────────────────────────────────────────

function NodePanel({
  activeDataSource,
  onAddNode,
  existingTypes,
}: {
  activeDataSource: DataSource | null;
  onAddNode: (type: NodeType) => void;
  existingTypes: Set<string>;
}) {
  const groups = [
    { label: "Scan Tools",    filter: "Domain" as DataSource },
    { label: "Code Analysis", filter: "GitHub" as DataSource },
    { label: "Logic",         filter: "both" as const, onlyTypes: ["condition"] },
    { label: "Notifications", filter: "both" as const, onlyTypes: ["email", "slack", "github-issue"] },
  ];

  return (
    <aside className="w-52 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col overflow-y-auto">
      <div className="px-3 pt-4 pb-2">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Nodes</p>
        {!activeDataSource && (
          <p className="text-xs text-zinc-400 mt-1 leading-tight">
            Configure the trigger node first to unlock available tools.
          </p>
        )}
      </div>

      {groups.map((group) => {
          const filterStr = group.filter as string;

        const nodes = PALETTE_NODES.filter((n) => {
          if ("onlyTypes" in group && group.onlyTypes) return group.onlyTypes.includes(n.type);
          return n.dataSource === filterStr || (filterStr === "both" && n.dataSource === "both");
        });

        const isGroupActive = filterStr === "both" || activeDataSource === filterStr;

        return (
          <div key={group.label} className="mb-1">
            <p className="px-3 py-1.5 text-xs font-medium text-zinc-400">{group.label}</p>
            {nodes.map((node) => {
                        // Notification nodes can be added multiple times; tool nodes are unique
              const isNotification = node.dataSource === "both";
              const alreadyAdded = !isNotification && existingTypes.has(node.type);
              const disabled = !activeDataSource || !isGroupActive || alreadyAdded;

              return (
                <button
                  key={node.type}
                  disabled={disabled}
                  onClick={() => !disabled && onAddNode(node.type)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors rounded-none
                    ${disabled
                      ? "opacity-30 cursor-not-allowed"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    }
                    ${alreadyAdded && activeDataSource && isGroupActive ? "opacity-40" : ""}
                  `}
                  title={alreadyAdded ? "Already added (tool nodes are unique)" : node.description}
                >
                  <span className={`flex-shrink-0 ${node.color}`}>{node.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">{node.label}</p>
                    <p className="text-xs text-zinc-400 leading-tight truncate">{node.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        );
      })}

      <div className="mt-auto px-3 py-3 border-t border-zinc-100 dark:border-zinc-800">
        <p className="text-xs text-zinc-400 leading-snug">
          Double-click any node on the canvas to configure it.
        </p>
      </div>
    </aside>
  );
}

// ── Main builder content ──────────────────────────────────────────────────────

const WorkflowBuilderContent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    workflows,
    fetchWorkflowById,
    updateWorkflow,
    setActiveWorkflow,
    activeDataSource,
    setActiveDataSource,
    isLoading,
    error,
  } = useWorkflowStore();

  const { theme } = useTheme();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [configNodeId, setConfigNodeId] = useState<string | null>(null);
  const [configNodeType, setConfigNodeType] = useState<NodeType | null>(null);
  const [configNodeData, setConfigNodeData] = useState<any>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();

  const existingNodeTypes = new Set(nodes.map((n) => n.type as string));
  const selectedNodes = nodes.filter((n) => n.selected && n.type !== "trigger");
  const hasSelection = selectedNodes.length > 0;

  // ── Load workflow ──────────────────────────────────────────────────────────

  useEffect(() => {
    const loadWorkflow = async () => {
      if (!id) return;

      const found = workflows.find((w) => w.id === id);
      const fetchedWorkflow = found ?? await fetchWorkflowById(id);

      if (!fetchedWorkflow) {
        toast.error("Workflow not found");
        navigate("/");
        return;
      }

      setWorkflow(fetchedWorkflow);
      setActiveWorkflow(id);

      if (fetchedWorkflow.nodes.length > 0) {
        setNodes(fetchedWorkflow.nodes);
        setEdges(fetchedWorkflow.edges as Edge[]);
        const trigger = fetchedWorkflow.nodes.find((n: any) => n.type === "trigger");
        if (trigger?.data?.dataSource) setActiveDataSource(trigger.data.dataSource);
      } else {
        addTriggerNode();
      }
    };

    loadWorkflow();
  }, []);

  // ── Keyboard shortcut: Cmd/Ctrl+S ─────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveWorkflow();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [nodes, edges, workflow, user]);

  // ── Mark dirty on node/edge changes after initial load ────────────────────

  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (!initialLoadDone.current) { initialLoadDone.current = true; return; }
    setIsDirty(true);
  }, [nodes, edges]);

  // ── Graph helpers ─────────────────────────────────────────────────────────

  const addTriggerNode = useCallback(() => {
    const newNode: WorkflowNodeType = {
      id: `trigger-${uuidv4()}`,
      type: "trigger" as NodeType,
      position: { x: 250, y: 200 },
      data: { dataSource: "Domain", frequency: "manual", sourceUrl: "" },
    };
    setNodes([newNode]);
    setActiveDataSource("Domain");
    return newNode;
  }, [setNodes, setActiveDataSource]);

  const addNode = (type: NodeType) => {
    const isNotification = TERMINAL_NODE_TYPES.includes(type);
    if (!isNotification && nodes.some((node) => node.type === type)) {
      toast.error(`A ${type} node already exists in this workflow`);
      return;
    }

    if (!nodes.some((n) => n.type === "trigger")) {
      addTriggerNode();
      toast.info("Trigger node added automatically");
      return;
    }

    const lastX = nodes.reduce((max, n) => Math.max(max, n.position.x), 0);
    const newNode: WorkflowNodeType = {
      id: `${type}-${uuidv4()}`,
      type,
      position: { x: lastX + 280, y: 200 },
      data: {},
    };

    setNodes((nds) => [...nds, newNode]);

    // Auto-open config for notification and tool nodes
    setConfigNodeId(newNode.id);
    setConfigNodeType(type);
    setConfigNodeData({});
    setShowConfigDialog(true);

    setTimeout(() => reactFlowInstance.fitView({ padding: 0.2 }), 100);
  };

  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      if (!sourceNode || !targetNode) return;

      if (targetNode.type === "trigger") {
        toast.error("Cannot connect to the trigger node");
        return;
      }
      if (TERMINAL_NODE_TYPES.includes(sourceNode.type as NodeType)) {
        toast.error("Notification nodes cannot have outgoing connections");
        return;
      }

      // Prevent duplicate edges between the same two nodes
      const duplicate = edges.some(
        (e) => e.source === connection.source && e.target === connection.target
      );
      if (duplicate) {
        toast.error("These nodes are already connected");
        return;
      }

      // A non-terminal tool node can only have one incoming scan/trigger connection
      // (prevents a node from being fed by two different scan results simultaneously)
      const targetIsToolNode = !TERMINAL_NODE_TYPES.includes(targetNode.type as NodeType) && targetNode.type !== "trigger";
      const targetAlreadyHasToolSource = targetIsToolNode && edges.some(
        (e) => e.target === connection.target && !TERMINAL_NODE_TYPES.includes(nodes.find((n) => n.id === e.source)?.type as NodeType ?? "")
      );
      if (targetAlreadyHasToolSource) {
        toast.error("A scan node can only receive from one source — use a notification node to fan out");
        return;
      }

      const isConditionSource = sourceNode.type === "condition";
      const isMatchHandle     = connection.sourceHandle === "match";

      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: "smoothstep",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
            ...(isConditionSource && {
              label: isMatchHandle ? "match" : "no match",
              labelStyle: { fill: isMatchHandle ? "#16a34a" : "#dc2626", fontSize: 10, fontWeight: 700 },
              labelBgStyle: { fill: "transparent" },
              style: { stroke: isMatchHandle ? "#16a34a" : "#dc2626", strokeWidth: 2 },
            }),
          },
          eds
        )
      );
      setTimeout(() => reactFlowInstance.fitView({ padding: 0.2 }), 100);
    },
    [setEdges, nodes, edges, reactFlowInstance]
  );

  // ── Node config ───────────────────────────────────────────────────────────

  const openNodeConfig = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node || node.type === "trigger") return;
    setConfigNodeId(nodeId);
    setConfigNodeType(node.type as NodeType);
    setConfigNodeData(node.data?.config || {});
    setShowConfigDialog(true);
  };

  const handleNodeDoubleClick: NodeMouseHandler = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if ((node.type as NodeType) !== "trigger") openNodeConfig(node.id);
    },
    [openNodeConfig]
  );

  const saveNodeConfig = (configData: any) => {
    if (!configNodeId) return;
    setNodes((nds) =>
      nds.map((node) =>
        node.id === configNodeId ? { ...node, data: { config: configData } } : node
      )
    );
  };

  // ── Delete selected ───────────────────────────────────────────────────────

  const deleteSelectedNodes = () => {
    const selected = nodes.filter((n) => n.selected);
    if (selected.some((n) => n.type === "trigger")) {
      toast.error("Cannot delete the trigger node");
      return;
    }
    const ids = new Set(selected.map((n) => n.id));
    setNodes((nds) => nds.filter((n) => !ids.has(n.id)));
    setEdges((eds) => eds.filter((e) => !ids.has(e.source) && !ids.has(e.target)));
    setTimeout(() => reactFlowInstance.fitView({ padding: 0.2 }), 100);
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const validateWorkflow = (): { valid: boolean; message: string } => {
    if (nodes.length === 0) return { valid: false, message: "Add at least one node" };

    const trigger = nodes.find((n) => n.type === "trigger");
    if (!trigger) return { valid: false, message: "Workflow must have a trigger node" };

    if (!trigger.data?.sourceUrl?.startsWith("https://"))
      return { valid: false, message: "Trigger must have a valid HTTPS URL" };

    // Every node must be reachable from the trigger
    const connected = new Set<string>([trigger.id]);
    let prev = 0;
    while (prev !== connected.size) {
      prev = connected.size;
      edges.forEach((e) => { if (connected.has(e.source)) connected.add(e.target); });
    }
    const unreachable = nodes.filter((n) => !connected.has(n.id));
    if (unreachable.length > 0)
      return { valid: false, message: `${unreachable.length} node(s) not connected to the workflow` };

    const hasTerminal = nodes.some((n) => TERMINAL_NODE_TYPES.includes(n.type as NodeType));
    if (!hasTerminal)
      return { valid: false, message: "Add at least one notification node (Email, Slack, or GitHub Issue)" };

    for (const node of nodes.filter((n) => TERMINAL_NODE_TYPES.includes(n.type as NodeType))) {
      if (node.type === "email" && !node.data?.config?.email)
        return { valid: false, message: "Email node needs a recipient address" };
      if (node.type === "github-issue" && !node.data?.config?.repo)
        return { valid: false, message: "GitHub Issue node needs a repository" };
      if (node.type === "slack" && !node.data?.config?.channel)
        return { valid: false, message: "Slack node needs a channel" };
    }

    return { valid: true, message: "" };
  };

  const validation = validateWorkflow();

  // ── Save ──────────────────────────────────────────────────────────────────

  const saveWorkflow = async () => {
    if (!workflow) return;
    const v = validateWorkflow();
    if (!v.valid) { toast.error(v.message); return; }

    setIsSaving(true);
    try {
      const updated: Workflow = {
        ...workflow,
        updatedAt: new Date().toISOString(),
        nodes: nodes as WorkflowNodeType[],
        edges: edges as Edge[],
      };
      await updateWorkflow(updated, user?.username);
      setWorkflow(updated);
      setIsDirty(false);
      toast.success("Workflow saved");
    } catch {
      // store handles toast
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white dark:bg-zinc-950">

      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-4 h-13 border-b border-zinc-200 dark:border-zinc-800 flex-shrink-0" style={{ height: 52 }}>
        {/* Left: back + name */}
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/workflow")} className="gap-1.5 flex-shrink-0 h-8 px-2">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Back</span>
          </Button>
          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700 flex-shrink-0" />
          <p className="text-sm font-semibold truncate text-zinc-800 dark:text-zinc-100">
            {workflow?.name || "Workflow Builder"}
          </p>
          {isDirty && (
            <span className="text-xs text-zinc-400 flex-shrink-0">• Unsaved</span>
          )}
        </div>

        {/* Right: delete + save */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Validation hint */}
          {nodes.length > 0 && (
            validation.valid
              ? <span className="hidden sm:flex items-center gap-1 text-xs text-green-600 dark:text-green-400"><CheckCircle2 className="w-3.5 h-3.5" /> Ready</span>
              : <span className="hidden sm:flex items-center gap-1 text-xs text-amber-500"><AlertCircle className="w-3.5 h-3.5" /><span className="max-w-[180px] truncate">{validation.message}</span></span>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={deleteSelectedNodes}
                  disabled={!hasSelection}
                  className={`h-8 w-8 transition-colors ${
                    hasSelection
                      ? "border-red-300 text-red-500 hover:bg-red-50 hover:border-red-400 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                      : "text-zinc-300 dark:text-zinc-600"
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{hasSelection ? `Delete ${selectedNodes.length} selected node${selectedNodes.length > 1 ? "s" : ""}` : "Select a node to delete"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            size="sm"
            onClick={saveWorkflow}
            disabled={isSaving || isLoading}
            className="h-8 gap-1.5"
            title="Save (⌘S)"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </header>

      {/* ── Body: node panel + canvas ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Node panel */}
        <NodePanel
          activeDataSource={activeDataSource}
          onAddNode={addNode}
          existingTypes={existingNodeTypes}
        />

        {/* Canvas */}
        <div ref={reactFlowWrapper} className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-zinc-950/80 z-50">
              <p className="text-sm text-zinc-500">Loading workflow…</p>
            </div>
          )}
          {error && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-50">
              <div className="text-center">
                <p className="text-destructive text-sm mb-3">{error}</p>
                <Button variant="outline" size="sm" onClick={() => navigate("/dashboard/workflow")}>
                  Return to dashboard
                </Button>
              </div>
            </div>
          )}

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeDoubleClick={handleNodeDoubleClick}
            fitView
            minZoom={0.4}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
            deleteKeyCode={null}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color={theme === "dark" ? "#3f3f46" : "#e4e4e7"}
              className={theme === "dark" ? "bg-zinc-950" : "bg-zinc-50"}
            />
            <Controls showInteractive={false} className="!shadow-none !border !border-zinc-200 dark:!border-zinc-700 !rounded-lg overflow-hidden" />

            {/* Canvas empty state */}
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none gap-3">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <WorkflowIcon className="w-6 h-6 text-blue-500" />
                </div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Canvas is empty</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 text-center max-w-[240px]">
                  Click any node in the left panel to add it, then connect nodes by dragging between the handles.
                </p>
              </div>
            )}
          </ReactFlow>
        </div>
      </div>

      <NodeConfigDialog
        open={showConfigDialog}
        onOpenChange={setShowConfigDialog}
        nodeType={configNodeType || "email"}
        initialData={configNodeData}
        onSave={saveNodeConfig}
      />
    </div>
  );
};

// ── Wrapper with provider ─────────────────────────────────────────────────────

const WorkflowBuilder = () => (
  <div className="h-screen">
    <ReactFlowProvider>
      <WorkflowBuilderContent />
    </ReactFlowProvider>
  </div>
);

export default WorkflowBuilder;
