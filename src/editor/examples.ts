import type { CodeLanguage } from "@/engine";

export interface CodeExamples {
  recursion: string;
  closure: string;
}

export const CODE_EXAMPLES: Record<CodeLanguage, CodeExamples> = {
  javascript: {
    recursion: `function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}`,
    closure: `function add(num) {
  return function internal(addNum) {
    return addNum + num;
  };
}
const addTen = add(10);
const addFive = add(5);

const fifteen = addTen(5);
const alsoFifteen = addFive(10);

console.log(fifteen);
console.log(alsoFifteen);`,
  },
  python: {
    recursion: `def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)`,
    closure: `def add(num):
    def internal(addNum):
        return addNum + num
    return internal

addTen = add(10)
addFive = add(5)

fifteen = addTen(5)
alsoFifteen = addFive(10)

print(fifteen)
print(alsoFifteen)`,
  },
};
