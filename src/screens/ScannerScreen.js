import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import {
  analyzeIngredients,
  SAMPLE_INGREDIENTS,
  hasApiKey,
} from '../services/ingredientAnalyzerService';

const STATUS_STYLE = {
  Güvenli: { bg: COLORS.primaryLight, fg: COLORS.primary, icon: 'checkmark-circle' },
  'Dikkatli Kullanılmalı': { bg: COLORS.warningLight, fg: COLORS.warning, icon: 'alert-circle' },
  'Yüksek Risk': { bg: COLORS.dangerLight, fg: COLORS.danger, icon: 'warning' },
};

const levelColor = (ratio) =>
  ratio <= 0.3
    ? { bg: COLORS.primaryLight, fg: COLORS.primary }
    : ratio <= 0.6
    ? { bg: COLORS.warningLight, fg: COLORS.warning }
    : { bg: COLORS.dangerLight, fg: COLORS.danger };

function Badge({ label, bg, fg }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

function ItemCard({ item }) {
  const com = levelColor(item.comedogenic / 5);
  const saf = levelColor(item.safety / 10);
  const fun = item.fungalSafe
    ? { bg: COLORS.primaryLight, fg: COLORS.primary }
    : { bg: COLORS.dangerLight, fg: COLORS.danger };
  return (
    <View style={styles.itemCard}>
      <Text style={styles.itemName}>{item.name}</Text>
      {!!item.role && <Text style={styles.itemRole}>{item.role}</Text>}
      <View style={styles.badgeRow}>
        <Badge label={`Komedojenik ${item.comedogenic}/5`} {...com} />
        <Badge label={`Güvenlik ${item.safety}/10`} {...saf} />
        <Badge label={item.fungalSafe ? 'Fungal Akne: Uygun' : 'Fungal Akne: Riskli'} {...fun} />
      </View>
      {!!item.warning && <Text style={styles.itemWarning}>⚠️ {item.warning}</Text>}
    </View>
  );
}

export default function ScannerScreen() {
  const [mode, setMode] = useState('text'); // 'image' | 'text'
  const [text, setText] = useState('');
  const [image, setImage] = useState(null); // { uri, base64 }
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handlePicked = (res) => {
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    setImage({ uri: a.uri, base64: a.base64 });
    setMode('image');
    setResult(null);
  };

  const pickCamera = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('İzin Gerekli', 'Kamerayı kullanabilmek için izin vermelisin.');
        return;
      }
      handlePicked(
        await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          base64: true,
          quality: 0.6,
        })
      );
    } catch (e) {
      Alert.alert('Hata', 'Kamera açılamadı.');
    }
  };

  const pickGallery = async () => {
    try {
      handlePicked(
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          base64: true,
          quality: 0.6,
        })
      );
    } catch (e) {
      Alert.alert('Hata', 'Galeri açılamadı.');
    }
  };

  const showTextMode = () => {
    setMode('text');
    setResult(null);
  };

  const analyze = async () => {
    const useImage = mode === 'image' && image?.base64;
    if (!useImage && !text.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen içerik listesini yaz ya da bir fotoğraf seç.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      setResult(
        await analyzeIngredients({
          base64: useImage ? image.base64 : undefined,
          text: mode === 'text' ? text : undefined,
        })
      );
    } catch (e) {
      if (e.code === 'IMAGE_OFFLINE') {
        Alert.alert(
          'Görsel Analizi Kullanılamıyor',
          'Görsel analiz için internet ve bir Gemini API anahtarı gerekiyor. Bunun yerine içerik listesini "Metin / Örnek" bölümüne yapıştırabilir veya örnek listeyi deneyebilirsin.',
          [
            { text: 'Tamam', style: 'cancel' },
            {
              text: 'Metin Moduna Geç',
              onPress: () => {
                setMode('text');
                if (!text.trim()) setText(SAMPLE_INGREDIENTS);
              },
            },
          ]
        );
      } else {
        Alert.alert('Hata', 'Analiz sırasında bir sorun oluştu. Lütfen tekrar dene.');
      }
    } finally {
      setLoading(false);
    }
  };

  const status = result ? STATUS_STYLE[result.overallStatus] ?? STATUS_STYLE['Dikkatli Kullanılmalı'] : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.selectRow}>
        <TouchableOpacity style={styles.selectBtn} onPress={pickCamera}>
          <Ionicons name="camera-outline" size={22} color={COLORS.primary} />
          <Text style={styles.selectText}>Kamerayla Çek</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.selectBtn} onPress={pickGallery}>
          <Ionicons name="images-outline" size={22} color={COLORS.primary} />
          <Text style={styles.selectText}>Galeriden Seç</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.selectBtn, mode === 'text' && styles.selectBtnOn]}
          onPress={showTextMode}
        >
          <Ionicons name="document-text-outline" size={22} color={COLORS.primary} />
          <Text style={styles.selectText}>Metin / Örnek</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        {mode === 'image' && image ? (
          <>
            <Image source={{ uri: image.uri }} style={styles.preview} resizeMode="cover" />
            {!hasApiKey() && (
              <Text style={styles.hint}>
                Görsel analiz için API anahtarı gerekir. Anahtar yoksa metin modunu kullanabilirsin.
              </Text>
            )}
          </>
        ) : (
          <>
            <Text style={styles.cardTitle}>İçerik Listesi</Text>
            <TextInput
              style={styles.textArea}
              multiline
              placeholder="Ürün arkasındaki içerik listesini buraya yapıştır (virgülle ayrılmış)..."
              placeholderTextColor={COLORS.textSecondary}
              value={text}
              onChangeText={setText}
            />
            <TouchableOpacity style={styles.sampleBtn} onPress={() => setText(SAMPLE_INGREDIENTS)}>
              <Text style={styles.sampleText}>Örnek İçerik Listesi Doldur</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={styles.analyzeBtn} onPress={analyze} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.analyzeText}>Analiz Et</Text>
          )}
        </TouchableOpacity>
      </View>

      {result && (
        <View style={{ marginTop: 16 }}>
          {result.isOffline && (
            <View style={styles.offlineTag}>
              <Ionicons name="cloud-offline-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.offlineText}>Çevrimdışı Sözlük Modu</Text>
            </View>
          )}

          <View style={[styles.statusCard, { backgroundColor: status.bg }]}>
            <View style={styles.statusHeader}>
              <Ionicons name={status.icon} size={24} color={status.fg} />
              <Text style={[styles.statusTitle, { color: status.fg }]}>{result.overallStatus}</Text>
            </View>
            <Text style={styles.summary}>{result.summary}</Text>
          </View>

          <View style={styles.trapCard}>
            <Text style={styles.trapTitle}>🎯 Pazarlama Tuzağı Analizi</Text>
            <Text style={styles.trapText}>{result.marketingTrap}</Text>
          </View>

          <Text style={styles.sectionTitle}>İçerik Detayları ({result.items.length})</Text>
          {result.items.map((item, idx) => (
            <ItemCard key={`${item.name}-${idx}`} item={item} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  selectRow: { flexDirection: 'row', marginBottom: 16 },
  selectBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectBtnOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  selectText: { fontSize: 12, fontWeight: '600', color: COLORS.text, marginTop: 4 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  sampleBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
  },
  sampleText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
  preview: { width: '100%', height: 200, borderRadius: 12, backgroundColor: COLORS.background },
  hint: { marginTop: 10, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  analyzeBtn: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  analyzeText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  offlineTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 10,
  },
  offlineText: { marginLeft: 4, fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  statusCard: { borderRadius: 16, padding: 16 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statusTitle: { marginLeft: 8, fontSize: 18, fontWeight: '800' },
  summary: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  trapCard: {
    marginTop: 12,
    backgroundColor: COLORS.warningLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.warning,
    padding: 16,
  },
  trapTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  trapText: { fontSize: 13, color: COLORS.text, lineHeight: 19 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 20, marginBottom: 10 },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
  },
  itemName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  itemRole: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, marginRight: 6, marginBottom: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  itemWarning: { marginTop: 6, fontSize: 12, color: COLORS.danger, lineHeight: 17 },
});
