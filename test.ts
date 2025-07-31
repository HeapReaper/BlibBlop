function getXpForNextLevel(level: number): number {
  if (level == 0) return 50;
  return 50 * level * level;
}

console.log(getXpForNextLevel(2))