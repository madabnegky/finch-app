import React from 'react';
import {
  ShieldCheckIcon, PencilIcon, TrashIcon, ShoppingCartIcon, HeartIcon,
  PlayCircleIcon, SparklesIcon, GiftIcon, ChevronDownIcon, LinkIcon,
  PlusIcon, BanknotesIcon, KeyIcon, CheckCircleIcon, ArrowPathIcon,
  ExclamationTriangleIcon, XMarkIcon, CreditCardIcon, InformationCircleIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  HomeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowUpCircleIcon,
  ArrowDownCircleIcon,
  PaperAirplaneIcon,
  DocumentArrowDownIcon,
  CakeIcon,
  TruckIcon,
  ShoppingBagIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

import finchLogoUrl from '@shared-assets/images/finch-logo.svg?url';

// --- THIS IS THE FIX ---
// This helper function ensures that any props (like className) are correctly
// passed to the underlying Heroicon component. This fixes the sizing issue.
const createIcon = (IconComponent) => (props) => <IconComponent {...props} />;

export const FinchLogo = (props) => {
  return <img src={finchLogoUrl} alt="Finch Logo" {...props} />;
};

export const IconShieldCheck = createIcon(ShieldCheckIcon);
export const IconPencil = createIcon(PencilIcon);
export const IconTrash = createIcon(TrashIcon);
export const IconShoppingCart = createIcon(ShoppingCartIcon);
export const IconHeart = createIcon(HeartIcon);
export const IconPlayCircle = createIcon(PlayCircleIcon);
export const IconSparkles = createIcon(SparklesIcon);
export const IconGift = createIcon(GiftIcon);
export const IconChevronDown = createIcon(ChevronDownIcon);
export const IconLink = createIcon(LinkIcon);
export const IconPlus = createIcon(PlusIcon);
export const IconBank = createIcon(BanknotesIcon);
export const IconKey = createIcon(KeyIcon);
export const IconCheckCircle = createIcon(CheckCircleIcon);
export const IconRepeat = createIcon(ArrowPathIcon);
export const IconAlertTriangle = createIcon(ExclamationTriangleIcon);
export const IconX = createIcon(XMarkIcon);
export const IconCreditCard = createIcon(CreditCardIcon);
export const IconInfo = createIcon(InformationCircleIcon);
export const IconCalendarDays = createIcon(CalendarDaysIcon);
export const IconSave = createIcon(DocumentArrowDownIcon);
export const IconDollarSign = createIcon(CurrencyDollarIcon);
export const IconHome = createIcon(HomeIcon);
export const IconChevronLeft = createIcon(ChevronLeftIcon);
export const IconChevronRight = createIcon(ChevronRightIcon);
export const IconArrowUpCircle = createIcon(ArrowUpCircleIcon);
export const IconArrowDownCircle = createIcon(ArrowDownCircleIcon);
export const IconPlane = createIcon(PaperAirplaneIcon);
export const IconUtensils = createIcon(CakeIcon);
export const IconCar = createIcon(TruckIcon);
export const IconShoppingBasket = createIcon(ShoppingBagIcon);
export const IconChartBar = createIcon(ChartBarIcon);

const ICONS_MAP = {
  'ShieldCheck': IconShieldCheck,
  'Pencil': IconPencil,
  'Trash': IconTrash,
  'ShoppingCart': IconShoppingCart,
  'Heart': IconHeart,
  'PlayCircle': IconPlayCircle,
  'Sparkles': IconSparkles,
  'Gift': IconGift,
  'ChevronDown': IconChevronDown,
  'Link': IconLink,
  'Plus': IconPlus,
  'Bank': IconBank,
  'Key': IconKey,
  'CheckCircle': IconCheckCircle,
  'Repeat': IconRepeat,
  'AlertTriangle': IconAlertTriangle,
  'X': IconX,
  'CreditCard': IconCreditCard,
  'Info': IconInfo,
  'CalendarDays': IconCalendarDays,
  'Save': IconSave,
  'DollarSign': IconDollarSign,
  'Home': IconHome,
  'ChevronLeft': IconChevronLeft,
  'ChevronRight': IconChevronRight,
  'ArrowUpCircle': IconArrowUpCircle,
  'ArrowDownCircle': IconArrowDownCircle,
  'Plane': IconPlane,
  'Utensils': IconUtensils,
  'Car': IconCar,
  'ShoppingBasket': IconShoppingBasket,
  'ChartBar': IconChartBar,
  'FinchLogo': FinchLogo,
};

const Icon = ({ name, className, ...props }) => {
  const IconComponent = ICONS_MAP[name];
  if (!IconComponent) {
    console.warn(`Dynamic Icon name "${name}" not found in ICONS_MAP.`);
    return null;
  }
  return <IconComponent className={className} {...props} />;
};

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