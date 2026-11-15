import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const CHANNEL_ID = 'routines';

// Uygulama ön plandayken de bildirim göster ve ses çal
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Android kanalı: hata verse bile akış devam eder. */
const setupAndroidChannel = async () => {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Rutin Hatırlatıcıları',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
    });
  } catch (e) {
    console.warn('Bildirim kanalı oluşturulamadı:', e);
  }
};

/** İzin kontrolü (kanal kurulumundan bağımsız). İzin varsa true döner. */
const checkPermissions = async () => {
  let granted = false;
  try {
    const current = await Notifications.getPermissionsAsync();
    granted = !!current.granted;
  } catch (e) {
    console.warn('İzin durumu okunamadı:', e);
  }
  if (granted) return true;
  try {
    const req = await Notifications.requestPermissionsAsync();
    granted = !!req.granted;
  } catch (e) {
    console.warn('Bildirim izni istenemedi:', e);
  }
  return granted;
};

/** Kanal + izin hazırlığı. */
export const ensureNotificationSetup = async () => {
  await setupAndroidChannel();
  return checkPermissions();
};

/**
 * Uygulama gün indeksi (0 = Pazartesi ... 6 = Pazar) -> Expo weekday.
 * Pazar = 1, Pazartesi = 2, Salı = 3, Çarşamba = 4, Perşembe = 5, Cuma = 6, Cumartesi = 7
 */
const EXPO_WEEKDAYS = [2, 3, 4, 5, 6, 7, 1];

/**
 * Rutin için seçilen her güne haftalık tekrarlayan bildirim planlar.
 * Oluşturulan bildirim kimliklerinin dizisini döner.
 */
export const scheduleRoutineNotifications = async (routine) => {
  const ids = [];
  const granted = await ensureNotificationSetup();
  if (!granted) return ids;

  const hour = Number(routine.hour);
  const minute = Number(routine.minute);

  for (const day of routine.days) {
    const expoWeekday = EXPO_WEEKDAYS[day];
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'SkinCycle Hatırlatıcı ✨',
          body: routine.note
            ? `${routine.productName}: ${routine.note}`
            : `${routine.productName} uygulama zamanı!`,
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes?.WEEKLY ?? 'weekly',
          weekday: expoWeekday,
          hour,
          minute,
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
        },
      });
      console.log('Bildirim başarıyla kuruldu:', {
        id: notificationId,
        weekday: expoWeekday,
        hour,
        minute,
      });
      ids.push(notificationId);
    } catch (e) {
      console.warn('Bildirim planlanamadı:', e);
    }
  }
  return ids;
};

/** Verilen bildirim kimliklerini iptal eder. */
export const cancelNotifications = async (ids = []) => {
  await Promise.all(
    ids.map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {})
    )
  );
};

/**
 * SOS modu açıldığında 'active' kategorisindeki rutinlerin bildirimlerini iptal eder;
 * kapandığında yeniden planlar. Güncellenmiş rutin listesini döner.
 */
export const applySosMode = async (routines, isSosActive) => {
  const updated = [];
  for (const r of routines) {
    if (r.category !== 'active') {
      updated.push(r);
      continue;
    }
    if (isSosActive) {
      await cancelNotifications(r.notificationIds);
      updated.push({ ...r, notificationIds: [], paused: true });
    } else {
      const notificationIds = await scheduleRoutineNotifications(r);
      updated.push({ ...r, notificationIds, paused: false });
    }
  }
  return updated;
};
