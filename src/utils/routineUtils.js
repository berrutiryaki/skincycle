import db from '../data/ingredientsDb.json';

export const DAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
export const DAY_FULL_NAMES = [
  'Pazartesi',
  'Salı',
  'Çarşamba',
  'Perşembe',
  'Cuma',
  'Cumartesi',
  'Pazar',
];

export const getActiveById = (id) => db.actives.find((a) => a.id === id);

export const formatTime = (hour, minute) =>
  `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

/**
 * Yeni rutinin, aynı güne denk gelen mevcut rutinlerle çakışmalarını bulur.
 * [{ dayIndex, with: 'Retinol / Retinal (Ürün adı)' }] döner.
 */
export const findConflicts = (newRoutine, existingRoutines, ignoreId = null) => {
  const newActive = getActiveById(newRoutine.activeId);
  if (!newActive || newActive.conflictsWith.length === 0) return [];

  const conflicts = [];
  for (const r of existingRoutines) {
    if (r.id === ignoreId) continue;
    if (!newActive.conflictsWith.includes(r.activeId)) continue;
    const other = getActiveById(r.activeId);
    for (const day of r.days) {
      if (newRoutine.days.includes(day)) {
        conflicts.push({
          dayIndex: day,
          message: `${DAY_FULL_NAMES[day]}: ${other?.name ?? r.activeId} (${r.productName})`,
        });
      }
    }
  }
  return conflicts.sort((a, b) => a.dayIndex - b.dayIndex);
};
