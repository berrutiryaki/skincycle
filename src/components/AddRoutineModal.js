import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { COLORS } from '../theme';
import db from '../data/ingredientsDb.json';
import TimePicker from './TimePicker';
import { DAY_LABELS } from '../utils/routineUtils';

const initialState = {
  productName: '',
  activeId: null,
  note: '',
  days: [],
  time: { hour: 21, minute: 0 },
};

export default function AddRoutineModal({ visible, routine, onClose, onSubmit }) {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState('');
  const isEdit = !!routine;

  // Modal açıldığında formu yeni/düzenleme durumuna göre doldur
  useEffect(() => {
    if (!visible) return;
    setError('');
    setForm(
      routine
        ? {
            productName: routine.productName,
            activeId: routine.activeId,
            note: routine.note ?? '',
            days: [...routine.days],
            time: { hour: routine.hour, minute: routine.minute },
          }
        : initialState
    );
  }, [visible, routine]);

  const close = () => {
    setForm(initialState);
    setError('');
    onClose();
  };

  const toggleDay = (i) =>
    setForm((f) => ({
      ...f,
      days: f.days.includes(i) ? f.days.filter((d) => d !== i) : [...f.days, i].sort(),
    }));

  const submit = () => {
    if (!form.productName.trim()) return setError('Lütfen ürün adını gir.');
    if (!form.activeId) return setError('Lütfen bir içerik kategorisi seç.');
    if (form.days.length === 0) return setError('En az bir gün seçmelisin.');
    setError('');
    const active = db.actives.find((a) => a.id === form.activeId);
    onSubmit({
      productName: form.productName.trim(),
      activeId: form.activeId,
      category: active.category,
      note: form.note.trim(),
      days: form.days,
      hour: form.time.hour,
      minute: form.time.minute,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <Text style={styles.title}>{isEdit ? 'Rutini Düzenle' : 'Yeni Rutin Ekle'}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Ürün Adı</Text>
            <TextInput
              style={styles.input}
              placeholder="ör. %2 Salisilik Asit Serumu"
              placeholderTextColor={COLORS.textSecondary}
              value={form.productName}
              onChangeText={(t) => setForm((f) => ({ ...f, productName: t }))}
            />

            <Text style={styles.label}>Aktif İçerik Kategorisi</Text>
            <View style={styles.wrap}>
              {db.actives.map((a) => {
                const on = form.activeId === a.id;
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => setForm((f) => ({ ...f, activeId: a.id }))}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{a.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Özel Not</Text>
            <TextInput
              style={[styles.input, styles.noteInput]}
              placeholder="ör. Kuru cilde uygula, üstüne bariyer kremi sür"
              placeholderTextColor={COLORS.textSecondary}
              multiline
              value={form.note}
              onChangeText={(t) => setForm((f) => ({ ...f, note: t }))}
            />

            <Text style={styles.label}>Haftanın Günleri</Text>
            <View style={styles.wrap}>
              {DAY_LABELS.map((d, i) => {
                const on = form.days.includes(i);
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dayChip, on && styles.chipOn]}
                    onPress={() => toggleDay(i)}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{d}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Hatırlatma Saati</Text>
            <TimePicker
              hour={form.time.hour}
              minute={form.time.minute}
              onChange={(time) => setForm((f) => ({ ...f, time }))}
            />

            {!!error && <Text style={styles.error}>{error}</Text>}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={close}>
              <Text style={styles.btnGhostText}>Vazgeç</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={submit}>
              <Text style={styles.btnPrimaryText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '92%',
  },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginTop: 14, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  noteInput: { minHeight: 70, textAlignVertical: 'top' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    marginRight: 8,
    marginBottom: 8,
  },
  dayChip: {
    width: 44,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    marginRight: 6,
    marginBottom: 8,
  },
  chipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.text },
  chipTextOn: { color: '#FFFFFF', fontWeight: '600' },
  error: { color: COLORS.danger, marginTop: 12, fontSize: 13 },
  actions: { flexDirection: 'row', marginTop: 16 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  btnGhost: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  btnGhostText: { color: COLORS.textSecondary, fontWeight: '600' },
  btnPrimary: { backgroundColor: COLORS.primary, marginLeft: 8 },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '700' },
});
