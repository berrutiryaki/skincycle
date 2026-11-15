import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { DAY_LABELS, formatTime, getActiveById } from '../utils/routineUtils';

export default function RoutineCard({ routine, onEdit, onDelete }) {
  const active = getActiveById(routine.activeId);

  return (
    <View style={[styles.card, routine.paused && styles.cardPaused]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{routine.productName}</Text>
          <Text style={styles.active}>{active?.name ?? 'Bilinmeyen içerik'}</Text>
        </View>
        <TouchableOpacity onPress={() => onEdit(routine)} hitSlop={10} style={{ marginRight: 14 }}>
          <Ionicons name="create-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(routine)} hitSlop={10}>
          <Ionicons name="trash-outline" size={22} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      <View style={styles.daysRow}>
        {DAY_LABELS.map((label, i) => (
          <View
            key={label}
            style={[styles.dayBadge, routine.days.includes(i) && styles.dayBadgeOn]}
          >
            <Text
              style={[styles.dayText, routine.days.includes(i) && styles.dayTextOn]}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.timeRow}>
        <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
        <Text style={styles.time}>{formatTime(routine.hour, routine.minute)}</Text>
        {routine.paused && (
          <View style={styles.pausedBadge}>
            <Text style={styles.pausedText}>SOS: Duraklatıldı</Text>
          </View>
        )}
      </View>

      {!!routine.note && <Text style={styles.note}>📝 {routine.note}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
  },
  cardPaused: { opacity: 0.6 },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  name: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  active: { fontSize: 13, color: COLORS.primary, marginTop: 2 },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
  dayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    marginRight: 6,
    marginBottom: 4,
  },
  dayBadgeOn: { backgroundColor: COLORS.primary },
  dayText: { fontSize: 12, color: COLORS.textSecondary },
  dayTextOn: { color: '#FFFFFF', fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  time: { marginLeft: 6, fontSize: 14, fontWeight: '600', color: COLORS.text },
  pausedBadge: {
    marginLeft: 10,
    backgroundColor: COLORS.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  pausedText: { fontSize: 11, color: COLORS.warning, fontWeight: '600' },
  note: { marginTop: 8, fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
});
