// src/shared/fishing-game.ts
var FISHING_GAME = { step: 50, maxDuration: 24e3, maxMoves: 64, minMoveGap: 80 };
function fishingFrame(fight, moves, duration) {
  let tension = 28, progress = 8, high = 0, low = 0, move = 0, held = false, status = "playing", reason = "", elapsed = 0, force = 0;
  const end = Math.min(FISHING_GAME.maxDuration, Math.max(0, duration)), rod = Math.max(0, Math.min(3, fight.rod));
  for (let ms = 0; ms < end; ms += FISHING_GAME.step) {
    while (move < moves.length && moves[move][0] <= ms) {
      held = moves[move][1] === 1;
      move++;
    }
    force = fight.pattern[Math.min(fight.pattern.length - 1, Math.floor(ms / 2e3))] ?? 0.5;
    const dt = Math.min(FISHING_GAME.step, end - ms) / 1e3;
    tension = Math.max(0, Math.min(110, tension + (held ? 15 + force * 15 - rod * 1.8 - (fight.line ? 3 : 0) : -27) * dt));
    progress = Math.max(0, Math.min(100, progress + (held ? 14 - force * 3 + rod * 0.5 : -force * 0.75) * dt));
    high = tension >= 96 ? high + dt : 0;
    low = tension <= 4 ? low + dt : 0;
    elapsed = ms + dt * 1e3;
    if (high >= 0.65 || low >= 2) {
      status = "escaped";
      reason = high >= 0.65 ? "\u9C7C\u7EBF\u7EF7\u65AD\u4E86" : "\u9C7C\u7EBF\u592A\u677E\uFF0C\u9C7C\u513F\u8131\u94A9";
      break;
    }
    if (progress >= 100) {
      status = "landed";
      break;
    }
  }
  if (status === "playing" && elapsed >= FISHING_GAME.maxDuration) {
    status = "escaped";
    reason = "\u9C7C\u513F\u6323\u8131\u4E86\uFF0C\u8BF7\u518D\u8BD5\u4E00\u7AFF";
  }
  return { tension, progress, force, held, status, reason, elapsed };
}
function validateFishingMoves(raw, duration) {
  if (!Number.isSafeInteger(duration) || Number(duration) < 0 || Number(duration) > FISHING_GAME.maxDuration) throw Error("\u905B\u9C7C\u65F6\u957F\u65E0\u6548");
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > FISHING_GAME.maxMoves) throw Error("\u905B\u9C7C\u64CD\u4F5C\u8BB0\u5F55\u65E0\u6548");
  let previous = -FISHING_GAME.minMoveGap, value = -1;
  for (const entry of raw) {
    if (!Array.isArray(entry) || entry.length !== 2 || !Number.isSafeInteger(entry[0]) || entry[0] < 0 || entry[0] > Number(duration) || entry[0] - previous < FISHING_GAME.minMoveGap || ![0, 1].includes(entry[1]) || entry[1] === value) throw Error("\u905B\u9C7C\u64CD\u4F5C\u987A\u5E8F\u65E0\u6548");
    previous = entry[0];
    value = entry[1];
  }
  if (raw[0][0] !== 0 || raw[0][1] !== 1) throw Error("\u8BF7\u4ECE\u63D0\u7AFF\u5F00\u59CB\u8BB0\u5F55\u64CD\u4F5C");
}
export {
  FISHING_GAME,
  fishingFrame,
  validateFishingMoves
};
