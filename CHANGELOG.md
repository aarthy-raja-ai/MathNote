# Changelog

All notable changes to Math Note are documented in this file.

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
