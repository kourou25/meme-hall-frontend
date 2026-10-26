// src/shared/title-collection.ts
var TITLE_MAX_LEVEL = 5200;
var TITLE_PITY = 60;
var TITLE_STAGES = [1, 10, 50, 100, 300, 800, 1600, 2600, 4e3, 5200];
var TITLE_STAGE_NAMES = ["\u521D\u9047", "\u840C\u52A8", "\u7075\u5DE7", "\u5171\u9E23", "\u8DC3\u8FC1", "\u5DE1\u6E38", "\u661F\u8F89", "\u5E7B\u5883", "\u76DB\u5178", "\u6C38\u6052"];
var titleStage = (level) => Math.max(1, TITLE_STAGES.filter((n) => n <= Math.min(TITLE_MAX_LEVEL, level)).length);
var CHICKENGUN_MIN_SIZE = 24;
var CHICKENGUN_MAX_SIZE = 60;
var chickengunSizeLimit = (level) => [30, 32, 36, 40, 44, 48, 51, 54, 57, 60][titleStage(level) - 1];
function chickengunSize(level, requested, random = false, seed = "preview") {
  const cap = chickengunSizeLimit(level), value = Number(requested);
  const size = Number.isFinite(value) && value > 0 ? Math.max(CHICKENGUN_MIN_SIZE, Math.min(cap, Math.round(value))) : [30, 32, 34, 36, 40, 44, 48, 50, 52, 54][titleStage(level) - 1];
  if (!random) return size;
  let hash = 2166136261;
  for (const c of String(seed)) {
    hash ^= c.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return CHICKENGUN_MIN_SIZE + (hash >>> 0) % (size - CHICKENGUN_MIN_SIZE + 1);
}
var titleChance = (finger) => 10 + Math.max(0, Math.min(5, Math.trunc(finger))) * 3;
var rows = [
  ["oldfarmer", "\u8001\u519C\u6C11", "\u4E00\u7566\u571F\u5730\uFF0C\u4E00\u6BB5\u76F8\u805A\uFF1B\u7530\u56ED\u6682\u522B\uFF0C\u6536\u83B7\u957F\u5B58", "sprout", "#9b7334", "#b8cf91", "SSR"],
  ["newcomer", "\u521D\u89C1\u6B22\u6B22", "\u5E26\u7740\u597D\u5947\uFF0C\u5F00\u542F\u65B0\u7684\u6545\u4E8B", "sprout", "#659d83", "#f1ce86", "normal"],
  ["mona", "\u83AB\u5948\u4E4B\u738B", "\u7761\u83B2\u4E0E\u6E56\u5149\uFF0C\u753B\u4E2D\u6F2B\u6E38", "lotus", "#5e9b92", "#d8a4ca", "normal"],
  ["lace", "\u591C\u7ED2\u857E\u4E1D", "\u7D2B\u591C\u5929\u9E45\u4E0E\u7EC6\u7ED2\u82B1\u7EB9", "swan", "#655790", "#dba6c1", "SSR"],
  ["giant", "\u51E0\u628A\u5927\u8549", "\u5927\u9999\u8549\u961F\u957F\uFF0C\u6C14\u52BF\u548C\u5FEB\u4E50\u90FD\u62C9\u6EE1", "banana", "#d9a92f", "#4c8ba2", "normal"],
  ["worship", "\u5BC4\u5427\u51E0\u62DC", "\u8BA4\u771F\u63A5\u6897\uFF0C\u8654\u8BDA\u62DC\u8549", "banana", "#a57744", "#e0c46c", "normal"],
  ["muscle", "\u7B4B\u8089\u6B22\u6B22", "\u5143\u6C14\u62F3\u5957\u4E0E\u67D4\u8F6F\u732B\u722A", "paw", "#c17857", "#efd77a", "normal"],
  ["deepseek", "\u9CB8\u9C7C\u5A18", "\u6DF1\u6D77\u91CC\u7684\u84DD\u8272\u5FC3\u52A8", "whale", "#488caf", "#b6dcec", "normal"],
  ["deepseekupgrade", "\u9CB8\u6F9C\u5973\u4EC6", "\u9CB8\u84DD\u6C34\u7EB9\u91CC\u7684\u6E29\u67D4\u5B88\u5019", "whale", "#486dad", "#bda9dc", "SSR"],
  ["maid", "\u9CB8\u7720\u5973\u4EC6", "\u6DF1\u84DD\u88D9\u6446\u91CC\u7684\u6E29\u67D4\u966A\u4F34", "whale", "#497ca7", "#accee2", "SSR"],
  ["whalepunch", "\u9CB8\u62F3\u51FA\u51FB", "\u84DD\u8272\u7535\u5149\u91CC\u7684\u5143\u6C14\u4E00\u62F3", "bolt", "#4c8ebc", "#f1cc68", "SSR"],
  ["nightdevil", "\u591C\u5BB4\u5C0F\u6076\u9B54", "\u73AB\u7470\u4E0E\u591C\u8272\u91CC\u7684\u4FCF\u76AE\u5FC3\u52A8", "imp", "#9a547e", "#e8b0b3", "SSR"],
  ["whalebuddy", "\u9CB8\u4F34", "\u5C0F\u9CB8\u4E00\u8DEF\u540C\u884C\uFF0C\u7EC8\u6709\u661F\u6D77\u5DE1\u6E38", "whale", "#368bad", "#b1daef", "normal"],
  ["gpt", "GPT\u9F99\u59EC", "\u7D2B\u661F\u767D\u9F99\u7684\u7075\u611F\u76F8\u4F34", "dragon", "#8864b3", "#c7dcb7", "SSR"],
  ["claude", "Claude\u82B1\u59EC", "\u6A58\u82B1\u76DB\u5F00\u7684\u6E29\u6696\u65F6\u523B", "flower", "#b9824e", "#efcfa1", "SSR"],
  ["gemini", "Gemini\u661F\u55B5", "\u53CC\u661F\u95EA\u70C1\u7684\u5C0F\u5B87\u5B99", "star", "#8571bd", "#99c9da", "SSR"],
  ["whitedragon", "\u767D\u9F99\u7EEE\u59EC", "\u94F6\u53D1\u4E0E\u7EEE\u82B1\u7684\u4F18\u96C5\u76F8\u9022", "dragon", "#698aa0", "#d8cbe9", "SSR"],
  ["rascal", "\u7EAF\u574F\u86CB", "\u5077\u8D70\u997C\u5E72\u7684\u5C0F\u6076\u9B54\uFF0C\u574F\u5F97\u5F88\u53EF\u7231", "imp", "#8461b1", "#f0b278", "normal"],
  ["weirdo", "\u5927\u53D8\u6001", "\u8868\u60C5\u5931\u63A7\u7684\u602A\u8DA3\u5E03\u5076\uFF0C\u4E13\u95E8\u5236\u9020\u7B11\u573A", "mask", "#c16d90", "#8cc4ad", "normal"],
  ["blacksilk", "\u9ED1\u4E1D\u591C\u7FBD", "\u9ED1\u5929\u9E45\u7684\u94F6\u7EBF\u4E0E\u591C\u8272\u793C\u670D", "swan", "#536586", "#e6b1c7", "SSR"],
  ["loli", "\u841D\u8389\u7CD6\u661F", "\u5168\u7136\u7AE5\u8BDD\u7684\u6708\u5154\u9B54\u6CD5\u5E08\u4E0E\u7CD6\u7EB8\u661F\u661F", "bunny", "#a083ba", "#c3dbe9", "normal"],
  ["electric", "\u7535\u5149\u56E2\u5B50", "\u5706\u6EDA\u6EDA\u7684\u5C0F\u7535\u7075\uFF0C\u8D8A\u719F\u6089\u8D8A\u6D3B\u6CFC", "bolt", "#4a91aa", "#eed47b", "normal"],
  ["railcannon", "\u4E73\u6C41\u70AE", "\u94F6\u767D\u7F0E\u5E26\u84C4\u80FD\uFF0C\u6EE1\u7EA7\u70B9\u4EAE\u84DD\u767D\u661F\u5149", "bolt", "#407eac", "#d6e8eb", "SSR"],
  ["chickengun", "\u9E21\u5173\u67AA", "\u602A\u8DA3\u53CC\u6301\uFF0C\u539F\u7248\u52A8\u56FE\u7684\u8FDE\u5C04\u8282\u594F", "bolt", "#ad686f", "#f3d4b7", "SSR"],
  ["blade", "\u5200\xB7\u8D64\u72D0", "\u8D64\u72D0\u5B88\u5200\uFF0C\u843D\u53F6\u968F\u884C", "blade", "#b47054", "#d9bc7d", "normal"],
  ["spear", "\u67AA\xB7\u9752\u96BC", "\u957F\u98CE\u7A7F\u4E91\uFF0C\u9752\u96BC\u632F\u7FC5", "spear", "#4d8a8c", "#b6cdbb", "normal"],
  ["sword", "\u5251\xB7\u6D41\u8424", "\u94F6\u5251\u4E0E\u6D41\u8424\uFF0C\u5171\u8D74\u957F\u591C", "sword", "#6d8eb4", "#c8d5ee", "SSR"],
  ["halberd", "\u621F\xB7\u7384\u9E7F", "\u5C71\u7EB9\u53E4\u621F\uFF0C\u7384\u9E7F\u5B88\u671B", "halberd", "#9c794c", "#bfd0b5", "SSR"],
  ["snow", "\u96EA\xB7\u7ED2\u7ED2", "\u4E00\u56E2\u4F1A\u6253\u76F9\u7684\u96EA\uFF0C\u8F7B\u8F7B\u843D\u4E0B", "snow", "#709db4", "#e0e7f2", "normal"],
  ["moon", "\u6708\xB7\u94F6\u5154", "\u62B1\u7740\u6708\u4EAE\u6253\u76F9\u7684\u5C0F\u94F6\u5154", "moon", "#9381b4", "#e4d2a7", "SSR"],
  ["wind", "\u98CE\xB7\u7EB8\u9E22", "\u98CE\u5E26\u7740\u7EB8\u9E22\u7ED5\u8FC7\u4F60\u7684\u80A9\u5934", "wind", "#5f9e8e", "#d6e2ac", "normal"],
  ["flower", "\u82B1\xB7\u6625\u4FE1", "\u82B1\u82DE\u9192\u6765\uFF0C\u5BC4\u51FA\u4E00\u5C01\u6625\u5929", "flower", "#bd789b", "#afd0a1", "normal"],
  ["sun", "\u65E5\xB7\u6696\u6A58", "\u592A\u9633\u5C0F\u72EE\u5B50\uFF0C\u6696\u610F\u6251\u9762", "sun", "#c8943d", "#f2ca97", "normal"],
  ["star", "\u661F\xB7\u8BB8\u613F", "\u628A\u661F\u661F\u63E3\u8FDB\u53E3\u888B\uFF0C\u966A\u4F60\u95EA\u5149", "star", "#7c7eb9", "#ecd39a", "SSR"],
  ["cloud", "\u4E91\xB7\u8F6F\u7EF5", "\u4E91\u6735\u7F8A\u7684\u6162\u60A0\u60A0\u5929\u7A7A\u65C5\u884C", "cloud", "#7dabb4", "#d9c9e8", "normal"]
];
var TITLE_COLLECTION = rows.map(([id, name, mood, motif, color, accent, rarity]) => ({ id, name, mood, motif, color, accent, rarity, enabled: true, newcomer: id === "newcomer", commemorative: id === "oldfarmer", limited: ["blacksilk", "sword", "halberd", "moon", "star", "nightdevil", "railcannon", "chickengun"].includes(id) }));
var collectionTitle = (id) => TITLE_COLLECTION.find((t) => t.id === id);
function titleExhibit(t) {
  const period = Math.floor((t + 28800) / (14 * 86400)), launch = Math.floor((Date.parse("2026-10-24T00:00:00+08:00") / 1e3 + 28800) / (14 * 86400)), launchTitles = ["railcannon", "chickengun"], limited = TITLE_COLLECTION.filter((x) => x.limited && (period !== launch || !launchTitles.includes(x.id))), start = period * 14 * 86400 - 28800;
  return { id: period, starts_at: start, ends_at: start + 14 * 86400, titles: [limited[period % limited.length].id, limited[(period + 1) % limited.length].id, ...period === launch ? [...launchTitles] : []] };
}
var titleAvailable = (id, t) => !collectionTitle(id)?.limited || titleExhibit(t).titles.includes(id);
export {
  CHICKENGUN_MAX_SIZE,
  CHICKENGUN_MIN_SIZE,
  TITLE_COLLECTION,
  TITLE_MAX_LEVEL,
  TITLE_PITY,
  TITLE_STAGES,
  TITLE_STAGE_NAMES,
  chickengunSize,
  chickengunSizeLimit,
  collectionTitle,
  titleAvailable,
  titleChance,
  titleExhibit,
  titleStage
};
