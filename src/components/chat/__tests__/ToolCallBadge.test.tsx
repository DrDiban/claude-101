import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge, getToolCallLabel } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

// --- getToolCallLabel unit tests ---

test("getToolCallLabel: str_replace_editor create returns Creating filename", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "create", path: "/App.jsx" })).toBe("Creating App.jsx");
});

test("getToolCallLabel: str_replace_editor str_replace returns Editing filename", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "str_replace", path: "/src/Button.tsx" })).toBe("Editing Button.tsx");
});

test("getToolCallLabel: str_replace_editor insert returns Editing filename", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "insert", path: "/components/Card.tsx" })).toBe("Editing Card.tsx");
});

test("getToolCallLabel: str_replace_editor view returns Reading filename", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "view", path: "/App.jsx" })).toBe("Reading App.jsx");
});

test("getToolCallLabel: str_replace_editor undo_edit returns Reverting filename", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "undo_edit", path: "/App.jsx" })).toBe("Reverting App.jsx");
});

test("getToolCallLabel: str_replace_editor unknown command defaults to Editing filename", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "unknown", path: "/App.jsx" })).toBe("Editing App.jsx");
});

test("getToolCallLabel: str_replace_editor missing path returns fallback string", () => {
  expect(getToolCallLabel("str_replace_editor", { command: "create" })).toBe("Creating file");
});

test("getToolCallLabel: file_manager rename returns Renaming X to Y", () => {
  expect(
    getToolCallLabel("file_manager", { command: "rename", path: "/App.jsx", new_path: "/NewApp.jsx" })
  ).toBe("Renaming App.jsx to NewApp.jsx");
});

test("getToolCallLabel: file_manager delete returns Deleting filename", () => {
  expect(getToolCallLabel("file_manager", { command: "delete", path: "/OldFile.tsx" })).toBe("Deleting OldFile.tsx");
});

test("getToolCallLabel: unknown tool falls back to tool name", () => {
  expect(getToolCallLabel("some_other_tool", { command: "do_thing", path: "/file.ts" })).toBe("some_other_tool");
});

test("getToolCallLabel: deeply nested path extracts only filename", () => {
  expect(
    getToolCallLabel("str_replace_editor", { command: "create", path: "/src/components/ui/Button.tsx" })
  ).toBe("Creating Button.tsx");
});

// --- ToolCallBadge render tests ---

test("ToolCallBadge shows human-readable label instead of raw tool name", () => {
  render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "1",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );

  expect(screen.getByText("Creating App.jsx")).toBeDefined();
});

test("ToolCallBadge shows spinner when state is call (in-progress)", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "2",
        toolName: "str_replace_editor",
        args: { command: "str_replace", path: "/Button.tsx" },
        state: "call",
      }}
    />
  );

  expect(screen.getByText("Editing Button.tsx")).toBeDefined();
  // Spinner is a Loader2 svg with animate-spin class
  expect(container.querySelector(".animate-spin")).toBeDefined();
});

test("ToolCallBadge shows green dot when state is result", () => {
  const { container } = render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "3",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/Card.jsx" },
        state: "result",
        result: "file created",
      }}
    />
  );

  expect(screen.getByText("Creating Card.jsx")).toBeDefined();
  expect(container.querySelector(".bg-emerald-500")).toBeDefined();
  expect(container.querySelector(".animate-spin")).toBeNull();
});

test("ToolCallBadge renders file_manager delete label", () => {
  render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "4",
        toolName: "file_manager",
        args: { command: "delete", path: "/OldComponent.tsx" },
        state: "result",
        result: { success: true },
      }}
    />
  );

  expect(screen.getByText("Deleting OldComponent.tsx")).toBeDefined();
});

test("ToolCallBadge renders file_manager rename label", () => {
  render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "5",
        toolName: "file_manager",
        args: { command: "rename", path: "/App.jsx", new_path: "/Main.jsx" },
        state: "call",
      }}
    />
  );

  expect(screen.getByText("Renaming App.jsx to Main.jsx")).toBeDefined();
});

test("ToolCallBadge falls back to raw tool name for unknown tools", () => {
  render(
    <ToolCallBadge
      toolInvocation={{
        toolCallId: "6",
        toolName: "unknown_tool",
        args: {},
        state: "call",
      }}
    />
  );

  expect(screen.getByText("unknown_tool")).toBeDefined();
});
