import AsyncStorage from '@react-native-async-storage/async-storage';

const ROUTINES_KEY = '@skincycle_routines';
const SOS_MODE_KEY = '@skincycle_sos_mode';

export const getRoutines = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(ROUTINES_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : [];
  } catch (e) {
    console.error('Rutinler okunamadı:', e);
    return [];
  }
};

export const saveRoutines = async (routines) => {
  try {
    await AsyncStorage.setItem(ROUTINES_KEY, JSON.stringify(routines));
  } catch (e) {
    console.error('Rutinler kaydedilemedi:', e);
  }
};

export const getSosMode = async () => {
  try {
    const value = await AsyncStorage.getItem(SOS_MODE_KEY);
    return value === 'true';
  } catch (e) {
    return false;
  }
};

export const saveSosMode = async (isActive) => {
  try {
    await AsyncStorage.setItem(SOS_MODE_KEY, isActive ? 'true' : 'false');
  } catch (e) {
    console.error('SOS modu kaydedilemedi:', e);
  }
};