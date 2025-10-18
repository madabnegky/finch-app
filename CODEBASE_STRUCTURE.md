# Finch App - Codebase Structure Guide

## Project Root Structure

```
/Users/kylechristian/Documents/finch-app/
├── packages/
│   ├── web/                          # React web app (FEATURE COMPLETE)
│   ├── mobile/                       # React Native mobile app (IN PROGRESS)
│   ├── functions/                    # Firebase Cloud Functions (backend)
│   ├── shared-logic/                 # Shared code between web and mobile
│   └── shared-assets/                # Shared images/assets
├── .git/                             # Git repository
├── node_modules/                     # Root dependencies
└── package.json                      # Root workspace config
```

---

## Web App Structure (`/packages/web`)

### Directory Layout

```
packages/web/
├── src/
│   ├── App.jsx                       # Main routing setup
│   ├── main.jsx                      # React DOM entry point
│   ├── index.css                     # Tailwind imports
│   │
│   ├── screens/                      # Page components (7 pages)
│   │   ├── LandingPage.jsx          # Entry/login page
│   │   ├── AppLayout.jsx             # Main layout wrapper with modals
│   │   ├── SetupWizard.jsx           # First-time account setup
│   │   ├── DashboardPage.jsx         # Dashboard (3 tabs: Overview, Accounts, Envelopes)
│   │   ├── TransactionsPage.jsx      # Transactions (3 tabs: Upcoming, History, Recurring)
│   │   ├── CalendarPage.jsx          # Interactive calendar view
│   │   ├── BudgetPage.jsx            # Budget management
│   │   ├── ReportsPage.jsx           # Analytics (2 charts)
│   │   └── SettingsPage.jsx          # User settings
│   │
│   ├── components/
│   │   ├── core/                     # Reusable UI components
│   │   │   ├── Button.jsx            # Standard button
│   │   │   ├── Input.jsx             # Text input
│   │   │   ├── Select.jsx            # Dropdown
│   │   │   ├── DatePicker.jsx        # Date picker
│   │   │   ├── CurrencyInput.jsx     # Currency input with formatting
│   │   │   ├── Modal.jsx             # Modal base component
│   │   │   ├── Tabs.jsx              # Tab interface
│   │   │   ├── Tooltip.jsx           # Info tooltip
│   │   │   ├── Icon.jsx              # Icon wrapper
│   │   │   ├── LoadingScreen.jsx     # Loading state
│   │   │   ├── AccountSetupGate.jsx  # Requires account setup
│   │   │   └── SaveProgressBanner.jsx # Guest upgrade prompt
│   │   │
│   │   ├── auth/                     # Authentication components
│   │   │   ├── AuthScreen.jsx        # Login/signup form
│   │   │   ├── AnimatedPreview.jsx   # Animated demo
│   │   │   └── StaticPreview.jsx     # Static preview
│   │   │
│   │   ├── banners/                  # Top/bottom banners
│   │   │   ├── ErrorBanner.jsx       # Error display
│   │   │   ├── SaveProgressBanner.jsx # Save data prompt
│   │   │   └── SimulationBanner.jsx  # Active simulation indicator
│   │   │
│   │   ├── dashboard/                # Dashboard widgets
│   │   │   ├── SixtyDayOutlook.jsx   # Projection cards
│   │   │   ├── CashFlowChart.jsx     # Balance line chart
│   │   │   ├── UpcomingBills.jsx     # Next bills list
│   │   │   ├── GoalEnvelope.jsx      # Goal progress card
│   │   │   ├── ActivityFeed.jsx      # Recent activity list
│   │   │   ├── ActivityFeedItem.jsx  # Single activity item
│   │   │   ├── BudgetAlert.jsx       # Budget warning (empty)
│   │   │   └── AccountCard.jsx       # Account display (empty)
│   │   │
│   │   ├── transactions/             # Transaction components
│   │   │   ├── TransactionList.jsx   # Transaction table
│   │   │   ├── TransactionItem.jsx   # Single transaction row
│   │   │   └── RecurringTransactionItem.jsx # Recurring series row
│   │   │
│   │   ├── calendar/                 # Calendar components
│   │   │   └── CalendarView.jsx      # Interactive monthly calendar
│   │   │
│   │   ├── budget/                   # Budget components
│   │   │   └── BudgetCategoryItem.jsx # Budget card
│   │   │
│   │   ├── modals/                   # Modal dialogs (12 total)
│   │   │   ├── TransactionModal.jsx           # Add/edit transaction
│   │   │   ├── AddGoalModal.jsx               # Create goal
│   │   │   ├── AllocateFundsModal.jsx         # Add to goal
│   │   │   ├── AddAccountModal.jsx            # Create account
│   │   │   ├── EditAccountModal.jsx           # Edit account
│   │   │   ├── AddAccountChoiceModal.jsx      # Manual or Plaid choice
│   │   │   ├── EditRecurringModal.jsx         # Edit recurring series
│   │   │   ├── WhatIfModal.jsx                # Scenario simulator
│   │   │   ├── PlaidLinkModal.jsx             # Bank linking
│   │   │   ├── TransferModal.jsx              # Transfer between accounts
│   │   │   ├── ConfirmDeleteModal.jsx         # Delete confirmation
│   │   │   └── UpgradeAccountModal.jsx        # Guest upgrade prompt
│   │   │
│   │   ├── settings/                 # Settings components
│   │   │   └── NotificationSettings.jsx # Notification prefs
│   │   │
│   │   └── plaid/                    # Plaid integration
│   │       └── PlaidLink.jsx         # Plaid connect component
│   │
│   ├── constants/                    # Configuration
│   │   └── categories.jsx            # Transaction categories
│   │
│   ├── hooks/                        # Custom React hooks
│   │   └── useNotifications.js       # Notification hook
│   │
│   ├── assets/
│   │   └── images/                   # Images and logos
│   │
│   └── index.css                     # Main styles
│
├── public/                           # Static files
├── vite.config.js                    # Vite configuration
├── tailwind.config.js                # Tailwind theming
├── postcss.config.js                 # PostCSS configuration
├── eslint.config.js                  # ESLint rules
├── package.json                      # Dependencies
└── index.html                        # HTML entry point
```

### Web App - Key Technologies

- **Vite**: Build tool and dev server
- **React 18**: UI framework with hooks
- **React Router v6**: Client-side routing
- **Firebase SDK**: Backend integration
- **React Firebase Hooks**: Firestore real-time listeners
- **Recharts**: Chart library (pie + line charts)
- **React Hook Form**: Form state management
- **Tailwind CSS**: Styling with utility classes
- **Date-fns**: Date manipulation
- **Lucide React & Heroicons**: SVG icons

---

## Mobile App Structure (`/packages/mobile`)

### Directory Layout

```
packages/mobile/
├── src/
│   ├── screens/                      # Screen components (limited)
│   │   ├── SplashScreen.tsx          # Loading/auth check
│   │   ├── WelcomeScreen.tsx         # Login options
│   │   ├── SetupWizardScreen.tsx     # First-time setup
│   │   └── DashboardScreen.tsx       # Main dashboard (ONLY FEATURE SCREEN)
│   │
│   ├── components/                   # Reusable components
│   │   ├── AddTransactionModal.tsx   # Add transaction form
│   │   └── AccountSetupGate.tsx      # Requires account setup
│   │
│   └── types/
│       └── navigation.ts             # TypeScript navigation types
│
├── App.tsx                           # App entry with navigation setup
├── index.js                          # React Native entry
├── metro.config.js                   # Metro bundler config
├── tsconfig.json                     # TypeScript config
├── package.json                      # Dependencies
│
├── android/                          # Android native code
│   └── app/
│       ├── src/
│       └── build.gradle              # Build configuration
│
├── ios/                              # iOS native code
│   └── Podfile                       # iOS dependencies
│
└── .bundle/                          # Bundler cache
```

### Mobile App - Key Technologies

- **React Native**: Cross-platform mobile framework
- **React Navigation**: Screen navigation (native stack)
- **Firebase React Native**: Backend integration
- **TypeScript**: Type safety

### What's Missing

- **No charts library** (would need react-native-svg + charting library)
- **No calendar component** (would need react-native-calendar or custom)
- **No form validation** (would need react-hook-form or Formik ported to RN)
- **No modal system** (using basic React Native Modal)
- **No advanced navigation** (no bottom tabs, drawer, or complex stacks)

---

## Shared Logic Package (`/packages/shared-logic`)

### Structure

```
packages/shared-logic/src/
├── api/
│   ├── firebase.js                   # Web Firebase config
│   └── firebase.native.js            # React Native Firebase config
│
├── hooks/
│   ├── useAuth.jsx                   # Authentication hook
│   ├── useProjectedBalancesFromCloud.js # 365-day projections
│   └── useTransactionInstances.js    # Generate instances from recurring
│
└── utils/
    ├── currency.js                   # Currency formatting
    └── date.js                       # Date utilities
```

### Exported Functions

From `package.json` exports:
- `@shared/logic/api/firebase` - Firebase config (web)
- `@shared/logic/api/firebase.native` - Firebase config (mobile)
- `@shared/logic/hooks/useAuth` - Auth provider and hook
- `@shared/logic/hooks/useProjectedBalances` - Balance projections
- `@shared/logic/hooks/useTransactionInstances` - Transaction generation
- `@shared/logic/utils/currency` - Currency formatting
- `@shared/logic/utils/date` - Date utilities

---

## Firebase Functions (`/packages/functions`)

### Files

```
packages/functions/
├── index.js                          # Main function exports
├── projection.js                     # 365-day balance calculation
├── notifications.js                  # Notification triggers
└── dateUtils.js                      # Utility functions
```

### Purpose

- Calculates 365-day rolling balance projections
- Generates transaction instances from recurring transactions
- Handles notification triggers
- Runs server-side to support both web and mobile

---

## Data Flow Overview

### Web App Flow

```
User Browser
    ↓
[App.jsx] → Routes/Navigation
    ↓
[AppLayout.jsx] → Fetches data from Firestore
    ├── accounts (real-time)
    ├── transactions (real-time)
    ├── goals (real-time)
    └── projections (from Cloud Functions)
    ↓
[useOutletContext] → Data to child screens
    ↓
[DashboardPage/TransactionsPage/etc] → Display & handle user actions
    ↓
[Modals] → Forms for creating/editing data
    ↓
Firebase Firestore → Data persistence
```

### Mobile App Flow (Current)

```
User Device
    ↓
[App.tsx] → Navigation setup
    ↓
[AppNavigator] → Routes based on auth state
    ├── Unauthenticated → SplashScreen → WelcomeScreen
    └── Authenticated → SetupWizardScreen → DashboardScreen
    ↓
[DashboardScreen] → Fetches limited data
    ├── accounts (real-time listener)
    └── transactions (real-time listener, limited to 10)
    ↓
useState → Local state management
    ↓
[AddTransactionModal] → Limited form
    ↓
Firebase Firestore → Save transaction
```

---

## Database Collections

### Firestore Structure

```
Firestore
└── users/
    └── {uid}/
        ├── accounts/
        │   └── {accountId}
        │       ├── name: string
        │       ├── type: string
        │       ├── currentBalance: number
        │       ├── startingBalance: number
        │       ├── cushion: number
        │       ├── plaidAccountId?: string
        │       └── warning?: object
        │
        ├── transactions/
        │   └── {transactionId}
        │       ├── description: string
        │       ├── amount: number (signed)
        │       ├── type: "income" | "expense"
        │       ├── category?: string
        │       ├── date: Timestamp
        │       ├── accountId: string
        │       ├── isRecurring: boolean
        │       ├── recurringDetails?: object
        │       │   ├── frequency: string
        │       │   ├── nextDate: Timestamp
        │       │   ├── endDate?: Timestamp
        │       │   └── excludedDates?: string[]
        │       ├── createdAt: Timestamp
        │       └── isInstance?: boolean
        │
        ├── goals/
        │   └── {goalId}
        │       ├── goalName: string
        │       ├── targetAmount: number
        │       ├── allocatedAmount: number
        │       ├── fundingAccountId: string
        │       └── icon?: string
        │
        ├── budgets/
        │   └── {budgetId}
        │       ├── category: string
        │       ├── limit: number
        │       └── spent: number
        │
        └── notifications/
            └── {notificationId}
                ├── type: string
                ├── enabled: boolean
                └── settings: object
```

---

## Component Hierarchy

### Web App Main Structure

```
App (Router)
├── LandingPage
├── SetupWizard
└── AppLayout (Protected Route)
    ├── Header (Navigation)
    ├── Outlet (Routes)
    │   ├── DashboardPage
    │   │   ├── Overview Tab
    │   │   │   ├── SixtyDayOutlook
    │   │   │   ├── CashFlowChart
    │   │   │   ├── UpcomingBills
    │   │   │   └── ActivityFeed
    │   │   ├── Accounts Tab
    │   │   │   ├── AccountCard (multiple)
    │   │   │   ├── AddAccountCard
    │   │   │   └── TransactionList
    │   │   └── Envelopes Tab
    │   │       ├── GoalEnvelope (multiple)
    │   │       └── AddGoalCard
    │   ├── TransactionsPage
    │   │   ├── Upcoming Tab → TransactionList
    │   │   ├── History Tab → TransactionList
    │   │   └── Recurring Series Tab → Table
    │   ├── CalendarPage
    │   │   └── CalendarView
    │   ├── BudgetPage
    │   │   └── BudgetCategoryItem (multiple)
    │   ├── ReportsPage
    │   │   ├── PieChart (spending)
    │   │   └── LineChart (trends)
    │   └── SettingsPage
    │       └── NotificationSettings
    └── Modals (12 types)
        ├── TransactionModal
        ├── AddGoalModal
        ├── AllocateFundsModal
        ├── AddAccountModal
        ├── EditAccountModal
        ├── WhatIfModal
        └── ... (6 more)
```

### Mobile App Structure

```
App (AuthProvider)
└── AppNavigator (Stack Navigator)
    ├── SplashScreen
    ├── WelcomeScreen
    ├── SetupWizardScreen
    ├── DashboardScreen
    │   ├── Header
    │   ├── ScrollView content
    │   │   ├── Welcome section
    │   │   ├── Upgrade prompt
    │   │   ├── 60-Day Outlook card
    │   │   ├── Accounts section
    │   │   ├── Recent Activity section
    │   │   └── Floating Action Button
    │   └── AddTransactionModal
    └── (No other screens implemented)
```

---

## File Statistics

### Web App
- **Total Screens/Pages:** 7 (Landing, Setup, Dashboard, Transactions, Calendar, Budget, Reports, Settings)
- **Components:** 12 modals + 20+ UI components
- **Lines of Code:** ~5,000+
- **Feature Completeness:** 100%

### Mobile App
- **Total Screens:** 4 (Splash, Welcome, Setup, Dashboard)
- **Components:** 2 (AddTransactionModal, AccountSetupGate)
- **Lines of Code:** ~1,500
- **Feature Completeness:** ~15%

---

## Development Notes

### Web App - Well-Organized
- Clear separation of concerns (screens, components, modals)
- Shared logic in `@shared/logic`
- Firebase integration via hooks
- Real-time data with react-firebase-hooks
- Comprehensive UI component library

### Mobile App - Needs Expansion
- Minimal screen structure
- Basic navigation setup
- Limited data fetching
- No form validation framework
- No charting capability
- No advanced UI components

### To Achieve Feature Parity

1. Add remaining 6 screens
2. Implement navigation structure (bottom tabs or drawer)
3. Create React Native versions of:
   - Calendar component
   - Charting visualizations
   - Form validation
   - Modal system
4. Integrate server-side projections
5. Implement full CRUD operations for all data types

