import React from 'react';
import {
  // Icons previously defined
  ShieldCheckIcon, PencilIcon, TrashIcon, ShoppingCartIcon, HeartIcon,
  PlayCircleIcon, SparklesIcon, GiftIcon, ChevronDownIcon, LinkIcon,
  PlusIcon, BanknotesIcon, KeyIcon, CheckCircleIcon, ArrowPathIcon,
  ExclamationTriangleIcon, XMarkIcon, CreditCardIcon, InformationCircleIcon,

  // NEWLY ADDED ICONS (based on the latest errors)
  CalendarDaysIcon,
  CurrencyDollarIcon, // IconDollarSign
  HomeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowUpCircleIcon,
  ArrowDownCircleIcon,
  PaperAirplaneIcon,   // IconPlane
  DocumentArrowDownIcon, // IconSave (alternatively, use BookmarkIcon)

  // Substitutes for icons not in Heroicons
  CakeIcon,            // IconUtensils (Food/Dining substitute)
  TruckIcon,           // IconCar (Transport substitute)
  ShoppingBagIcon,     // IconShoppingBasket (Groceries substitute)

} from '@heroicons/react/24/outline';

// Import the Finch Logo SVG.
import FinchLogoSVG from '@/assets/images/finch-logo.svg?react';


// --- PART 1: NAMED EXPORTS ---
// This resolves errors where files use: import { IconHome } from './Icon'
// We export them directly, renaming them to match the application's expectations.

export const IconShieldCheck = ShieldCheckIcon;
export const IconPencil = PencilIcon;
export const IconTrash = TrashIcon;
export const IconShoppingCart = ShoppingCartIcon;
export const IconHeart = HeartIcon;
export const IconPlayCircle = PlayCircleIcon;
export const IconSparkles = SparklesIcon;
export const IconGift = GiftIcon;
export const IconChevronDown = ChevronDownIcon;
export const IconLink = LinkIcon;
export const IconPlus = PlusIcon;
export const IconBank = BanknotesIcon;
export const IconKey = KeyIcon;
export const IconCheckCircle = CheckCircleIcon;
export const IconRepeat = ArrowPathIcon; // ArrowPathIcon is often used for repeat/sync
export const IconAlertTriangle = ExclamationTriangleIcon;
export const IconX = XMarkIcon;
export const IconCreditCard = CreditCardIcon;
export const IconInfo = InformationCircleIcon;

// New Named Exports
export const IconCalendarDays = CalendarDaysIcon;
export const IconSave = DocumentArrowDownIcon;
export const IconDollarSign = CurrencyDollarIcon;
export const IconHome = HomeIcon;
export const IconChevronLeft = ChevronLeftIcon;
export const IconChevronRight = ChevronRightIcon;
export const IconArrowUpCircle = ArrowUpCircleIcon;
export const IconArrowDownCircle = ArrowDownCircleIcon;
export const IconPlane = PaperAirplaneIcon;

// Substitutes
export const IconUtensils = CakeIcon;
export const IconCar = TruckIcon;
export const IconShoppingBasket = ShoppingBagIcon;

export const FinchLogo = FinchLogoSVG;


// --- PART 2: DEFAULT EXPORT (Dynamic Switcher) ---
// This resolves the error in Navigation.jsx (import Icon from './Icon')

// Create a comprehensive map of all icons for the dynamic component.
const ICONS_MAP = {
  // We use PascalCase keys as this is common when passing component names dynamically.
  'ShieldCheck': ShieldCheckIcon,
  'Pencil': PencilIcon,
  'Trash': TrashIcon,
  'ShoppingCart': ShoppingCartIcon,
  'Heart': HeartIcon,
  'PlayCircle': PlayCircleIcon,
  'Sparkles': SparklesIcon,
  'Gift': GiftIcon,
  'ChevronDown': ChevronDownIcon,
  'Link': LinkIcon,
  'Plus': PlusIcon,
  'Bank': BanknotesIcon,
  'Key': KeyIcon,
  'CheckCircle': CheckCircleIcon,
  'Repeat': ArrowPathIcon,
  'AlertTriangle': ExclamationTriangleIcon,
  'X': XMarkIcon,
  'CreditCard': CreditCardIcon,
  'Info': InformationCircleIcon,
  'CalendarDays': CalendarDaysIcon,
  'Save': DocumentArrowDownIcon,
  'DollarSign': CurrencyDollarIcon,
  'Home': HomeIcon,
  'ChevronLeft': ChevronLeftIcon,
  'ChevronRight': ChevronRightIcon,
  'ArrowUpCircle': ArrowUpCircleIcon,
  'ArrowDownCircle': ArrowDownCircleIcon,
  'Plane': PaperAirplaneIcon,
  'Utensils': CakeIcon,
  'Car': TruckIcon,
  'ShoppingBasket': ShoppingBagIcon,
  'FinchLogo': FinchLogoSVG,
};

/**
 * Dynamic Icon Component
 * It allows rendering icons by name, e.g., <Icon name="Home" />
 */
const Icon = ({ name, className, ...props }) => {
  const IconComponent = ICONS_MAP[name];

  if (!IconComponent) {
    // Helps with debugging if Navigation.jsx uses a name that isn't mapped
    console.warn(`Dynamic Icon name "${name}" not found in ICONS_MAP. Please check Icon.jsx.`);
    return null;
  }

  return <IconComponent className={className} {...props} />;
};

// Export the dynamic component as the default export.
export default Icon;
export function GoogleIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" {...props}>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.804 8.841C34.922 5.395 29.818 3 24 3 10.745 3 0 13.745 0 27s10.745 24 24 24 24-10.745 24-24c0-2.122-.308-4.14-.859-6.083z" />
      <path fill="#FF3D00" d="M6.306 14.691L12.543 19.1c1.453-2.93 4.131-5 7.457-5.021l-7.961-7.96C9.172 8.355 7.155 11.236 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 48c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 40.66 26.714 42 24 42c-4.418 0-8.228-2.586-9.986-6.327l-6.497 5.238C10.024 44.966 16.507 48 24 48z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.14-4.223 5.395l6.19 5.238C42.012 36.37 44 31.886 44 27c0-2.122-.308-4.14-.859-6.083z" />
    </svg>
  );
}