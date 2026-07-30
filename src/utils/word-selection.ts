export function selectFilteredWordIds(filteredIds: number[]): number[] {
  return [...new Set(filteredIds)];
}

export function deselectFilteredWordIds(
  selectedIds: number[],
  filteredIds: number[],
): number[] {
  const filteredIdSet = new Set(filteredIds);
  return selectedIds.filter((id) => !filteredIdSet.has(id));
}
