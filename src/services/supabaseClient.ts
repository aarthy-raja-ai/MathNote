import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Global variables to hold credentials
let SUPABASE_URL = '';
let SUPABASE_KEY = '';

const parseStoredValue = (value: string | null) => {
    if (!value) return null;
    try {
        // storage.set uses JSON.stringify, so we need to parse it
        return JSON.parse(value);
    } catch {
        // Fallback for raw strings if any
        return value;
    }
};

export const supabase = {
    client: null as any,
    async getClient() {
        if (this.client) return this.client;

        const rawUrl = await AsyncStorage.getItem('SUPABASE_URL');
        const rawKey = await AsyncStorage.getItem('SUPABASE_KEY');

        const url = parseStoredValue(rawUrl);
        const key = parseStoredValue(rawKey);

        if (url && key) {
            console.log('[Supabase] Initializing client with URL:', url);
            this.client = createClient(url, key);
            return this.client;
        }
        return null;
    },
    reset() {
        this.client = null;
        console.log('[Supabase] Client reset on Mobile.');
    }
};
