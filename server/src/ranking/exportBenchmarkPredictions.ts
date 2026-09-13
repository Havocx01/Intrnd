import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { RankProjectsRequest } from "./types.js";
import { rankProjectsWithRules, RANKER_VERSION } from "./rankingService.js";

const [, , sourceArg, outputArg] = process.argv;
if (!sourceArg || !outputArg) {
  throw new Error("Usage: tsx exportBenchmarkPredictions.ts <blinded-cases.jsonl> <predictions.jsonl>");
}

const sourcePath = resolve(sourceArg);
const outputPath = resolve(outputArg);
const cases = (await readFile(sourcePath, "utf8"))
  .split(/\r?\n/)
  .filter(Boolean)
  .map(
    (line) =>
      JSON.parse(line) as {
        eval_id: string;
        student_profile: RankProjectsRequest["student_profile"];
        available_projects: RankProjectsRequest["available_projects"];
      },
  );

const rows = cases.map((benchmarkCase) => {
  const ranking = rankProjectsWithRules({
    student_profile: benchmarkCase.student_profile,
    available_projects: benchmarkCase.available_projects,
  });
  return {
    eval_id: benchmarkCase.eval_id,
    ranker: RANKER_VERSION,
    ranked_project_ids: ranking.rankedProjects.map((project) => project.projectId),
  };
});

await writeFile(outputPath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
console.log(`wrote ${rows.length} ${RANKER_VERSION} predictions to ${outputPath}`);
