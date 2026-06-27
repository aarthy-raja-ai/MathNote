import 'react-native-url-polyfill/auto';
import { registerRootComponent } from 'expo';
import { supabase } from './src/services/supabaseClient'; // Pre-import to ensure initialized

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
// Silence specific Expo Go notification error in development
if (__DEV__) {
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
        if (typeof args[0] === 'string' && args[0].includes('expo-notifications: Android Push notifications')) {
            return;
        }
        originalConsoleError(...args);
    };
}

registerRootComponent(App);

