"use client";

import { Loader2 } from "lucide-react";
import type { ToolInvocation } from "ai";

export function getToolCallLabel(
  toolName: string,
  args: Record<string, unknown>
): string {
  const filePath = args.path as string | undefined;
  const filename = filePath ? filePath.split("/").at(-1) || filePath : "";

  if (toolName === "str_replace_editor") {
    switch (args.command) {
      case "create":
        return filename ? `Creating ${filename}` : "Creating file";
      case "str_replace":
      case "insert":
        return filename ? `Editing ${filename}` : "Editing file";
      case "view":
        return filename ? `Reading ${filename}` : "Reading file";
      case "undo_edit":
        return filename ? `Reverting ${filename}` : "Reverting file";
      default:
        return filename ? `Editing ${filename}` : "Editing file";
    }
  }

  if (toolName === "file_manager") {
    switch (args.command) {
      case "rename": {
        const newPath = args.new_path as string | undefined;
        const newFilename = newPath ? newPath.split("/").at(-1) || newPath : "";
        return `Renaming ${filename} to ${newFilename}`;
      }
      case "delete":
        return `Deleting ${filename}`;
    }
  }

  return toolName;
}

interface ToolCallBadgeProps {
  toolInvocation: ToolInvocation;
}

export function ToolCallBadge({ toolInvocation }: ToolCallBadgeProps) {
  const { toolName, args, state } = toolInvocation;
  const isDone =
    state === "result" && (toolInvocation as { result?: unknown }).result;
  const label = getToolCallLabel(toolName, args as Record<string, unknown>);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}
