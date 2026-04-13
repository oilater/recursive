import { transform } from "sucrase";

export function stripTypeScript(code: string): string {
  try {
    return transform(code, { transforms: ["typescript"], disableESTransforms: true }).code;
  } catch {
    return code;
  }
}
