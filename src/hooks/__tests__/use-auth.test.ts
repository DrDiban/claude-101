import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(null);
    (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "new-project-1" });
  });

  describe("initial state", () => {
    test("isLoading starts as false", () => {
      const { result } = renderHook(() => useAuth());
      expect(result.current.isLoading).toBe(false);
    });

    test("exposes signIn and signUp functions", () => {
      const { result } = renderHook(() => useAuth());
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
    });
  });

  describe("signIn", () => {
    test("sets isLoading true during call and false after", async () => {
      let resolveFn!: (v: unknown) => void;
      (signInAction as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise((r) => (resolveFn = r))
      );

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.signIn("user@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveFn({ success: false, error: "Invalid credentials" });
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("calls signInAction with provided credentials", async () => {
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass1234");
      });

      expect(signInAction).toHaveBeenCalledWith("user@example.com", "pass1234");
    });

    test("returns the result from signInAction on failure", async () => {
      const errorResult = { success: false, error: "Invalid credentials" };
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue(errorResult);

      const { result } = renderHook(() => useAuth());
      let returned: unknown;
      await act(async () => {
        returned = await result.current.signIn("bad@example.com", "wrong");
      });

      expect(returned).toEqual(errorResult);
    });

    test("returns the result from signInAction on success", async () => {
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "proj-1" }]);

      const { result } = renderHook(() => useAuth());
      let returned: unknown;
      await act(async () => {
        returned = await result.current.signIn("user@example.com", "pass1234");
      });

      expect(returned).toEqual({ success: true });
    });

    test("does not call handlePostSignIn on failed sign in", async () => {
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "wrong");
      });

      expect(getProjects).not.toHaveBeenCalled();
      expect(createProject).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    test("resets isLoading even when signInAction throws", async () => {
      (signInAction as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass1234").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    test("sets isLoading true during call and false after", async () => {
      let resolveFn!: (v: unknown) => void;
      (signUpAction as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise((r) => (resolveFn = r))
      );

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.signUp("new@example.com", "password123");
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveFn({ success: false, error: "Email already registered" });
      });

      expect(result.current.isLoading).toBe(false);
    });

    test("calls signUpAction with provided credentials", async () => {
      (signUpAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("new@example.com", "securepass");
      });

      expect(signUpAction).toHaveBeenCalledWith("new@example.com", "securepass");
    });

    test("returns the result from signUpAction on failure", async () => {
      const errorResult = { success: false, error: "Email already registered" };
      (signUpAction as ReturnType<typeof vi.fn>).mockResolvedValue(errorResult);

      const { result } = renderHook(() => useAuth());
      let returned: unknown;
      await act(async () => {
        returned = await result.current.signUp("taken@example.com", "pass1234");
      });

      expect(returned).toEqual(errorResult);
    });

    test("does not navigate on failed sign up", async () => {
      (signUpAction as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: "Email already registered",
      });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("taken@example.com", "pass1234");
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    test("resets isLoading even when signUpAction throws", async () => {
      (signUpAction as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("user@example.com", "pass1234").catch(() => {});
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("handlePostSignIn — with anonymous work", () => {
    const anonWork = {
      messages: [{ id: "1", role: "user", content: "Hello" }],
      fileSystemData: { "/App.jsx": { type: "file", content: "<App />" } },
    };

    beforeEach(() => {
      (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(anonWork);
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "anon-project-1" });
    });

    test("creates project with anon work data", async () => {
      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass1234");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: anonWork.messages,
          data: anonWork.fileSystemData,
        })
      );
    });

    test("project name includes time info", async () => {
      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass1234");
      });

      const callArg = (createProject as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.name).toMatch(/^Design from /);
    });

    test("clears anon work after creating project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass1234");
      });

      expect(clearAnonWork).toHaveBeenCalledOnce();
    });

    test("redirects to the new anon project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass1234");
      });

      expect(mockPush).toHaveBeenCalledWith("/anon-project-1");
    });

    test("does not call getProjects when anon work exists", async () => {
      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass1234");
      });

      expect(getProjects).not.toHaveBeenCalled();
    });

    test("skips anon work branch when messages array is empty", async () => {
      (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue({
        messages: [],
        fileSystemData: {},
      });
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "existing-proj" }]);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass1234");
      });

      expect(mockPush).toHaveBeenCalledWith("/existing-proj");
    });
  });

  describe("handlePostSignIn — no anonymous work, existing projects", () => {
    beforeEach(() => {
      (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
    });

    test("redirects to most recent project when projects exist", async () => {
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: "recent-proj" },
        { id: "older-proj" },
      ]);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass1234");
      });

      expect(mockPush).toHaveBeenCalledWith("/recent-proj");
    });

    test("does not create a project when projects already exist", async () => {
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "proj-1" }]);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass1234");
      });

      expect(createProject).not.toHaveBeenCalled();
    });
  });

  describe("handlePostSignIn — no anonymous work, no existing projects", () => {
    beforeEach(() => {
      (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue(null);
      (signInAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "brand-new-proj" });
    });

    test("creates a new project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass1234");
      });

      expect(createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [],
          data: {},
        })
      );
    });

    test("new project name matches expected pattern", async () => {
      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass1234");
      });

      const callArg = (createProject as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArg.name).toMatch(/^New Design #\d+$/);
    });

    test("redirects to the newly created project", async () => {
      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "pass1234");
      });

      expect(mockPush).toHaveBeenCalledWith("/brand-new-proj");
    });
  });

  describe("signUp post-auth navigation", () => {
    test("runs handlePostSignIn after successful sign up", async () => {
      (signUpAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (getProjects as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "user-proj" }]);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("new@example.com", "securepass");
      });

      expect(mockPush).toHaveBeenCalledWith("/user-proj");
    });

    test("respects anon work during sign up flow", async () => {
      (signUpAction as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
      (getAnonWorkData as ReturnType<typeof vi.fn>).mockReturnValue({
        messages: [{ id: "m1", role: "user", content: "test" }],
        fileSystemData: { "/App.jsx": {} },
      });
      (createProject as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "anon-signup-proj" });

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("new@example.com", "securepass");
      });

      expect(clearAnonWork).toHaveBeenCalledOnce();
      expect(mockPush).toHaveBeenCalledWith("/anon-signup-proj");
    });
  });
});
