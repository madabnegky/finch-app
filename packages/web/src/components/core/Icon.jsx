import React from 'react';
import {
  HomeIcon,
  SwitchHorizontalIcon,
  ChartPieIcon,
  ChartBarIcon,
  CalendarIcon,
  CogIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EllipsisHorizontalIcon,
  CreditCardIcon,
  BanknotesIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  QuestionMarkCircleIcon,
  KeyIcon,
  ShieldCheckIcon,
  LinkIcon,
  ArrowUpCircleIcon,
  ArrowDownCircleIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  GiftIcon,
  HeartIcon,
  PlayCircleIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  SparklesIcon,
  TruckIcon,
  BuildingLibraryIcon,
  DeviceFloppyIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { ReactComponent as FinchLogoSVG } from '@/assets/images/finch-logo.svg';

const Icon = ({ name, className }) => {
  switch (name) {
    case 'home': return <HomeIcon className={className} />;
    case 'switch-horizontal': return <SwitchHorizontalIcon className={className} />;
    case 'chart-pie': return <ChartPieIcon className={className} />;
    case 'chart-bar': return <ChartBarIcon className={className} />;
    case 'calendar': return <CalendarIcon className={className} />;
    case 'cog': return <CogIcon className={className} />;
    case 'plus': return <PlusIcon className={className} />;
    case 'trash': return <TrashIcon className={className} />;
    case 'pencil': return <PencilIcon className={className} />;
    case 'x': return <XMarkIcon className={className} />;
    case 'exclamation': return <ExclamationTriangleIcon className={className} />;
    case 'check-circle': return <CheckCircleIcon className={className} />;
    case 'information-circle': return <InformationCircleIcon className={className} />;
    case 'chevron-down': return <ChevronDownIcon className={className} />;
    case 'chevron-up': return <ChevronUpIcon className={className} />;
    case 'dots-horizontal': return <EllipsisHorizontalIcon className={className} />;
    case 'credit-card': return <CreditCardIcon className={className} />;
    case 'banknotes': return <BanknotesIcon className={className} />;
    case 'arrow-right': return <ArrowRightIcon className={className} />;
    case 'arrow-left': return <ArrowLeftIcon className={className} />;
    case 'question-mark-circle': return <QuestionMarkCircleIcon className={className} />;
    default: return null;
  }
};

export {
  Icon,
  FinchLogoSVG as FinchLogo,
  ArrowLeftIcon as IconChevronLeft,
  ArrowRightIcon as IconChevronRight,
  ArrowPathIcon as IconRepeat,
  ArrowUpCircleIcon,
  ArrowUpCircleIcon as IconArrowUpCircle,
  ArrowDownCircleIcon,
  ArrowDownCircleIcon as IconArrowDownCircle,
  BanknotesIcon as IconUtensils,
  BuildingLibraryIcon as IconBank,
  CalendarIcon as IconCalendarDays,
  CheckCircleIcon,
  CheckCircleIcon as IconCheckCircle,
  CreditCardIcon,
  CreditCardIcon as IconCreditCard,
  CurrencyDollarIcon as IconDollarSign,
  ExclamationTriangleIcon as IconAlertTriangle,
  GiftIcon,
  HeartIcon,
  HomeIcon as IconHome,
  InformationCircleIcon as IconInfo,
  KeyIcon as IconKey,
  LinkIcon,
  PaperAirplaneIcon as IconPlane,
  PencilIcon,
  PlayCircleIcon,
  PlusIcon as IconPlus,
  DeviceFloppyIcon as IconSave,
  ShieldCheckIcon,
  ShoppingBagIcon as IconShoppingBasket,
  ShoppingCartIcon,
  SparklesIcon,
  TrashIcon,
  TruckIcon as IconCar,
  XMarkIcon as IconX,
  ChevronDownIcon
};

export default Icon;
