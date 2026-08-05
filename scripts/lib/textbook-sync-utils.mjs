export function normalizeWord(value) {
  return value.trim().toLocaleLowerCase("en-US");
}

export function mergeExamples(existing, incoming) {
  const merged = [];
  for (const value of [existing, incoming]) {
    for (const sentence of (value ?? "").split("\n").map((item) => item.trim())) {
      if (sentence && !merged.includes(sentence)) merged.push(sentence);
    }
  }
  return merged.join("\n");
}

export function mergeNotes(existing, incoming) {
  const merged = [];
  for (const value of [existing, incoming]) {
    const note = value?.trim();
    if (note && !merged.includes(note)) merged.push(note);
  }
  return merged.join("\n");
}

export function consolidateEntries(memberships) {
  const entriesByWord = new Map();

  for (const membership of memberships) {
    const key = normalizeWord(membership.word);
    const existing = entriesByWord.get(key);
    if (!existing) {
      entriesByWord.set(key, {
        ...membership,
        units: [membership.unit],
        tags: [...membership.tags],
        sourcePages: [...membership.sourcePages],
      });
      continue;
    }

    for (const field of ["phonetic", "definition", "split"]) {
      if (existing[field] !== membership[field]) {
        throw new Error(
          `同一单词的 ${field} 不一致：${membership.word}（${existing.units.join("、")} / ${membership.unit}）`,
        );
      }
    }

    existing.units.push(membership.unit);
    existing.example = mergeExamples(existing.example, membership.example);
    existing.tags = [...new Set([...existing.tags, ...membership.tags])];
    existing.sourcePages = [
      ...new Set([...existing.sourcePages, ...membership.sourcePages]),
    ].sort((left, right) => left - right);
  }

  return [...entriesByWord.values()];
}
