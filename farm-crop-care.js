// src/shared/crop-care.ts
var cropSeconds = (plot, crop) => plot.growSeconds ?? crop.legacySeconds ?? crop.seconds;
var CROP_CARE = { chance: 0.25, appearsAt: 0.35, delay: 0.1 };
function cropMaxSeconds(seconds) {
  return seconds + Math.ceil(seconds * CROP_CARE.delay);
}
function cropMatureAt(plot, crop) {
  const seconds = cropSeconds(plot, crop);
  return plot.wateredAt === null ? Infinity : Math.max(plot.readyNotBefore ?? 0, plot.wateredAt + seconds + (plot.pestAt === void 0 ? 0 : Math.ceil(seconds * CROP_CARE.delay)));
}
function cropHasPests(plot, crop, t) {
  return plot.pestAt !== void 0 && plot.wateredAt !== null && t >= plot.pestAt && t < cropMatureAt(plot, crop);
}
function cropProgress(plot, crop, t) {
  return plot.wateredAt === null ? 0 : Math.max(0, Math.min(1, (t - plot.wateredAt) / (cropMatureAt(plot, crop) - plot.wateredAt)));
}
function clearCropPests(plot, crop, t) {
  if (plot.wateredAt !== null && plot.wateredAt + cropSeconds(plot, crop) < t) plot.readyNotBefore = t;
  delete plot.pestAt;
}
function waterCrop(plot, crop, t) {
  plot.wateredAt = t;
  plot.growSeconds ??= crop.seconds;
  if (plot.careCycle === 1 && plot.cycle && parseInt(plot.cycle.slice(0, 2), 16) < 256 * CROP_CARE.chance) plot.pestAt = t + Math.floor(plot.growSeconds * CROP_CARE.appearsAt);
}
export {
  CROP_CARE,
  clearCropPests,
  cropHasPests,
  cropMatureAt,
  cropMaxSeconds,
  cropProgress,
  cropSeconds,
  waterCrop
};
