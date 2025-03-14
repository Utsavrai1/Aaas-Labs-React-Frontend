import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Panel,
  Connection,
  Edge,
  useReactFlow,
  MarkerType,
  NodeTypes,
  ReactFlowProvider,
  NodeMouseHandler,
  Node,
} from "reactflow";
import "reactflow/dist/style.css";
import { toast } from "sonner";
import { ArrowLeft, Save, Plus, Trash, X } from "lucide-react";
import { useTheme } from "@/components/shared/ThemeProvider";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import TriggerNode from "@/components/workflowbuilder/TriggerNode";
import WorkflowNode from "@/components/workflowbuilder/WorkflowNode";
import EmptyState from "@/components/dashboard/workflow/EmptyState";
import NodeConfigDialog from "@/components/workflowbuilder/NodeConfigDialog";
import { useWorkflowStore } from "@/lib/store";
import {
  DataSource,
  Workflow,
  NodeType,
  WorkflowNode as WorkflowNodeType,
} from "@/types/workflow";
import { v4 as uuidv4 } from "uuid";

import "reactflow/dist/style.css";
import useAuth from "@/hooks/useAuth";

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  gobuster: WorkflowNode,
  nmap: WorkflowNode,
  sqlmap: WorkflowNode,
  wpscan: WorkflowNode,
  "owasp-vulnerabilities": WorkflowNode,
  "flow-chart": WorkflowNode,
  email: WorkflowNode,
  "github-issue": WorkflowNode,
  slack: WorkflowNode,
};

const TERMINAL_NODE_TYPES = ["email", "github-issue", "slack"];

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

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();

  useEffect(() => {
    const loadWorkflow = async () => {
      if (id) {
        const found = workflows.find((w) => w.id === id);

        if (found) {
          setWorkflow(found);
          setActiveWorkflow(id);

          if (found.nodes.length > 0) {
            setNodes(found.nodes);
            setEdges(found.edges as Edge[]);

            const triggerNode = found.nodes.find(
              (node) => node.type === "trigger"
            );
            if (triggerNode && triggerNode.data?.dataSource) {
              setActiveDataSource(triggerNode.data.dataSource);
            }
          } else {
            addTriggerNode();
          }
        } else {
          const fetchedWorkflow = await fetchWorkflowById(id);

          if (fetchedWorkflow) {
            setWorkflow(fetchedWorkflow);
            setActiveWorkflow(id);

            if (fetchedWorkflow.nodes.length > 0) {
              setNodes(fetchedWorkflow.nodes);
              setEdges(fetchedWorkflow.edges as Edge[]);

              const triggerNode = fetchedWorkflow.nodes.find(
                (node) => node.type === "trigger"
              );
              if (triggerNode && triggerNode.data?.dataSource) {
                setActiveDataSource(triggerNode.data.dataSource);
              }
            } else {
              addTriggerNode();
            }
          } else {
            toast.error("Workflow not found");
            navigate("/");
          }
        }

        const triggerNode = found?.nodes.find(
          (node) => node.type === "trigger"
        );

        console.log(triggerNode);
      }
    };

    loadWorkflow();
  }, []);

  const addTriggerNode = useCallback(() => {
    const newNode: WorkflowNodeType = {
      id: `trigger-${uuidv4()}`,
      type: "trigger" as NodeType,
      position: { x: 250, y: 200 },
      data: { dataSource: "Domain", frequency: "2hr", sourceUrl: "" },
    };

    setNodes([newNode]);
    setActiveDataSource("Domain");
    return newNode;
  }, [setNodes, setActiveDataSource]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((node) => node.id === connection.source);
      const targetNode = nodes.find((node) => node.id === connection.target);

      if (!sourceNode || !targetNode) {
        return;
      }

      if (targetNode?.type === "trigger") {
        toast.error("Cannot connect to trigger node input");
        return;
      }

      if (TERMINAL_NODE_TYPES.includes(sourceNode.type as NodeType)) {
        toast.error("Terminal nodes cannot have outgoing connections");
        return;
      }

      const sourceHasConnection = edges.some(
        (edge) =>
          edge.source === connection.source &&
          !TERMINAL_NODE_TYPES.includes(targetNode.type as NodeType)
      );

      if (sourceHasConnection) {
        toast.error("A node can only have one outgoing connection");
        return;
      }

      const targetHasConnection = edges.some(
        (edge) => edge.target === connection.target
      );
      if (targetHasConnection) {
        toast.error("A node can only have one incoming connection");
        return;
      }

      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: "smoothstep",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          eds
        )
      );

      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2 });
      }, 100);
    },
    [setEdges, nodes, edges, reactFlowInstance]
  );

  const addNode = (type: NodeType) => {
    if (nodes.some((node) => node.type === type)) {
      toast.error(`A ${type} node already exists in this workflow`);
      return;
    }

    const triggerExists = nodes.some((node) => node.type === "trigger");
    if (!triggerExists) {
      addTriggerNode();
      toast.info("A trigger node has been added automatically");
      return;
    }

    const isNodeCompatible = checkNodeCompatibility(type, activeDataSource);
    if (!isNodeCompatible) {
      toast.error(
        `${type} is not compatible with ${activeDataSource} data source`
      );
      return;
    }

    const lastNodeX = nodes.reduce(
      (max, node) => Math.max(max, node.position.x),
      0
    );

    const newNode: WorkflowNodeType = {
      id: `${type}-${uuidv4()}`,
      type,
      position: { x: lastNodeX + 300, y: 200 },
      data: {},
    };

    setNodes((nodes) => [...nodes, newNode]);

    if (TERMINAL_NODE_TYPES.includes(type)) {
      setConfigNodeId(newNode.id);
      setConfigNodeType(type);
      setConfigNodeData({});
      setShowConfigDialog(true);
    }

    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2 });
    }, 100);
  };

  const checkNodeCompatibility = (
    nodeType: NodeType,
    dataSource: DataSource | null
  ) => {
    if (!dataSource) return false;

    if (dataSource === "Domain") {
      return [
        "gobuster",
        "nmap",
        "sqlmap",
        "wpscan",
        "email",
        "github-issue",
        "slack",
      ].includes(nodeType);
    } else if (dataSource === "GitHub") {
      return [
        "flow-chart",
        "owasp-vulnerabilities",
        "email",
        "github-issue",
        "slack",
      ].includes(nodeType);
    }

    return false;
  };

  const validateWorkflow = (): { valid: boolean; message: string } => {
    if (nodes.length === 0) {
      return { valid: false, message: "Workflow must have at least one node" };
    }

    const triggerNode = nodes.find((node) => node.type === "trigger");
    if (!triggerNode) {
      return { valid: false, message: "Workflow must have a trigger node" };
    }

    const connectedNodeIds = new Set<string>();
    connectedNodeIds.add(triggerNode.id);

    let prevSize = 0;
    while (prevSize !== connectedNodeIds.size) {
      prevSize = connectedNodeIds.size;

      edges.forEach((edge) => {
        if (connectedNodeIds.has(edge.source)) {
          connectedNodeIds.add(edge.target);
        }
      });
    }

    if (connectedNodeIds.size !== nodes.length) {
      return {
        valid: false,
        message: "All nodes must be connected to the workflow",
      };
    }

    const hasReportNode = nodes.some((node) =>
      TERMINAL_NODE_TYPES.includes(node.type as NodeType)
    );

    if (!hasReportNode) {
      return {
        valid: false,
        message:
          "Workflow must include at least one report node (Email, GitHub Issue, or Slack)",
      };
    }

    const nodesWithOutgoingConnections = new Set(
      edges.map((edge) => edge.source)
    );

    const leafNodes = nodes.filter(
      (node) =>
        !nodesWithOutgoingConnections.has(node.id) && node.type !== "trigger"
    );

    const nonTerminalLeafNodes = leafNodes.filter(
      (node) => !TERMINAL_NODE_TYPES.includes(node.type as NodeType)
    );

    if (nonTerminalLeafNodes.length > 0) {
      return {
        valid: false,
        message: `Non-terminal nodes ${nonTerminalLeafNodes
          .map((n) => n.type)
          .join(", ")} must have outgoing connections`,
      };
    }

    const terminalNodes = nodes.filter((node) =>
      TERMINAL_NODE_TYPES.includes(node.type as NodeType)
    );

    for (const node of terminalNodes) {
      if (node.type === "email" && !node.data?.config?.email) {
        return {
          valid: false,
          message: "Email node must be configured with an email address",
        };
      }
      if (node.type === "github-issue" && !node.data?.config?.repo) {
        return {
          valid: false,
          message: "GitHub Issue node must be configured with a repository",
        };
      }
      if (node.type === "slack" && !node.data?.config?.channel) {
        return {
          valid: false,
          message: "Slack node must be configured with a channel",
        };
      }
    }

    return { valid: true, message: "" };
  };

  const saveWorkflow = async () => {
    if (!workflow) return;

    const validation = validateWorkflow();
    if (!validation.valid) {
      toast.error("Cannot save workflow", {
        description: validation.message,
      });
      return;
    }

    setIsSaving(true);

    try {
      const updatedWorkflow: Workflow = {
        ...workflow,
        updatedAt: new Date().toISOString(),
        nodes: nodes as WorkflowNodeType[],
        edges: edges as Edge[],
      };

      const triggerNode = updatedWorkflow.nodes.find(
        (node) => node.type === "trigger"
      );

      if (
        !triggerNode ||
        !triggerNode.data?.sourceUrl ||
        !triggerNode.data.sourceUrl.startsWith("https://")
      ) {
        toast.error("Trigger node must have a valid HTTPS URL");
        return;
      }

      console.log(updatedWorkflow);

      await updateWorkflow(updatedWorkflow, user?.username);
      setWorkflow(updatedWorkflow);

      toast.success("Workflow saved", {
        description: "Your workflow has been saved successfully.",
      });
    } catch (error) {
    } finally {
      setIsSaving(false);
    }
  };

  const goBack = () => {
    navigate("/dashboard/workflow");
  };

  const deleteSelectedNodes = () => {
    const selectedNodes = nodes.filter((node) => node.selected);

    const triggerSelected = selectedNodes.some(
      (node) => node.type === "trigger"
    );
    if (triggerSelected) {
      toast.error("Cannot delete the trigger node");
      return;
    }

    const nodeIdsToRemove = selectedNodes.map((node) => node.id);

    setNodes((nodes) =>
      nodes.filter((node) => !nodeIdsToRemove.includes(node.id))
    );

    setEdges((edges) =>
      edges.filter(
        (edge) =>
          !nodeIdsToRemove.includes(edge.source) &&
          !nodeIdsToRemove.includes(edge.target)
      )
    );

    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2 });
    }, 100);
  };

  const clearAllNodesExceptTrigger = () => {
    const triggerNode = nodes.find((node) => node.type === "trigger");

    if (!triggerNode) {
      toast.error("No trigger node found");
      return;
    }

    setNodes([triggerNode]);
    setEdges([]);

    toast.success("Workflow cleared", {
      description: "All nodes except the trigger have been removed.",
    });

    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2 });
    }, 100);
  };

  const getAvailableNodes = (): { type: NodeType; label: string }[] => {
    if (!activeDataSource) return [];

    if (activeDataSource === "Domain") {
      return [
        { type: "gobuster", label: "Gobuster" },
        { type: "nkito", label: "Nkito" },
        { type: "nmap", label: "Nmap" },
        { type: "sqlmap", label: "SQLMap" },
        { type: "wpscan", label: "WPScan" },
        { type: "email", label: "Email" },
        { type: "github-issue", label: "GitHub Issue" },
        { type: "slack", label: "Slack" },
      ];
    } else {
      return [
        { type: "owasp-vulnerabilities", label: "Owasp vulnerabilities" },
        { type: "flow-chart", label: "Flow Chart" },
        { type: "email", label: "Email" },
        { type: "github-issue", label: "GitHub Issue" },
        { type: "slack", label: "Slack" },
      ];
    }
  };

  const openNodeConfig = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    console.log(node.type);

    if (!TERMINAL_NODE_TYPES.includes(node.type as NodeType)) {
      toast.info("Only terminal nodes can be configured");
      return;
    }

    setConfigNodeId(nodeId);
    setConfigNodeType(node.type as NodeType);
    setConfigNodeData(node.data?.config || {});
    setShowConfigDialog(true);
  };

  const handleNodeDoubleClick: NodeMouseHandler = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      const workflowNode = node as Node<WorkflowNodeType>;
      if (TERMINAL_NODE_TYPES.includes(workflowNode.type as NodeType)) {
        openNodeConfig(workflowNode.id);
      }
    },
    [openNodeConfig]
  );

  const saveNodeConfig = (configData: any) => {
    if (!configNodeId || !configNodeType) return;

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === configNodeId) {
          if (configNodeType === "trigger") {
            return {
              ...node,
              data: configData, // Direct data for trigger
            };
          } else if (TERMINAL_NODE_TYPES.includes(configNodeType)) {
            return {
              ...node,
              data: {
                config: configData, // Wrapped in config for terminal nodes
              },
            };
          } else {
            return {
              ...node,
              data: {}, // Empty data for tool nodes
            };
          }
        }
        return node;
      })
    );
  };

  return (
    <>
      <div ref={reactFlowWrapper} className="h-full w-full">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-50">
            <p className="text-lg font-medium">Loading workflow...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-50">
            <div className="text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button
                variant="outline"
                onClick={() => navigate("/dashboard/workflow")}
              >
                Return to Dashboard
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
          minZoom={0.5}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
          className="transition-all duration-300"
        >
          <Background
            className={`${theme === "dark" ? `bg-zinc-950` : `bg-white`}`}
            gap={16}
          />
          <Controls />

          <Panel
            position="top-left"
            className="ml-4 mt-4 flex items-center gap-2"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={goBack}
              className="gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>

            <h2 className="text-lg font-medium ml-2">
              {workflow?.name || "Workflow Builder"}
            </h2>
          </Panel>

          <Panel
            position="top-right"
            className="mr-4 mt-4 flex items-center gap-2"
          >
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={deleteSelectedNodes}
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete selected nodes</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={clearAllNodesExceptTrigger}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Clear all nodes except trigger</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-1.5">
                  <Plus className="w-4 h-4" />
                  Add Node
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Available Nodes</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {getAvailableNodes().map((node) => (
                    <DropdownMenuItem
                      key={node.type}
                      onClick={() => addNode(node.type)}
                    >
                      {node.label}
                    </DropdownMenuItem>
                  ))}
                  {getAvailableNodes().length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Configure a trigger first
                    </div>
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={saveWorkflow}
              className="gap-1.5"
              disabled={isSaving || isLoading}
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Workflow"}
            </Button>
          </Panel>

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <EmptyState
                title="Start building your workflow"
                description="Add a trigger node to get started"
                buttonText="Add Trigger"
                onClick={() => {
                  addTriggerNode();
                }}
              />
            </div>
          )}
        </ReactFlow>
      </div>

      <NodeConfigDialog
        open={showConfigDialog}
        onOpenChange={setShowConfigDialog}
        nodeType={configNodeType || "email"}
        initialData={configNodeData}
        onSave={saveNodeConfig}
      />
    </>
  );
};

const WorkflowBuilder = () => {
  return (
    <>
      <div className="h-screen pb-0">
        <div className="h-full w-full">
          <ReactFlowProvider>
            <WorkflowBuilderContent />
          </ReactFlowProvider>
        </div>
      </div>
    </>
  );
};

export default WorkflowBuilder;
