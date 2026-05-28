import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { GitBranch } from "lucide-react";

const SEVERITY_LABELS: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
};

const FilterNode = memo(({ data, isConnectable }: NodeProps) => {
  const threshold = data?.config?.severity ?? "high";
  const operator  = data?.config?.operator  ?? "gte";

  const opLabel = operator === "gte" ? "≥" : operator === "lte" ? "≤" : "=";
  const conditionLabel = `Severity ${opLabel} ${SEVERITY_LABELS[threshold] ?? threshold}`;

  return (
    <div className="relative flex flex-col items-center justify-center backdrop-blur-sm px-4 pt-4 pb-5 rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 shadow-md min-w-[190px] transition-all duration-300">

      {/* Icon */}
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500 mb-2 text-white">
        <GitBranch className="w-5 h-5" />
      </div>

      {/* Label */}
      <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Condition</div>
      <div className="text-xs text-amber-700 dark:text-amber-300 mt-1 font-medium">{conditionLabel}</div>

      {/* Branch labels */}
      <div className="mt-3 flex flex-col gap-1 w-full text-xs">
        <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
          <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
          <span>Match → continue</span>
        </div>
        <div className="flex items-center gap-1.5 text-red-500 dark:text-red-400">
          <span className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
          <span>No match → skip</span>
        </div>
      </div>

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        isConnectable={isConnectable}
        className="!bg-amber-400 !border-amber-600 !w-3 !h-3"
      />

      {/* Match output (upper-right) */}
      <Handle
        type="source"
        position={Position.Right}
        id="match"
        style={{ top: "38%" }}
        isConnectable={isConnectable}
        className="!bg-green-500 !border-green-600 !w-3 !h-3"
      />

      {/* No-match output (lower-right) */}
      <Handle
        type="source"
        position={Position.Right}
        id="nomatch"
        style={{ top: "68%" }}
        isConnectable={isConnectable}
        className="!bg-red-500 !border-red-600 !w-3 !h-3"
      />
    </div>
  );
});

export default FilterNode;
