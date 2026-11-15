import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Switch,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../theme';
import { getRoutines, saveRoutines, getSosMode, saveSosMode } from '../services/storageService';
import {
  scheduleRoutineNotifications,
  cancelNotifications,
  applySosMode,
} from '../services/notificationService';
import { findConflicts } from '../utils/routineUtils';
import RoutineCard from '../components/RoutineCard';
import AddRoutineModal from '../components/AddRoutineModal';

export default function RoutineScreen() {
  const [routines, setRoutines] = useState([]);
  const [sosActive, setSosActive] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        setRoutines(await getRoutines());
        setSosActive(await getSosMode());
      })();
    }, [])
  );

  const persist = async (next) => {
    setRoutines(next);
    await saveRoutines(next);
  };

  const toggleSos = async (value) => {
    setSosActive(value);
    await saveSosMode(value);
    const updated = await applySosMode(routines, value);
    await persist(updated);
  };

  const saveRoutine = async (data) => {
    const sosPaused = sosActive && data.category === 'active';

    if (editingRoutine) {
      await cancelNotifications(editingRoutine.notificationIds);
      const updated = {
        ...editingRoutine,
        ...data,
        paused: sosPaused,
        notificationIds: [],
      };
      if (!sosPaused) updated.notificationIds = await scheduleRoutineNotifications(updated);
      await persist(routines.map((r) => (r.id === updated.id ? updated : r)));
    } else {
      const routine = {
        ...data,
        id: Date.now().toString(),
        paused: sosPaused,
        notificationIds: [],
      };
      if (!sosPaused) routine.notificationIds = await scheduleRoutineNotifications(routine);
      await persist([...routines, routine]);
    }
    closeModal();
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingRoutine(null);
  };

  const openEdit = (routine) => {
    setEditingRoutine(routine);
    setModalVisible(true);
  };

  const handleSubmit = (data) => {
    const conflicts = findConflicts(data, routines, editingRoutine?.id ?? null);
    if (conflicts.length === 0) {
      saveRoutine(data);
      return;
    }
    Alert.alert(
      '⚠️ İçerik Çakışması',
      `Aynı güne çakışan aktifler ekleniyor:\n\n${conflicts
        .map((c) => `• ${c.message}`)
        .join('\n')}\n\nBu kombinasyon cildini tahriş edebilir. Yine de kaydetmek istiyor musun?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Yine de Kaydet', style: 'destructive', onPress: () => saveRoutine(data) },
      ]
    );
  };

  const deleteRoutine = (routine) => {
    Alert.alert('Rutini Sil', `"${routine.productName}" silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await cancelNotifications(routine.notificationIds);
          await persist(routines.filter((r) => r.id !== routine.id));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.sosCard, sosActive && styles.sosCardOn]}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={styles.sosTitle}>SOS Bariyer Onarım Modu</Text>
          <Text style={styles.sosDesc}>
            {sosActive
              ? 'Aktif içerik hatırlatıcıları duraklatıldı. Yalnızca bariyer/temizleyici rutinleri çalışıyor.'
              : 'Cildin tahriş olduysa aç: aktif içerik bildirimleri duraklatılır.'}
          </Text>
        </View>
        <Switch
          value={sosActive}
          onValueChange={toggleSos}
          trackColor={{ false: COLORS.border, true: COLORS.danger }}
          thumbColor="#FFFFFF"
        />
      </View>

      <FlatList
        data={routines}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <RoutineCard routine={item} onEdit={openEdit} onDelete={deleteRoutine} />}
        contentContainerStyle={{ paddingBottom: 90 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Henüz rutin eklemedin. Başlamak için aşağıdaki butonu kullan.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+ Yeni Rutin Ekle</Text>
      </TouchableOpacity>

      <AddRoutineModal
        visible={modalVisible}
        routine={editingRoutine}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 16 },
  sosCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
  },
  sosCardOn: { backgroundColor: COLORS.dangerLight, borderColor: COLORS.danger },
  sosTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  sosDesc: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, lineHeight: 18 },
  empty: { padding: 24, alignItems: 'center' },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  fab: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  fabText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
