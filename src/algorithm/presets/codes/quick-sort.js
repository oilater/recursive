function quickSort(arr) {
  function partition(start, end) {
    const pivot = arr[end];
    let swapIndex = start;
    for (let current = start; current < end; current++) {
      if (arr[current] < pivot) {
        const temp = arr[swapIndex];
        arr[swapIndex] = arr[current];
        arr[current] = temp;
        swapIndex++;
      }
    }
    const temp = arr[swapIndex];
    arr[swapIndex] = arr[end];
    arr[end] = temp;
    return swapIndex;
  }

  function sort(start, end) {
    if (start >= end) return;
    const pivotIndex = partition(start, end);
    sort(start, pivotIndex - 1);
    sort(pivotIndex + 1, end);
  }

  sort(0, arr.length - 1);
  return arr;
}