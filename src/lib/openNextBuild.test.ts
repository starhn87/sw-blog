import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
// Exercise the pinned adapter patch rather than duplicating its implementation.
const moduleUrl = new URL("../cli/build/utils/workerd.js", pathToFileURL(require.resolve("@opennextjs/cloudflare")));
const { transformPackageJson } = await import(moduleUrl.href) as {
  transformPackageJson: (json: { name: string; exports: unknown }) => {
    transformed: { name: string; exports: unknown };
    hasBuildCondition: boolean;
  };
};

describe("OpenNext workerd package copying", () => {
  it("leaves shorthand string exports intact instead of throwing", () => {
    const pkg = { name: "unified", exports: "./index.js" };
    expect(transformPackageJson(pkg)).toEqual({ transformed: pkg, hasBuildCondition: false });
  });

  it("still resolves workerd conditions for external packages", () => {
    const exports = { ".": { workerd: "./worker.js", node: "./node.js", default: "./index.js" } };
    expect(transformPackageJson({ name: "conditional", exports })).toEqual({
      transformed: { name: "conditional", exports: { ".": { workerd: "./worker.js" } } },
      hasBuildCondition: true,
    });
    expect(exports["."].node).toBe("./node.js");
  });
});
