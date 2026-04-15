import { readFileSync } from "fs";
import { join } from "path";

const CODES_DIR = join(process.cwd(), "src/algorithm/presets/codes");

export function loadCode(filename: string): string {
  return readFileSync(join(CODES_DIR, filename), "utf-8").trim();
}
