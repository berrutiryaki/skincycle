import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet } from 'react-native';
import { COLORS } from '../theme';

const ITEM_H = 40;
const VISIBLE = 5;
const PAD = ITEM_H * ((VISIBLE - 1) / 2);

const pad2 = (n) => String(n).padStart(2, '0');

/** Kaydırmalı çark: seçili değer ortadaki çizgide durur. */
function Wheel({ count, value, onChange }) {
  const ref = useRef(null);
  const items = Array.from({ length: count }, (_, i) => i);

  useEffect(() => {
    ref.current?.scrollTo({ y: value * ITEM_H, animated: false });
  }, [value]);

  const onEnd = (e) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    const clamped = Math.max(0, Math.min(count - 1, idx));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <View style={styles.wheel}>
      <View pointerEvents="none" style={styles.highlight} />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        nestedScrollEnabled
        contentOffset={{ x: 0, y: value * ITEM_H }}
        contentContainerStyle={{ paddingVertical: PAD }}
        onMomentumScrollEnd={onEnd}
        onScrollEndDrag={onEnd}
      >
        {items.map((i) => (
          <View key={i} style={styles.item}>
            <Text style={[styles.itemText, i === value && styles.itemTextOn]}>{pad2(i)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/** Klavyeyle doğrudan sayı girişi. */
function NumberInput({ value, max, onChange }) {
  const [text, setText] = useState(pad2(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(pad2(value));
  }, [value, focused]);

  const handle = (t) => {
    const digits = t.replace(/[^0-9]/g, '').slice(0, 2);
    setText(digits);
    if (digits !== '') {
      const n = parseInt(digits, 10);
      if (n <= max) onChange(n);
    }
  };

  const commit = () => {
    setFocused(false);
    const n = parseInt(text, 10);
    if (Number.isNaN(n)) return setText(pad2(value));
    const clamped = Math.min(n, max);
    onChange(clamped);
    setText(pad2(clamped));
  };

  return (
    <TextInput
      style={styles.input}
      value={text}
      keyboardType="number-pad"
      maxLength={2}
      selectTextOnFocus
      onFocus={() => setFocused(true)}
      onChangeText={handle}
      onBlur={commit}
      onEndEditing={commit}
    />
  );
}

/** Harici kütüphanesiz saat/dakika seçici: kaydır veya klavyeyle yaz. */
export default function TimePicker({ hour, minute, onChange }) {
  return (
    <View>
      <View style={styles.row}>
        <NumberInput value={hour} max={23} onChange={(h) => onChange({ hour: h, minute })} />
        <Text style={styles.colon}>:</Text>
        <NumberInput value={minute} max={59} onChange={(m) => onChange({ hour, minute: m })} />
      </View>
      <View style={[styles.row, { marginTop: 8 }]}>
        <Wheel count={24} value={hour} onChange={(h) => onChange({ hour: h, minute })} />
        <Text style={styles.colon}>:</Text>
        <Wheel count={60} value={minute} onChange={(m) => onChange({ hour, minute: m })} />
      </View>
      <Text style={styles.hint}>Kaydırarak seç ya da üstteki kutulara saati yaz.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  colon: { fontSize: 28, fontWeight: '700', color: COLORS.text, marginHorizontal: 10 },
  input: {
    width: 80,
    paddingVertical: 8,
    textAlign: 'center',
    fontSize: 30,
    fontWeight: '700',
    color: COLORS.text,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  wheel: {
    width: 80,
    height: ITEM_H * VISIBLE,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: PAD,
    left: 0,
    right: 0,
    height: ITEM_H,
    backgroundColor: COLORS.primaryLight,
  },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  itemText: { fontSize: 20, color: COLORS.textSecondary },
  itemTextOn: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  hint: { textAlign: 'center', fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
});
