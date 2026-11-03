import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileComment, suggestTags, videoIdOf, videoInfoOf, watchUrl } from "../src/tags";

type Change = { file: string; comment: string; tracklist: string };

const worker = join(__dirname, "..", "assets", "capture.zsh");

function songsIn(folder: string): string[] {
  return readdirSync(folder, { recursive: true, encoding: "utf8" })
    .filter((name) => name.endsWith(".m4a"))
    .map((name) => join(folder, name))
    .sort();
}

function sourceUrlOf(file: string): string {
  const atoms = execFileSync("AtomicParsley", [file, "-t"], { encoding: "utf8" });
  return atoms.match(/\[com\.apple\.iTunes;SOURCE_URL\] contains: (\S+)/)?.[1] ?? "";
}

function plan(folder: string, out: string) {
  const changes: Change[] = [];
  for (const file of songsIn(folder)) {
    const id = videoIdOf(sourceUrlOf(file));
    if (!id) {
      console.error(`skip, no SOURCE_URL: ${file}`);
      continue;
    }
    const json = JSON.parse(execFileSync("/bin/zsh", ["-f", worker, "probe", watchUrl(id)], { encoding: "utf8" }));
    const tags = suggestTags(videoInfoOf(json, watchUrl(id)), "");
    changes.push({ file, comment: fileComment(tags), tracklist: tags.tracklist });
    console.error(`\n== ${file}\n${fileComment(tags)}`);
  }
  writeFileSync(out, JSON.stringify(changes, null, 2));
  console.error(`\n${changes.length} songs planned in ${out}`);
}

function apply(planFile: string) {
  const changes = JSON.parse(readFileSync(planFile, "utf8")) as Change[];
  for (const change of changes) {
    execFileSync("/bin/zsh", ["-f", worker, "credit", change.file, change.comment, change.tracklist]);
    console.error(`retagged ${change.file}`);
  }
}

const [mode, target, out] = process.argv.slice(2);
if (mode === "plan" && target && out) plan(target, out);
else if (mode === "apply" && target) apply(target);
else {
  console.error("usage: retag.ts plan <folder> <plan.json> | apply <plan.json>");
  process.exit(2);
}
