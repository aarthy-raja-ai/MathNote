# Math Note 📝

> **Every Number. Clearly Noted.**

A simple, elegant, and secure offline-first accounting app for small businesses, built with React Native & Expo.

![Version](https://img.shields.io/badge/version-1.5.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

---

## ✨ Features

### 📅 Indian Financial Year (FY) Transition
- **Automatic Sequence Resets**: Document sequences (Invoices, Purchases) automatically reset on April 1st.
- **Virtual Year Partitioning**: Toggle active financial years globally from the top of the dashboard. View past years and edit old transactions safely.

### 🏢 Multi-Company Support
- **Outlets Management**: Add, update, and switch multiple business outlets from **Settings > Preferences**.
- **Segregated Databases**: Seamlessly partitions sales, purchases, credits, inventory, and metrics by company ID.

### 💾 9:00 PM Auto-Backups
- **Daily Local Storage Backups**: Automatically backs up data to local document folders every night at 9:00 PM when active.
- **7-Day Automatic Rotation**: Self-cleaning logic keeps storage light by retaining only the last 7 daily backup copies.

### ☁️ Supabase Cloud Sync
- **Cross-Platform Syncing**: Instantly syncs transactions, staff profiles, and outlets with the Desktop app.

---

## 🛠️ Tech Stack
- **Framework**: React Native with Expo SDK 54
- **Navigation**: React Navigation 7
- **Storage**: AsyncStorage & expo-file-system
- **Icons**: Lucide React Native
- **Charts**: React Native Chart Kit

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Expo CLI

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/aarthy-raja-ai/MathNote.git
   cd MathNote
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Expo server:
   ```bash
   npx expo start
   ```

---

## 📝 Recent Updates (v1.5.0)
- **Multi-Company Management**: Full CRUD settings under preferences.
- **Layout & FAB zIndex fixes**: Ensured setup modal buttons sit on top and remain clickable.
- **9:00 PM Auto-Backup**: Daily scheduled local backups with 7-day limits.
- **Indian Financial Year Selector**: Integrated dynamic selectors in dashboard screens.

---

## 📄 License
This project is licensed under the MIT License.
