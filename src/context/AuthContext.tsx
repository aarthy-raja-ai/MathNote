import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import storage, { User, UserRole, Settings } from '../utils/storage';
import { useApp } from './AppContext';

// Pure JS SHA-256 Hashing helper matching desktop app hashing logic
const hashPassword = (password: string): string => {
    function rightRotate(value: number, amount: number) {
        return (value >>> amount) | (value << (32 - amount));
    }
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    const lengthProperty = 'length';
    let i, j;
    let result = '';
    const words: any[] = [];
    const ascii = password + 'mathnote_salt_2025';
    const asciiLength = ascii[lengthProperty] * 8;
    let hash: number[] = [];
    const k: number[] = [];
    let primeCounter = 0;
    const isPrime = (n: number) => {
        for (let factor = 2; factor * factor <= n; factor++) {
            if (n % factor === 0) return false;
        }
        return true;
    };
    let candidate = 2;
    while (primeCounter < 64) {
        if (isPrime(candidate)) {
            if (primeCounter < 8) {
                hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
            }
            k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
            primeCounter++;
        }
        candidate++;
    }
    let extendedAscii = ascii + '\x80';
    while (extendedAscii[lengthProperty] % 64 - 56) extendedAscii += '\x00';
    for (i = 0; i < extendedAscii[lengthProperty]; i++) {
        j = extendedAscii.charCodeAt(i);
        words[i >> 2] |= j << ((3 - i % 4) * 8);
    }
    words[words[lengthProperty]] = ((asciiLength / maxWord) | 0);
    words[words[lengthProperty]] = (asciiLength | 0);
    let w;
    let a, b, c, d, e, f, g, h_val;
    let temp1, temp2;
    const currentHash = [...hash];
    for (j = 0; j < words[lengthProperty]; j += 16) {
        w = words.slice(j, j + 16);
        a = currentHash[0]; b = currentHash[1]; c = currentHash[2]; d = currentHash[3];
        e = currentHash[4]; f = currentHash[5]; g = currentHash[6]; h_val = currentHash[7];
        for (i = 0; i < 64; i++) {
            if (i < 16) {
                w[i] = w[i] || 0;
            } else {
                const s0: number = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
                const s1: number = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
                w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
            }
            const S1: number = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
            const ch: number = (e & f) ^ (~e & g);
            temp1 = (h_val + S1 + ch + k[i] + w[i]) | 0;
            const S0: number = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
            const maj: number = (a & b) ^ (a & c) ^ (b & c);
            temp2 = (S0 + maj) | 0;
            h_val = g;
            g = f;
            f = e;
            e = (d + temp1) | 0;
            d = c;
            c = b;
            b = a;
            a = (temp1 + temp2) | 0;
        }
        currentHash[0] = (currentHash[0] + a) | 0;
        currentHash[1] = (currentHash[1] + b) | 0;
        currentHash[2] = (currentHash[2] + c) | 0;
        currentHash[3] = (currentHash[3] + d) | 0;
        currentHash[4] = (currentHash[4] + e) | 0;
        currentHash[5] = (currentHash[5] + f) | 0;
        currentHash[6] = (currentHash[6] + g) | 0;
        currentHash[7] = (currentHash[7] + h_val) | 0;
    }
    for (i = 0; i < 8; i++) {
        const hex = (currentHash[i] >>> 0).toString(16);
        result += hex.padStart(8, '0');
    }
    return result;
};

interface AuthContextType {
    currentUser: User | null;
    isAuthenticated: boolean;
    login: (pin: string, userId?: string) => Promise<boolean>;
    loginWithPassword: (username: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    addUser: (name: string, role: UserRole, pin: string) => Promise<void>;
    updateUser: (id: string, updates: Partial<User>) => Promise<void>;
    deleteUser: (id: string) => Promise<void>;
    users: User[];
    // Permissions
    canDelete: boolean;
    canManageSettings: boolean;
    canViewReports: boolean;
    role: UserRole | null;
    register: (profile: any, ownerUsername: string, ownerPassword: string, ownerPin: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { settings, updateSettings } = useApp();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        const initAuth = async () => {
            const savedUsers = settings.users || [];
            
            // Auto-assign owner role to the first user if no owner exists
            const hasOwner = savedUsers.some(u => u.role === 'owner');
            if (savedUsers.length > 0 && !hasOwner) {
                savedUsers[0].role = 'owner';
                await updateSettings({ users: [...savedUsers] });
            }

            setUsers(savedUsers);
            
            const current = savedUsers.find(u => u.id === settings.currentUserId);
            if (current) {
                setCurrentUser(current);
            } else {
                // Only auto-login if lock is disabled and there is only 1 user
                const shouldAutoLogin = !settings.lock && savedUsers.length === 1;
                if (shouldAutoLogin) {
                    setCurrentUser(savedUsers[0]);
                } else {
                    setCurrentUser(null);
                }
            }
        };

        if (settings) {
            initAuth();
        }
    }, [settings.users, settings.currentUserId, settings.lock]);

    const register = useCallback(async (profile: any, ownerUsername: string, ownerPassword: string, ownerPin: string) => {
        const hashedPassword = hashPassword(ownerPassword);
        const owner: User = {
            id: `user-${Date.now()}`,
            name: profile.ownerName || 'Owner',
            username: ownerUsername.toLowerCase().trim(),
            password: hashedPassword,
            role: 'owner',
            pin: ownerPin,
            createdAt: new Date().toISOString(),
        };
        const usersList = [owner];
        setUsers(usersList);

        // Save business profile under @mathnote_auth key
        await storage.set('@mathnote_auth', profile);

        // Save users and select owner as current user
        await updateSettings({
            users: usersList,
            currentUserId: owner.id,
            businessName: profile.businessName || '',
            businessAddress: profile.address || '',
            businessPhone: profile.phone || '',
            businessGSTIN: profile.gstin || '',
            businessLogo: profile.logoBase64 || '',
        });

        setCurrentUser(owner);
    }, [updateSettings]);

    const login = useCallback(async (pin: string, userId?: string): Promise<boolean> => {
        const user = userId 
            ? users.find(u => u.id === userId && u.pin === pin)
            : users.find(u => u.pin === pin);
        if (user) {
            setCurrentUser(user);
            await updateSettings({ currentUserId: user.id });
            return true;
        }
        return false;
    }, [users, updateSettings]);

    const loginWithPassword = useCallback(async (username: string, password: string): Promise<boolean> => {
        const hashed = hashPassword(password);
        const user = users.find(u => u.username && u.username.toLowerCase() === username.toLowerCase() && u.password === hashed);
        if (user) {
            setCurrentUser(user);
            await updateSettings({ currentUserId: user.id });
            return true;
        }
        return false;
    }, [users, updateSettings]);

    const logout = useCallback(async () => {
        setCurrentUser(null);
        await updateSettings({ currentUserId: undefined });
    }, [updateSettings]);

    const addUser = useCallback(async (name: string, role: UserRole, pin: string) => {
        const username = name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const hashedPassword = hashPassword(pin); // use PIN as default password
        const newUser: User = {
            id: `user-${Date.now()}`,
            name,
            username,
            password: hashedPassword,
            role,
            pin,
            createdAt: new Date().toISOString(),
        };
        const newUsers = [...users, newUser];
        setUsers(newUsers);
        await updateSettings({ users: newUsers });
    }, [users, updateSettings]);

    const updateUser = useCallback(async (id: string, updates: Partial<User>) => {
        const newUsers = users.map(u => u.id === id ? { ...u, ...updates } : u);
        setUsers(newUsers);
        await updateSettings({ users: newUsers });
        if (currentUser?.id === id) {
            setCurrentUser({ ...currentUser, ...updates });
        }
    }, [users, currentUser, updateSettings]);

    const deleteUser = useCallback(async (id: string) => {
        if (users.length <= 1) return; // Cannot delete last user
        const newUsers = users.filter(u => u.id !== id);
        setUsers(newUsers);
        await updateSettings({ users: newUsers });
        if (currentUser?.id === id) {
            setCurrentUser(newUsers[0]);
            await updateSettings({ currentUserId: newUsers[0].id });
        }
    }, [users, currentUser, updateSettings]);

    // Permissions based on roles
    const role = currentUser?.role || null;
    const canManageSettings = role === 'owner';
    const canDelete = role === 'owner'; // Managers can't delete based on requirements
    const canViewReports = role === 'owner' || role === 'manager';

    return (
        <AuthContext.Provider value={{
            currentUser,
            isAuthenticated: !!currentUser,
            login,
            loginWithPassword,
            logout,
            addUser,
            updateUser,
            deleteUser,
            users,
            canDelete,
            canManageSettings,
            canViewReports,
            role,
            register,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
