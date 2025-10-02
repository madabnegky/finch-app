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