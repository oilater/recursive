function insertionSort(arr) {
  const n = arr.length;
  for (let i = 1; i < n; i++) {
    const current = arr[i];
    let pos = i - 1;
    while (pos >= 0 && arr[pos] > current) {
      arr[pos + 1] = arr[pos];
      pos--;
    }
    arr[pos + 1] = current;
  }
  return arr;
}