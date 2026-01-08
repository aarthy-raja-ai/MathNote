import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet, AppState, AppStateStatus } from 'react-native';
import {
  useFonts,
  Exo2_400Regular,
  Exo2_500Medium,
  Exo2_600SemiBold,
  Exo2_700Bold,
} from '@expo-google-fonts/exo-2';
import { ThemeProvider, useTheme } from './src/theme';
import { AppProvider, useApp } from './src/context';
import { AppNavigator } from './src/navigation';
import { LockScreen } from './src/screens';

const AppContent: React.FC = () => {
  const { mode } = useTheme();
  const { settings } = useApp();
  const [isLocked, setIsLocked] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    // Lock on initial load if lock is enabled
    if (settings.lock && !hasInitialized) {
      setIsLocked(true);
    }
    setHasInitialized(true);
  }, [settings.lock, hasInitialized]);

  useEffect(() => {
    // Re-lock when app goes to background
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' && settings.lock) {
        setIsLocked(true);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [settings.lock]);

  const handleUnlock = () => {
    setIsLocked(false);
  };

  if (isLocked && settings.lock) {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Exo2_400Regular,
    Exo2_500Medium,
    Exo2_600SemiBold,
    Exo2_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EC0B43" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF8EC',
  },
});

