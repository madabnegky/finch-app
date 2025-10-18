# Finch App - Web vs Mobile Feature Comparison Analysis

## Project Structure Overview

### Web App Location
- **Path:** `/Users/kylechristian/Documents/finch-app/packages/web`
- **Framework:** Vite + React 18 with React Router v6
- **Build Tool:** Vite
- **Styling:** Tailwind CSS + PostCSS
- **Key Dependencies:**
  - `react-router-dom` v6.24.0 (routing)
  - `recharts` v2.12.7 (charting library)
  - `react-firebase-hooks` v5.1.1 (Firebase integration)
  - `react-hook-form` v7.52.1 (form handling)
  - `date-fns` v3.6.0 (date utilities)
  - `lucide-react` v0.395.0 (icons)
  - `@heroicons/react` v2.1.5 (icons)

### Mobile App Location
- **Path:** `/Users/kylechristian/Documents/finch-app/packages/mobile`
- **Framework:** React Native with Expo/React Native CLI
- **Navigation:** React Navigation (native stack)
- **UI:** React Native (native components)
- **Status:** Basic implementation with Setup Wizard and Dashboard screens only

### Backend & Database
- **Backend:** Firebase Cloud Functions
- **Database:** Cloud Firestore (NoSQL)
- **Authentication:** Firebase Authentication (Email, Google OAuth, Anonymous guest mode)
- **Database Structure:**
  - `users/{uid}/accounts` - User bank accounts
  - `users/{uid}/transactions` - All transactions (one-time and recurring)
  - `users/{uid}/goals` - Savings goals/envelopes
  - `users/{uid}/budgets` - Category budgets
  - `users/{uid}/notifications` - Notification settings

---

## WEB APP - COMPLETE FEATURE LIST

### 1. Navigation & Layout Structure
**Main Pages/Routes:**
- `/` - Landing/Welcome Page
- `/setup` - Account Setup Wizard (first-time setup)
- `/app/dashboard` - Main Dashboard
- `/app/calendar` - Calendar View
- `/app/calendar/account/:accountId` - Filtered Calendar by Account
- `/app/transactions` - Transactions Management
- `/app/budget` - Budget Management
- `/app/reports` - Spending Reports & Analytics
- `/app/settings` - Settings & Preferences

**Main Navigation Bar (Top Header):**
- Dashboard link
- Calendar link
- Transactions link
- Reports link
- "What If?" button (purple)
- Add Transaction button
- Notifications bell icon
- Settings gear icon
- Logout button

---

### 2. Dashboard Page (Most Complex)
**Components & Features:**

#### A. Overview Tab
- **60-Day Outlook Widget:**
  - Current Balance (aggregated across accounts)
  - Projected Low (minimum balance in next 60 days)
  - Projected High (maximum balance in next 60 days)
  - Uses server-side projections from Firebase Functions
  - Shows tooltips with "All Accounts" indicator

- **Cash Flow Chart:**
  - Line chart visualization (using Recharts)
  - Shows aggregated daily balance over time
  - X-axis: Time, Y-axis: Balance amount

- **Upcoming Bills Widget:**
  - Shows next 4 recurring expense bills
  - Lists description and date
  - Smart date formatting ("Today", "Tomorrow", "Monday", or "Dec 15")
  - Only shows instances of recurring transactions that are expenses

- **Activity Feed:**
  - Recent transactions (past 30 days)
  - Shows transactions sorted by: upcoming first, then past in reverse order
  - Displays: description, amount, date, category (if expense)
  - Linked to specific accounts
  - Smart date formatting

- **Account Quick View Pills:**
  - Clickable pills showing each account name and "Available to Spend"
  - Color-coded: red for negative, normal for positive
  - Clicking switches to Accounts tab with that account selected

#### B. Accounts Tab
- **Account Cards Grid (2-column layout):**
  - Account name and type (Checking/Savings)
  - "MANUAL" badge for non-Plaid accounts
  - Account icon (credit card or bank building)
  - Current Balance
  - Cushion amount (safety buffer)
  - Available to Spend (calculated)
  - Edit button (on hover, pencil icon)
  - Bank linking button (for manual accounts)
  - Warning/Error display (red or amber alerts)
  - Border highlighting for selected account

- **Add Account Card:**
  - Dashed border card to add new accounts
  - Manual account creation
  - Plaid bank linking integration

- **Account-Specific Transaction History:**
  - Shows transaction history for selected account
  - Filters transactions by account ID
  - Only shows transactions on or before today
  - Filters out recurring series instances that haven't occurred yet
  - Sortable and editable

#### C. Envelopes Tab
- **Goal/Envelope Cards:**
  - Goal name with emoji/icon
  - Progress bar showing allocated vs target amount
  - Allocated amount + target amount display
  - "Add" button to allocate more funds
  - Color-coded progress bars (teal)

- **Add Goal Card:**
  - Create new savings goals (envelopes)

---

### 3. Budget Page
**Features:**
- Create new budget categories
- Set monthly spending limits per category
- Progress bars showing spending vs limit
- Displays: category name, spent amount, limit amount
- Color-coded progress (blue bar)
- Card-based layout (3-column grid, responsive)

---

### 4. Transactions Page
**Tabs Structure:**

#### A. Upcoming Tab (Next 30 days)
- Lists individual transaction instances scheduled for next 30 days
- NOT recurring series, but actual instances
- Shows: description, amount, date, category, account
- Editable and deletable
- Sorted by date ascending

#### B. History Tab (Past transactions)
- Complete history of past one-time and recurring transaction instances
- Shows both individual and generated instances from recurring
- Sorted by date descending (newest first)
- Includes one-time and past instances of recurring transactions

#### C. Recurring Series Tab
- Master recurring transaction series management
- Table format with columns:
  - Transaction name
  - Amount
  - Frequency (weekly, biweekly, monthly)
  - Next occurrence date
  - Edit/Delete actions
- Edits affect all future occurrences
- Can exclude specific dates from recurring series

**Filtering:**
- Can filter by account (URL parameter: `/app/transactions/:accountId`)
- Shows active filter with clear button

**Transaction Features:**
- Add transaction modal with:
  - Description
  - Amount (positive value, sign determined by type)
  - Type (income/expense)
  - Category (expenses only)
  - Account selection
  - Date picker
  - Recurring option with frequency selector (weekly, biweekly, monthly)
  - Edit existing transactions
  - Delete with confirmation

---

### 5. Calendar Page
**Features:**
- Monthly calendar view
- Account filtering (All Accounts or specific account)
- Dropdown selector to choose account
- Each day shows:
  - Day number (top right)
  - Income indicator icon (green up arrow, on hover)
  - Expense indicator icon (red down arrow, on hover)
  - Projected total balance (bold text)
  - Hover tooltips showing transaction details

**Tooltips:**
- Display on hover over income/expense icons
- Shows transaction list with amounts
- Color-coded amounts (green for income, red for expense)
- Positioned above the calendar

**Day Selection:**
- Click to select a day
- Shows detailed view of selected day below calendar:
  - Full date with day name
  - Projected total balance
  - List of all scheduled transactions with amounts

**Navigation:**
- Left/right chevron buttons to change month
- Shows "Month Year" format in center

---

### 6. Reports Page
**Charts & Analytics:**

#### A. Current Month Spending Pie Chart
- "Spending by Category this Month"
- Shows breakdown of one-time expenses by category
- Excludes recurring transactions
- Pie slices with percentage labels
- Legend showing categories
- Colored segments (10+ colors in rotation)

#### B. Historical Monthly Spending Line Chart
- "Monthly Spending Trends"
- Tracks spending by category over 6 months
- X-axis: Month (Jan, Feb, etc.)
- Y-axis: Amount spent
- Multiple lines for different categories
- Category filter buttons below chart
- Shows top 3 categories by default
- Toggleable category display

**Data Calculations:**
- Looks back 6 months
- Aggregates one-time expenses by category
- Excludes recurring transactions
- Formats currency values

---

### 7. Settings Page
**Features:**
- Notification Settings component
  - (Details in separate settings component)

---

### 8. Core UI Components

#### Modals/Dialogs:
1. **TransactionModal** - Add/Edit transactions
   - Full form with all transaction fields
   - Recurring option toggle
   - Frequency selector (only if recurring)
   - Effective date support for recurring transactions

2. **WhatIfModal** - Scenario simulation
   - "What If?" expense simulation
   - Tests impact of hypothetical purchase
   - Doesn't save as real transaction
   - Shows in SimulationBanner while active
   - Inputs: description, amount, date, account

3. **AddGoalModal** - Create savings goals
   - Goal name
   - Target amount
   - Funding account selection
   - Icon/emoji selection

4. **AllocateFundsModal** - Add funds to goal
   - Select goal
   - Amount to allocate
   - Shows available balance from funding account

5. **AddAccountModal** - Add manual accounts
   - Account name
   - Account type (Checking, Savings)
   - Starting balance
   - Cushion amount (safety buffer)

6. **EditAccountModal** - Modify account details
   - Edit any account information

7. **ConfirmDeleteModal** - Delete confirmation
   - Delete transaction confirmation
   - Shows transaction details

8. **UpgradeAccountModal** - Convert guest to real account
   - Prompts guest users to create real account
   - Shows "Save Your Data" message

9. **PlaidLinkModal** - Bank account linking
   - Integrates with Plaid for real bank connections
   - OAuth flow for security

10. **EditRecurringModal** - Edit recurring transaction series
    - Modify master recurring transaction
    - Change frequency, amount, description

#### Form Components:
- `Input` - Text input
- `Select` - Dropdown selector
- `DatePicker` - Date selection
- `CurrencyInput` - Currency amount input with formatting
- `Button` - Standard button
- `Modal` - Base modal wrapper
- `Tabs` - Tabbed interface
- `Tooltip` - Info tooltips

#### Banners:
- **SaveProgressBanner** - Guest mode upgrade prompt
- **SimulationBanner** - Shows active "What If?" scenario with clear button
- **ErrorBanner** - Displays critical errors

---

### 9. Data Models & Collections

#### Accounts Collection (`users/{uid}/accounts`)
```
{
  id: string,
  name: string,
  type: string ("Checking", "Savings"),
  startingBalance: number,
  currentBalance: number,
  cushion: number,
  plaidAccountId?: string (if linked),
  warning?: { type: string, message: string }
}
```

#### Transactions Collection (`users/{uid}/transactions`)
```
{
  id: string,
  description: string,
  amount: number (negative for expenses, positive for income),
  type: string ("income", "expense"),
  category?: string,
  date: Date,
  accountId: string,
  isRecurring: boolean,
  recurringDetails?: {
    frequency: string ("weekly", "biweekly", "monthly"),
    nextDate: Date,
    endDate?: Date,
    excludedDates?: string[] (dates to skip)
  },
  createdAt: Timestamp,
  isInstance?: boolean (for generated instances from recurring)
}
```

#### Goals Collection (`users/{uid}/goals`)
```
{
  id: string,
  goalName: string,
  targetAmount: number,
  allocatedAmount: number,
  fundingAccountId: string,
  icon?: string
}
```

#### Budgets Collection (`users/{uid}/budgets`)
```
{
  id: string,
  category: string,
  limit: number,
  spent: number
}
```

#### Projections (Server-generated, 365-day lookhead)
- Calculated by Firebase Functions
- Shows day-by-day balance projections
- Includes transaction instances
- Used for all forecast displays

---

### 10. Key Features & Capabilities

#### Financial Management:
- Multiple account management (checking, savings, etc.)
- Manual or Plaid-linked accounts
- Cushion/buffer setting per account
- Transaction categorization
- Recurring transaction scheduling (weekly, biweekly, monthly)
- One-time transactions
- Income and expense tracking

#### Forecasting & Projections:
- 60-day balance projections
- Daily projected balances
- Minimum and maximum projected balances
- "What If?" scenario testing
- "Available to Spend" calculation (current balance - cushion - goal allocations)

#### Reporting & Visibility:
- Monthly spending by category (pie chart)
- 6-month spending trends (line chart)
- Activity feed (recent transactions)
- Upcoming bills widget
- Calendar view with transaction indicators
- Account-specific filtering throughout app

#### Goal Setting:
- Create savings goals/envelopes
- Track progress toward goals
- Allocate funds to goals
- Multiple goals per account
- Funding account tracking

#### Notifications:
- Notification settings configuration
- (Backend setup for alerts)

#### Authentication:
- Email/password signup and login
- Google OAuth integration
- Anonymous guest mode (with upgrade prompt)
- Account linking (guest to permanent)
- Logout functionality

#### Data Synchronization:
- Real-time Firebase Firestore updates
- React Firebase Hooks for live data
- Server-side projections triggered on transaction changes

---

### 11. UI/UX Features

#### Visual Design:
- Tailwind CSS styling with custom finch theme:
  - `finch-gray-*` palette
  - `finch-teal-*` accent colors
  - Brand colors: purple, green, red, amber
- Card-based layouts
- Responsive grid layouts
- Rounded corners and shadows
- Color-coded amounts (red for negative, green for positive)

#### Interactive Elements:
- Hover effects on buttons and cards
- Modal dialogs for forms
- Tab interfaces
- Dropdown selectors
- Progress bars
- Charts with hover tooltips
- Editable inline forms
- Confirmation dialogs

#### Accessibility:
- Semantic HTML
- Aria labels and descriptions
- Keyboard navigation support
- Clear labels and placeholders
- Error messages and validation

---

## MOBILE APP - CURRENT IMPLEMENTATION

### Current Screens
**Only 4 main screens implemented:**
1. **SplashScreen** - Loading/authentication check
2. **WelcomeScreen** - Login/signup options
3. **SetupWizardScreen** - Initial account and transaction setup
4. **DashboardScreen** - Main dashboard view
5. **AddTransactionModal** - Add transaction functionality

### Mobile Dashboard Features

#### A. Header
- Finch title
- Sign Out button

#### B. Welcome Section
- Welcome message
- Guest mode indicator

#### C. Guest Upgrade Prompt
- "Save Your Data" section
- Create Account button (currently shows "Coming Soon" alert)

#### D. 60-Day Outlook Card
- Current Balance (aggregated)
- Projected Low (with red color if negative)
- Projected High (with green color)
- Simple calculation based on recurring transactions only
- Hardcoded 60-day projection logic

#### E. Accounts Section
- Account cards showing:
  - Account name and type
  - Current Balance
  - Available to Spend
  - Cushion amount
- Three-column layout in card

#### F. Recent Activity
- Last 10 transactions
- Shows:
  - Transaction name
  - Category (if present)
  - Amount with color coding (green for income, red for expense)
  - Income/Expense prefix (+/-)

#### G. Empty State
- Message when no data exists
- Directs users to setup wizard

#### H. Floating Action Button (FAB)
- Blue button with "+" icon
- Opens Add Transaction Modal

#### I. Add Transaction Modal
- Basic form for adding transactions
- Saves to Firebase

### Mobile Data Fetching
- Real-time listener on accounts collection
- Real-time listener on transactions (limited to 10, ordered by created date desc)
- OnSnapshot subscriptions for live updates
- Unsubscribe on unmount

### Mobile Authentication
- Uses shared AuthProvider from shared-logic
- Sign out functionality
- Guest mode support
- Navigation based on auth state

---

## MAJOR FEATURE GAPS - Mobile Missing Features

### Missing Screen/Pages:
1. **Transactions Page** - No transaction management UI
   - No upcoming/history/recurring tabs
   - No recurring series management
   - No transaction filtering

2. **Calendar Page** - No calendar view
   - No monthly calendar visualization
   - No transaction indicators on dates
   - No date selection
   - No account filtering on calendar

3. **Reports Page** - No analytics/reporting
   - No pie charts for spending by category
   - No line charts for historical trends
   - No category filtering
   - No 6-month trending

4. **Budget Page** - No budget management
   - No budget creation
   - No category-based spending limits
   - No budget progress tracking

5. **Settings Page** - No settings available
   - No notification settings
   - No user preferences

### Missing Dashboard Features:
1. **Budget Section** - No budget status display
2. **Transaction History** - Limited to recent activity
3. **Account Selection** - No filtering by account
4. **Goal/Envelope Management** - Completely missing
   - No goal creation
   - No goal progress tracking
   - No fund allocation
5. **"What If?" Simulation** - Not implemented
6. **Activity Feed** - Shows raw transactions, not formatted feed

### Missing Transaction Features:
1. **Recurring Transaction Management:**
   - No frequency selection (weekly/biweekly/monthly)
   - No recurring series display
   - No master transaction editing
   - No exclusion date management

2. **Transaction Categorization:**
   - Categories not selectable in add transaction
   - No category filtering

3. **Transaction Filtering:**
   - No account-based filtering
   - No date range filtering
   - No category-based filtering

4. **Transaction History:**
   - Only shows last 10
   - No "Upcoming" vs "Past" segregation
   - No full transaction list view

### Missing UI/UX Features:
1. **Navigation Structure:**
   - No bottom tab navigation
   - No side drawer/menu
   - Only stack-based navigation

2. **Modal Features:**
   - Limited form fields in AddTransactionModal
   - No validation visible
   - No error messages

3. **Data Display:**
   - No charts (Recharts not integrated)
   - No calendar view
   - No timeline views

### Missing Data Features:
1. **Real-time Projections:**
   - Hard-coded 60-day calculation
   - Not using server-side projections
   - Only considers recurring transactions

2. **Goal/Envelope System:**
   - Not reading from goals collection
   - No goal tracking

3. **Budget Tracking:**
   - Not reading from budgets collection

### Missing Account Features:
1. **Account Management:**
   - No add account UI
   - No edit account UI
   - No account linking (Plaid integration missing)
   - No cushion setting

2. **Account Filtering:**
   - No transactions filtered by account
   - No account selection for transactions

### Missing Authentication:
1. **Google OAuth** - Only email currently (if that)
2. **Account Linking** - Guest to permanent upgrade path not implemented

---

## Data Flow Comparison

### Web App Data Flow:
1. User logs in → Redirected to setup or dashboard
2. AppLayout fetches:
   - Accounts (real-time)
   - Transactions (real-time)
   - Goals (real-time)
   - Projections (365-day from server)
3. Components receive data via useOutletContext()
4. Data transformations for display:
   - Calculate available to spend
   - Generate transaction instances from recurring
   - Filter and sort for different views
5. User actions trigger:
   - Firebase addDoc/updateDoc/deleteDoc
   - Projection refetch
   - Real-time listeners update UI

### Mobile App Data Flow:
1. User logs in → Shown setup or dashboard
2. DashboardScreen fetches:
   - Accounts (real-time listener)
   - Transactions (real-time listener, limited to 10)
3. Data stored in local state (useState)
4. 60-day calculation done in component
5. User actions:
   - Add transaction (limited form)
   - Sign out

---

## Technical Implementation Details

### Web Stack:
- **Vite** for bundling and dev server
- **React 18** with hooks
- **React Router v6** for navigation
- **Firebase SDK** (web)
- **Recharts** for charting
- **Tailwind CSS** for styling
- **React Hook Form** for forms
- **React Beautiful DnD** for drag-and-drop (if used)

### Mobile Stack:
- **React Native** for cross-platform
- **React Navigation** for screen navigation
- **Firebase React Native** for backend
- **Native components** for UI (no Recharts equivalent yet)
- **Stylesheet API** for styling (similar to CSS-in-JS)

### Shared Code:
- `@shared/logic` package contains:
  - Firebase initialization
  - useAuth hook
  - useProjectedBalancesFromCloud hook
  - Currency formatting utilities
  - Date utilities
  - Available to both web and mobile via package exports

---

## Conclusion

The **web app is feature-complete** with comprehensive financial management, forecasting, reporting, and goal-tracking capabilities. It includes 7 main screens with complex features like recurring transactions, scenario testing, and detailed analytics.

The **mobile app is only in early stages** with just a basic dashboard and add transaction functionality. It's missing:
- 6 out of 7 main screens
- Recurring transaction management
- Transaction history and filtering
- Budgeting and goal tracking
- Advanced forecasting
- Analytics and reports
- Account management
- Settings

To achieve feature parity, the mobile app would need approximately **6-8 additional screens** and significant work on the transaction management system, data display components, and navigation structure.
