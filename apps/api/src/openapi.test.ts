// Test tài liệu Swagger: khớp với route thật của app, và trang /api-docs dùng được.
import { describe, expect, it } from "vitest";
import { app, createApp } from "./app";
import { openApiDocument } from "./openapi";

const DOC_ROUTES = new Set(["GET /openapi.json", "GET /api-docs"]);

/** Route thật đăng ký trong Hono, dạng "POST /lessons/{id}/submit" (bỏ middleware và route tài liệu). */
function appRoutes() {
  return new Set(
    app.routes
      .filter((route) => route.method !== "ALL")
      .map((route) => `${route.method} ${route.path.replace(/:(\w+)/g, "{$1}")}`)
      .filter((route) => !DOC_ROUTES.has(route)),
  );
}

function documentedRoutes() {
  return new Set(
    Object.entries(openApiDocument.paths).flatMap(([path, operations]) =>
      Object.keys(operations).map((method) => `${method.toUpperCase()} ${path}`),
    ),
  );
}

describe("Tài liệu OpenAPI", () => {
  it("có đủ mọi route của app, không thừa route nào", () => {
    expect([...documentedRoutes()].sort()).toEqual([...appRoutes()].sort());
  });

  it("schema sinh từ Zod: body, tham số đường dẫn và query", () => {
    const plant = openApiDocument.paths["/farm/plant"].post as {
      requestBody: { content: { "application/json": { schema: { required: string[] } } } };
    };
    expect(plant.requestBody.content["application/json"].schema.required).toEqual(["plotId", "seedId"]);

    const submit = openApiDocument.paths["/lessons/{id}/submit"].post as {
      parameters: { name: string; in: string }[];
    };
    expect(submit.parameters).toContainEqual(expect.objectContaining({ name: "id", in: "path" }));

    const stats = openApiDocument.paths["/admin/stats"].get as {
      parameters: { name: string; in: string; required: boolean }[];
    };
    // days có mặc định 7 nên không bắt buộc.
    expect(stats.parameters).toContainEqual(
      expect.objectContaining({ name: "days", in: "query", required: false }),
    );
  });

  it("route công khai không đòi token, route quản trị ghi rõ lỗi 403", () => {
    const health = openApiDocument.paths["/health"].get as { security?: unknown[] };
    expect(health.security).toEqual([]);

    const adminMe = openApiDocument.paths["/admin/me"].get as { responses: Record<string, unknown> };
    expect(Object.keys(adminMe.responses)).toEqual(expect.arrayContaining(["200", "401", "403"]));
  });
});

describe("GET /api-docs và /openapi.json", () => {
  it("trả về Swagger UI và đặc tả", async () => {
    const docs = await app.request("/api-docs");
    expect(docs.status).toBe(200);
    expect(await docs.text()).toContain("/openapi.json");

    const spec = await app.request("/openapi.json");
    expect(spec.status).toBe(200);
    expect(await spec.json()).toMatchObject({ openapi: "3.1.0", info: { title: "Language World API" } });
  });

  it("Swagger UI (cùng origin với API) gọi được API, trang lạ vẫn bị chặn", async () => {
    const self = await app.request("http://localhost:4000/health", {
      headers: { Origin: "http://localhost:4000" },
    });
    expect(self.status).toBe(200);

    const stranger = await app.request("http://localhost:4000/health", {
      headers: { Origin: "https://trang-la.example" },
    });
    expect(stranger.status).toBe(403);
  });

  it("tắt bằng API_DOCS=false", async () => {
    const noDocs = createApp(["http://localhost:3000"], false);
    expect((await noDocs.request("/api-docs")).status).toBe(404);
    expect((await noDocs.request("/openapi.json")).status).toBe(404);
  });
});
