export const normalizeCode = (code: string): string =>
  code
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line, i, arr) => {
      if (line.trim() === "") {
        const prev = arr[i - 1]?.trim() ?? "";
        return prev !== "";
      }
      return true;
    })
    .join("\n")
    .trim();
