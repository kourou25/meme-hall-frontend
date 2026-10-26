// src/farm/conflict-rules.ts
var LEGACY_CONFLICT_RULES = { fee: 5, toolCost: 2, maxTools: 5, prepareSeconds: 600, escrowSeconds: 86400, protectionSeconds: 28800, maxLootCents: 5e3, lootPercent: 10, dailyLossPercent: 20, attacksPerDay: 3, defensesPerDay: 2, pairCooldown: 86400, minEnrollment: 86400, uprisingSeconds: 1800, uprisingCost: 2, minAllies: 2, maxAllies: 4 };
var CONFLICT_RULES = { ...LEGACY_CONFLICT_RULES, fee: 1, toolCost: 1, prepareSeconds: 180, escrowSeconds: 3600, protectionSeconds: 7200, pairCooldown: 7200, minEnrollment: 0, uprisingSeconds: 600, uprisingCost: 1, minAllies: 1, entryStakeCents: 1e3 };
var RAID_RULES = { ...CONFLICT_RULES, prepareSeconds: 0, escrowSeconds: 900, uprisingSeconds: 120 };
var conflictBattleRules = (b) => b.resolves_at - b.starts_at === LEGACY_CONFLICT_RULES.prepareSeconds ? LEGACY_CONFLICT_RULES : b.resolves_at === b.starts_at ? RAID_RULES : CONFLICT_RULES;
function conflictChance(p) {
  const counter = { sneak: "patrol", rush: "barrier", lure: "decoy" }[p.tactic] === p.stance;
  const a = 100 + 18 * Math.sqrt(p.attack_tools), d = 100 + 18 * Math.sqrt(p.defense_tools) + 18 * p.guardian + (counter ? 22 : 0);
  return Math.max(0.15, Math.min(0.8, 0.5 + (a - d) / 220));
}
var conflictDay = (t) => Math.floor((t + 28800) / 86400);
var conflictDayStart = (t) => conflictDay(t) * 86400 - 28800;
function conflictLoot(quantity, unitCents, warehouseCents, remainingCents) {
  const cap = Math.min(CONFLICT_RULES.maxLootCents, Math.max(unitCents, Math.floor(warehouseCents / 10)), remainingCents);
  return Math.max(0, Math.min(quantity, Math.floor(cap / unitCents)));
}
function conflictRoll() {
  let n;
  do {
    n = crypto.getRandomValues(new Uint32Array(1))[0];
  } while (n >= 4294e6);
  return n % 1e6;
}
export {
  CONFLICT_RULES,
  LEGACY_CONFLICT_RULES,
  RAID_RULES,
  conflictBattleRules,
  conflictChance,
  conflictDay,
  conflictDayStart,
  conflictLoot,
  conflictRoll
};
