function mergeSort(arr) {
  if (arr.length <= 1) return arr;

  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));

  const result = [];
  let leftIdx = 0;
  let rightIdx = 0;

  while (leftIdx < left.length && rightIdx < right.length) {
    if (left[leftIdx] <= right[rightIdx]) {
      result.push(left[leftIdx]);
      leftIdx++;
    } else {
      result.push(right[rightIdx]);
      rightIdx++;
    }
  }

  while (leftIdx < left.length) {
    result.push(left[leftIdx]);
    leftIdx++;
  }

  while (rightIdx < right.length) {
    result.push(right[rightIdx]);
    rightIdx++;
  }

  return result;
}