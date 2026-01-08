# Changelog

All notable changes to Math Note are documented in this file.

## [1.3.0] - 2026-01-08

### ✨ New Features

#### Interactive Charts 📊
- Implemented **Pie Charts** for expense breakdown by category
- Added **Line Charts** for 7-day sales trends
- Dynamic animations and interactive legends
- Visual indicators for empty data states

#### Financial PDF Reports 📄
- Generate professional **PDF reports** from within the app
- Custom date range selection (Daily, Weekly, Monthly, All)
- Includes Sales, Expenses, and Credit summaries
- Integrated sharing via system sharing sheet

#### App Lock & Security 🔒
- Added **PIN & Biometric Lock** (FaceID/Fingerprint)
- Configure lock settings in the Security section
- Automatic re-lock when app enters background
- Secure storage for authentication state

#### Credit Due Reminders 🔔
- Push notification system for pending credits
- Toggle daily reminders in Settings
- Local notifications for improved engagement

### 🐛 Bug Fixes
- Fixed data persistence for settings on app restart
- Improved PDF export layout for high-density screens
- Enhanced biometric authentication fallback flow

---

## [1.2.0] - 2026-01-06

### ✨ New Features

#### Lucide Icons Everywhere
- Replaced all remaining emoji icons with **lucide-react-native** icons
- Credits screen: Plus, CircleArrowUp, CircleArrowDown icons
- Expenses screen: Plus, Tag, Trash2, Pencil icons
- Sales screen: Plus, IndianRupee, Trash2, Pencil icons
- Settings screen: Moon, Sun, Download, Upload, Trash2, ChevronRight icons
- Bottom tab bar: Home, ShoppingCart, Wallet, CreditCard, BarChart3, Settings icons

#### Data Restore Feature
- Added **Restore Data** option in Settings screen
- Import JSON backup files using document picker
- Validates backup file structure before restoring
- Confirmation dialog before overwriting existing data
- Success/error feedback with alerts

### 🐛 Bug Fixes

- Fixed icon consistency across all navigation tabs
- Improved Settings screen layout and spacing
- Better icon sizing and color theming

---

## [1.1.0] - 2026-01-05

### ✨ New Features

#### Partial Payments System
- Added **Customer Name** field to sales
- Added **Total Amount** and **Paid Amount** fields
- Auto-creates credit when partial payment is made
- Shows "Partial" badge and remaining balance on sales
- Linked credits show "Sale" badge and are protected from deletion

#### Modern UI Updates
- Replaced emoji icons with **lucide-react-native** icons throughout
- ArrowUpRight/ArrowDownLeft for credits direction
- Clock/CheckCircle for payment status
- Pencil/Trash2 for edit/delete actions
- New app icon, splash screen, and favicon

#### Typography
- Integrated **Exo 2 Google Font** family
- Regular, Medium, SemiBold, and Bold weights

#### Dark Mode
- Fixed dark mode persistence using AsyncStorage
- All 6 screens now support dynamic theming
- StatusBar adapts to theme

### 🐛 Bug Fixes

#### Layout Fixes
- Fixed text overflow on small screens in Sales list
- Proper flex layout: left-content-flex + right-actions-fixed
- Added text truncation with ellipsis
- Badge wrapping for multiple badges
- KeyboardAvoidingView in modals

#### Data Handling
- Fixed NaN values in Reports screen
- Added legacy data compatibility (handles old sale format)
- Nullish coalescing for undefined amounts

### 🎨 Design Changes

#### Color System
- Updated color palette with warm cream background (#FFF8EC)
- New primary red (#EC0B43)
- Dark mode colors for all semantic tokens

#### UI Polish
- Floating action buttons positioned properly (bottom: 96px)
- Bottom sheet modals with handle bar and swipe-to-close
- Cash/UPI payment method segmented control

---

## [1.0.0] - 2026-01-02

### Initial Release
- Dashboard with today's summary and quick actions
- Sales tracking with daily view
- Expense management with categories
- Credit tracking (given/taken)
- Reports with charts and statistics
- Settings with currency selection and data management
