import { transform } from "sucrase";

/**
 * TypeScript 타입 어노테이션을 제거하여 순수 JavaScript를 반환합니다.
 * 라인 번호가 유지됩니다.
 */
export function stripTypeScript(code: string): string {
  try {
    const result = transform(code, {
      transforms: ["typescript"],
      disableESTransforms: true,
    });
    return result.code;
  } catch {
    // TS 파싱 실패 시 원본 반환 (이미 JS일 수 있음)
    return code;
  }
}
