import { showHUD } from "@raycast/api";
import { readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { jobsFolder } from "./worker";

export default async function Command() {
  const files = readdirSync(jobsFolder).filter((name) => name.endsWith(".result"));
  const lines = files.map((name) => readFileSync(join(jobsFolder, name), "utf8").trim());
  files.forEach((name) => rmSync(join(jobsFolder, name)));
  if (lines.length) await showHUD(lines.join("\n"));
}
