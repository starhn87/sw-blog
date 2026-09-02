import { createBundledHighlighter, createSingletonShorthands } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

const createHighlighter = createBundledHighlighter({
  langs: {
    bash: () => import("shiki/langs/bash.mjs"),
    css: () => import("shiki/langs/css.mjs"),
    html: () => import("shiki/langs/html.mjs"),
    js: () => import("shiki/langs/javascript.mjs"),
    json: () => import("shiki/langs/json.mjs"),
    kotlin: () => import("shiki/langs/kotlin.mjs"),
    mdx: () => import("shiki/langs/mdx.mjs"),
    objc: () => import("shiki/langs/objective-c.mjs"),
    sql: () => import("shiki/langs/sql.mjs"),
    toml: () => import("shiki/langs/toml.mjs"),
    ts: () => import("shiki/langs/typescript.mjs"),
    tsx: () => import("shiki/langs/tsx.mjs"),
    yaml: () => import("shiki/langs/yaml.mjs"),
  },
  themes: {
    "github-dark": () => import("shiki/themes/github-dark.mjs"),
    "github-light": () => import("shiki/themes/github-light.mjs"),
  },
  engine: () => createJavaScriptRegexEngine(),
});

export const { getSingletonHighlighter } = createSingletonShorthands(createHighlighter);
