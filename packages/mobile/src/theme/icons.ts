/**
 * Centralized Icon System
 *
 * Material Community Icons reference for the entire app
 * Organized by category for easy discovery and consistency
 */

// Navigation Icons
export const navigationIcons = {
  dashboard: 'view-dashboard',
  goals: 'flag-variant',
  transactions: 'swap-horizontal',
  budget: 'wallet',
  calendar: 'calendar-month',
  reports: 'chart-bar',
  settings: 'cog-outline',
  help: 'lifebuoy',
  about: 'information-outline',
} as const;

// Account Type Icons
export const accountIcons = {
  checking: 'bank',
  savings: 'piggy-bank',
  credit: 'credit-card',
  investment: 'chart-line',
  loan: 'cash-minus',
  mortgage: 'home-variant',
  cash: 'cash',
} as const;

// Transaction Category Icons
export const categoryIcons = {
  // Housing (broad category + specific)
  housing: 'home',
  rent: 'home',
  mortgage: 'home-variant',
  utilities: 'lightning-bolt',
  internet: 'wifi',
  phone: 'cellphone',

  // Food (broad category + specific)
  food: 'food',
  groceries: 'cart',
  dining: 'silverware-fork-knife',
  restaurant: 'silverware-fork-knife',
  coffee: 'coffee',
  fastfood: 'food',

  // Transportation (broad category + specific)
  transportation: 'car',
  transport: 'car',
  gas: 'gas-station',
  parking: 'parking',
  tolls: 'highway',
  uber: 'car',
  transit: 'bus',
  auto_insurance: 'car-shield',
  car: 'car',

  // Shopping (broad category + specific)
  shopping: 'shopping',
  retail: 'shopping',
  clothing: 'hanger',
  electronics: 'laptop',
  books: 'book-open-variant',
  gifts: 'gift',

  // Entertainment (broad category + specific)
  entertainment: 'television',
  movies: 'movie',
  music: 'music',
  games: 'gamepad-variant',
  sports: 'basketball',

  // Health (broad category + specific)
  health: 'hospital-box',
  medical: 'hospital-box',
  doctor: 'doctor',
  pharmacy: 'pill',
  gym: 'dumbbell',
  health_insurance: 'shield-plus',

  // Bills
  electric: 'lightning-bolt',
  water: 'water',
  trash: 'delete',
  cable: 'television',
  streaming: 'netflix',

  // Financial
  transfer: 'bank-transfer',
  payment: 'credit-card-outline',
  fee: 'cash-minus',
  interest: 'percent',
  dividend: 'cash-plus',

  // Income categories
  income: 'cash-plus',
  salary: 'cash-multiple',
  paycheck: 'cash-multiple',
  wage: 'cash-multiple',

  // Insurance
  insurance: 'shield-check',

  // Other
  education: 'school',
  school: 'school',
  childcare: 'baby-carriage',
  pet: 'paw',
  charity: 'hand-heart',
  travel: 'airplane',
  uncategorized: 'help-circle',
  other: 'help-circle',
} as const;

// Action Icons
export const actionIcons = {
  add: 'plus-circle',
  edit: 'pencil',
  delete: 'delete',
  save: 'content-save',
  cancel: 'close-circle',
  search: 'magnify',
  filter: 'filter-variant',
  sort: 'sort',
  refresh: 'refresh',
  share: 'share-variant',
  download: 'download',
  upload: 'upload',
  chevronRight: 'chevron-right',
  chevronLeft: 'chevron-left',
  chevronDown: 'chevron-down',
  chevronUp: 'chevron-up',
  menu: 'menu',
  close: 'close',
  check: 'check',
  info: 'information',
} as const;

// Status Icons
export const statusIcons = {
  success: 'check-circle',
  error: 'alert-circle',
  warning: 'alert',
  info: 'information',
  pending: 'clock-outline',
  completed: 'check-circle-outline',
  cancelled: 'close-circle-outline',
} as const;

// Security Icons
export const securityIcons = {
  lock: 'lock',
  unlock: 'lock-open',
  shield: 'shield-check',
  fingerprint: 'fingerprint',
  eye: 'eye',
  eyeOff: 'eye-off',
} as const;

// Notification Icons
export const notificationIcons = {
  bell: 'bell',
  bellOff: 'bell-off',
  email: 'email',
  message: 'message',
} as const;

// Special/Brand Icons
export const specialIcons = {
  finch: 'bird',
  logo: 'bird',
  star: 'star',
  heart: 'heart',
  fire: 'fire',
  trophy: 'trophy',
  crown: 'crown',
} as const;

// Combine all icons for easy access
export const icons = {
  navigation: navigationIcons,
  account: accountIcons,
  category: categoryIcons,
  action: actionIcons,
  status: statusIcons,
  security: securityIcons,
  notification: notificationIcons,
  special: specialIcons,
} as const;

// Helper function to get category icon by name
export function getCategoryIcon(categoryName: string): string {
  const normalized = categoryName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return categoryIcons[normalized as keyof typeof categoryIcons] || categoryIcons.uncategorized;
}

// Helper function to get account icon by type
export function getAccountIcon(accountType: string): string {
  const normalized = accountType.toLowerCase() as keyof typeof accountIcons;
  return accountIcons[normalized] || accountIcons.checking;
}

export default icons;
