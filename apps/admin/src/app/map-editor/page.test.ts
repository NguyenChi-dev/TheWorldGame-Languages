import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ requireSection: vi.fn() }));
vi.mock("@/components/map-editor/editor-loader", () => ({ EditorLoader: () => null }));
import { requireSection } from "@/lib/auth";
import MapEditorPage from "./page";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
describe("editor access", () => {
  it("uses the local draft in development without querying Supabase", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const page = await MapEditorPage();
    expect(requireSection).not.toHaveBeenCalled();
    expect(page.props.storageKey).toBe("lw.map-editor.v1:local");
  });
  it("requires lands permissions in production and keeps per-user storage", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.mocked(requireSection).mockResolvedValue({
      userId: "staff-id",
      email: null,
      role: "editor",
      aal: "aal2",
      mfaRequired: true,
    });
    const page = await MapEditorPage();
    expect(requireSection).toHaveBeenCalledWith("lands");
    expect(page.props.storageKey).toBe("lw.map-editor.v1:staff-id");
  });
  it("does not render the editor if the production guard rejects access", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.mocked(requireSection).mockRejectedValue(new Error("REDIRECT /login"));
    await expect(MapEditorPage()).rejects.toThrow("REDIRECT /login");
  });
});
