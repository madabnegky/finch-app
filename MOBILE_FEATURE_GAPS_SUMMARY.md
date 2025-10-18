# Mobile App - Feature Gaps Summary

## Quick Overview

The **web app has 7 fully-implemented screens** with comprehensive features.
The **mobile app has only 1 screen** (Dashboard) with basic functionality.

---

## Critical Missing Screens (Priority Order)

### 1. Transactions Page
**Web Implementation:** 3 tabs with advanced features
- **Upcoming Tab:** Next 30 days of transactions with full details
- **History Tab:** Past transaction records with filtering
- **Recurring Series Tab:** Master recurring transaction management (table view)
- **Filters:** Account-based filtering available
- **Operations:** Edit, delete, create new transactions

**Mobile Status:** COMPLETELY MISSING
- No way to view/manage transactions beyond the last 10 in dashboard
- No recurring transaction management
- No filtering or sorting

---

### 2. Calendar Page
**Web Implementation:** Rich interactive calendar
- Monthly calendar view with transaction indicators
- Account filtering dropdown
- Day selection with detailed view
- Income/Expense icons per day
- Hover tooltips showing transactions
- Month navigation

**Mobile Status:** COMPLETELY MISSING
- No calendar view at all
- No date-based transaction visualization

---

### 3. Reports Page
**Web Implementation:** Advanced analytics
- Pie chart: Current month spending by category
- Line chart: 6-month spending trends by category
- Category toggle buttons for trend filtering
- Currency formatting in charts
- Excludes recurring, shows only one-time expenses

**Mobile Status:** COMPLETELY MISSING
- No analytics dashboard
- No spending visualizations
- No trend analysis

---

### 4. Budget Page
**Web Implementation:** Category-based budgeting
- Create budgets per category
- Set monthly spending limits
- Progress bars showing spent vs limit
- Visual indicators (color-coded)
- Displays category name, spent amount, and limit

**Mobile Status:** COMPLETELY MISSING
- No budget management
- No category tracking
- No spending alerts

---

### 5. Settings Page
**Web Implementation:** User preferences
- Notification settings (toggle, frequency, etc.)
- Extensible for additional settings

**Mobile Status:** COMPLETELY MISSING
- No settings interface

---

## Critical Missing Dashboard Features

### 1. Goal/Envelope Management
**Web:** Full section with:
- Multiple goal cards with progress bars
- Goal name with emoji/icon
- Target amount tracking
- Allocated amount display
- "Add" button to allocate funds
- Individual progress calculation

**Mobile:** NOT IMPLEMENTED
- Goals collection not read
- No goal display
- No fund allocation UI

### 2. Budgets Display
**Web:** Shows budget status for all categories
**Mobile:** Not shown

### 3. Account-Specific Filtering
**Web:** Can select account from pills to view:
- Transaction history for that account
- Filtered activity

**Mobile:** No account selection/filtering

### 4. "What If?" Simulation Button
**Web:** Purple button in header for scenario testing
**Mobile:** Not implemented

### 5. Advanced Activity Feed
**Web:** Formatted with:
- Smart date labels ("Today", "Tomorrow", etc.)
- Category information
- Account association
- 30-day window
- Sorted: upcoming first, then past (newest first)

**Mobile:** Basic transaction list
- Only last 10
- No smart formatting
- No category display
- Dump of raw data

---

## Feature-by-Feature Breakdown

### Transaction Management

| Feature | Web | Mobile |
|---------|-----|--------|
| Add one-time transaction | ✓ | ✓ |
| Edit transaction | ✓ | ✗ |
| Delete transaction | ✓ | ✗ |
| Add recurring transaction | ✓ | ✗ |
| Recurring frequencies | ✓ (weekly, biweekly, monthly) | ✗ |
| Edit recurring series | ✓ | ✗ |
| Exclude dates from recurring | ✓ | ✗ |
| Transaction categories | ✓ | ✗ |
| Category filtering | ✓ | ✗ |
| Account filtering | ✓ | ✗ |
| Date range filtering | ✓ (upcoming vs history) | ✗ |
| Full history view | ✓ | Partial (last 10) |
| Upcoming view | ✓ | ✗ |

### Financial Forecasting

| Feature | Web | Mobile |
|---------|-----|--------|
| 60-day outlook | ✓ (server-calculated) | ✓ (hardcoded) |
| Current balance | ✓ | ✓ |
| Projected low | ✓ | ✓ |
| Projected high | ✓ | ✓ |
| Cash flow chart | ✓ | ✗ |
| Daily projections | ✓ | ✗ |
| Account-specific projection | ✓ | ✗ |
| Upcoming bills widget | ✓ | ✗ |

### Goal & Budget Management

| Feature | Web | Mobile |
|---------|-----|--------|
| Create savings goals | ✓ | ✗ |
| Goal progress tracking | ✓ | ✗ |
| Allocate funds to goals | ✓ | ✗ |
| Multiple goals per account | ✓ | ✗ |
| Create budgets | ✓ | ✗ |
| Budget progress tracking | ✓ | ✗ |
| Category budgets | ✓ | ✗ |
| Spending vs limit comparison | ✓ | ✗ |

### Account Management

| Feature | Web | Mobile |
|---------|-----|--------|
| View accounts | ✓ | ✓ |
| Add account | ✓ | ✗ |
| Edit account | ✓ | ✗ |
| Delete account | ✓ | ✗ |
| Plaid linking | ✓ | ✗ |
| Manual account creation | ✓ | ✗ |
| Set cushion/buffer | ✓ | ✗ |
| Account warnings | ✓ | ✗ |
| Available to spend calculation | ✓ | ✓ |

### Analytics & Reporting

| Feature | Web | Mobile |
|---------|-----|--------|
| Monthly spending pie chart | ✓ | ✗ |
| 6-month trend line chart | ✓ | ✗ |
| Category filtering | ✓ | ✗ |
| Category selection | ✓ | ✗ |
| Spending breakdown | ✓ | ✗ |
| Historical comparison | ✓ | ✗ |

### Navigation & UI

| Feature | Web | Mobile |
|---------|-----|--------|
| Top navigation bar | ✓ | ✗ |
| Dashboard link | ✓ | ✓ (static) |
| Calendar link | ✓ | ✗ |
| Transactions link | ✓ | ✗ |
| Reports link | ✓ | ✗ |
| Settings link | ✓ | ✗ |
| Bottom tab navigation | ✗ | ✗ |
| Drawer menu | ✗ | ✗ |
| Tabbed interfaces | ✓ | ✗ |
| Modal dialogs | ✓ | Minimal |
| Charts & visualizations | ✓ (Recharts) | ✗ |
| Calendar view | ✓ | ✗ |

---

## Data & Collections Status

### Collections Being Used

| Collection | Web | Mobile |
|-----------|-----|--------|
| accounts | ✓ Full CRUD | ✓ Read only |
| transactions | ✓ Full CRUD | ✓ Read (limited) |
| goals | ✓ Full CRUD | ✗ Not used |
| budgets | ✓ Full CRUD | ✗ Not used |
| notifications | ✓ Setup | ✗ Not used |

### Projections & Calculations

| Feature | Web | Mobile |
|---------|-----|--------|
| 365-day server projections | ✓ | ✗ |
| Instance generation for recurring | ✓ | ✗ |
| Available to spend calculation | ✓ | ✓ |
| Goal allocation deduction | ✓ | ✗ |
| 60-day calculation method | Server-based | Hardcoded |

---

## Estimated Implementation Effort

### Quick Wins (1-2 screens, ~1 week each)
1. **Transactions Screen** - Mostly copy web logic, use FlatList instead of tables
2. **Settings Screen** - Simple notification toggles

### Medium Effort (1-2 weeks each)
3. **Calendar Screen** - Calendar grid component, different from web approach
4. **Budget Screen** - Simple cards and forms

### Longer Term (2-4 weeks)
5. **Reports/Analytics** - Charting library needed for React Native
6. **Advanced Features** - Goal allocation, Plaid integration

### Total to Feature Parity: **6-12 weeks**

---

## Critical Gaps Summary

### Top 5 Missing Features
1. **Recurring Transaction Management** - Most complex, affects many screens
2. **Transaction History & Filtering** - Core functionality
3. **Analytics & Reports** - Visual insights
4. **Budget Tracking** - Category-based limits
5. **Goal/Envelope System** - Savings tracking

### Biggest Usability Gaps
1. Can't see full transaction history (only last 10)
2. Can't manage recurring transactions at all
3. Can't plan/budget by category
4. No visual analytics or trends
5. No account management (add/edit/delete)

### Technical Gaps
1. No charting library (would need React Native Charts or similar)
2. No calendar component
3. No advanced form handling (react-hook-form not set up)
4. Limited navigation structure (no bottom tabs or drawer)
5. No server-side projection integration

---

## Recommendations

### Immediate (To make mobile functional)
1. Add Transactions screen with basic list
2. Improve AddTransactionModal to match web features
3. Add account selection to transactions

### Short Term (To make mobile useful)
1. Add recurring transaction support
2. Add Calendar screen
3. Add Budget screen
4. Add Settings screen

### Medium Term (To match web functionality)
1. Integrate server-side projections
2. Add Analytics screen with native charting
3. Complete account management
4. Add goal/envelope support

### Long Term (Enhance mobile experience)
1. Add push notifications
2. Add biometric auth
3. Optimize for mobile UX (gestures, native feels)
4. Add offline support
5. Add home screen widgets

