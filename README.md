# Math Note 📝

> **Every Number. Clearly Noted.**

A simple and elegant offline accounting app for small businesses, built with React Native & Expo.

![Version](https://img.shields.io/badge/version-1.4.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

## ✨ Features

### 📊 Dashboard
- Today's summary at a glance
- Separate Cash & UPI received tracking
- Total balance overview with credit impact
- Quick action buttons

### 💰 Sales Management
- Record daily sales with customer details
- Support for Cash & UPI payment methods
- Partial payments with automatic credit creation
- Compact list view with gesture controls

### 📋 Expense Tracking
- Categorize and track expenses
- Daily expense summaries
- Note attachments

### 🤝 Credit Management
- Track money given (Customers) / taken (Vendors)
- Payment mode selection (Cash/UPI) for credits
- Partial payment recording with payment mode
- Payment history with mode tracking for each credit
- Credit payments impact total balance calculations
- Due reminders

### 📈 Reports
- Interactive pie charts for expenses
- Line charts for sales trends
- Date range filtering
- PDF report generation & sharing

### 🔐 Security
- PIN/Biometric lock support
- Secure local storage

### ⚙️ Settings
- Light/Dark theme toggle
- Currency customization
- Data backup & restore
- Clear all data option

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm or yarn
- Expo CLI
- Android Studio / Xcode (for emulators)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/MathNote.git

# Navigate to project directory
cd MathNote

# Install dependencies
npm install

# Start the development server
npm start
```

### Running on Device

```bash
# Android
npm run android

# iOS
npm run ios
```

## 📱 Screenshots

*Coming soon*

## 🛠️ Tech Stack

- **Framework**: React Native with Expo SDK 54
- **Navigation**: React Navigation 7
- **State Management**: React Context API
- **Storage**: AsyncStorage
- **Icons**: Lucide React Native
- **Charts**: React Native Chart Kit
- **Fonts**: Exo 2 (Google Fonts)

## 📁 Project Structure

```
MathNote/
├── src/
│   ├── components/     # Reusable UI components
│   ├── context/        # App state management
│   ├── navigation/     # Navigation configuration
│   ├── screens/        # App screens
│   ├── theme/          # Design tokens & theming
│   └── utils/          # Storage & utilities
├── App.tsx             # App entry point
└── package.json
```

## 📝 Recent Updates (v1.4.0)

### 🤝 Enhanced Credits System
- ✅ Added payment mode (Cash/UPI) selection for credits
- ✅ Distinguish between Customers (given credits) and Vendors (taken credits)
- ✅ Payment mode tracking in payment history
- ✅ Record payment modal now includes payment mode selection
- ✅ Visual badges showing payment mode (Cash/UPI) on credit cards

### 💰 Improved Balance Calculation
- ✅ Credit payments received (from given credits) now add to total balance
- ✅ Credit payments made (for taken credits) now subtract from total balance
- ✅ Accurate financial overview reflecting all money movements

### 🎨 UI Enhancements
- ✅ Party type label (Customer/Vendor) displayed on credit cards
- ✅ Payment mode badges with icons (Banknote for Cash, Smartphone for UPI)
- ✅ Updated form labels based on credit type

### Previous Updates (v1.3.0)
- Separated Cash & UPI received amounts on dashboard
- Compact list design for transaction history
- Fixed nav bar overlap with action buttons
- Improved gesture controls (tap to edit, long-press to delete)
- Added bottom padding to prevent content overlap

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

---

Made with ❤️ for small businesses
