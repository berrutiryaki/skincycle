import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import RoutineScreen from './src/screens/RoutineScreen';
import ScannerScreen from './src/screens/ScannerScreen';
import AssistantScreen from './src/screens/AssistantScreen';
import { COLORS } from './src/theme';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerStyle: {
              backgroundColor: COLORS.surface,
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.border,
            },
            headerTitleStyle: {
              fontWeight: '700',
              color: COLORS.text,
              fontSize: 18,
            },
            tabBarActiveTintColor: COLORS.primary,
            tabBarInactiveTintColor: COLORS.textSecondary,
            tabBarStyle: {
              backgroundColor: COLORS.surface,
              borderTopColor: COLORS.border,
              paddingTop: 6,
            },
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;
              if (route.name === 'Rutinlerim') {
                iconName = focused ? 'calendar' : 'calendar-outline';
              } else if (route.name === 'İçerik Tara') {
                iconName = focused ? 'scan' : 'scan-outline';
              } else if (route.name === 'Cilt Asistanı') {
                iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              }
              return <Ionicons name={iconName} size={size} color={color} />;
            },
          })}
        >
          <Tab.Screen name="Rutinlerim" component={RoutineScreen} />
          <Tab.Screen name="İçerik Tara" component={ScannerScreen} />
          <Tab.Screen name="Cilt Asistanı" component={AssistantScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}