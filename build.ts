#!/usr/bin/env bun
import { $ } from "bun"
import { existsSync } from "fs"

const watch = process.argv.includes("--watch")

async function buildTailwind() {
  await $`bunx tailwindcss -i src/styles.css -o dist/styles.css ${watch ? "--watch" : ""}`.quiet()
}

async function buildJS() {
  const entrypoints = [
    "src/background/index.ts",
    "src/sidepanel/index.tsx",
    "src/content/index.ts",
  ]

  const result = await Bun.build({
    entrypoints,
    outdir: "dist",
    target: "browser",
    format: "esm",
    splitting: false,
    minify: false,
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
  })

  if (!result.success) {
    for (const log of result.logs) {
      console.error(log)
    }
    process.exit(1)
  }
  console.log("JS built:", result.outputs.map(o => o.path).join(", "))
}

async function copyPublic() {
  await $`cp -r public/* dist/`.quiet()
}

async function build() {
  await $`mkdir -p dist`.quiet()
  await Promise.all([buildJS(), buildTailwind(), copyPublic()])
  console.log("Build complete.")
}

if (watch) {
  console.log("Watch mode not fully implemented - run build once")
  await build()
} else {
  await build()
}
