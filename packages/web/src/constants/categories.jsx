import React from 'react';
import {
  IconHome,
  IconCar,
  IconUtensils,
  IconShoppingBasket,
  IconShoppingCart,
  IconHeart,
  IconPlayCircle,
  IconSparkles,
  IconPlane,
  IconGift,
} from "../components/core/Icon";

export const CATEGORIES = {
  'Housing': { icon: IconHome, color: 'text-blue-600' },
  'Transportation': { icon: IconCar, color: 'text-purple-600' },
  'Food': { icon: IconUtensils, color: 'text-orange-600' },
  'Groceries': { icon: IconShoppingBasket, color: 'text-green-600' },
  'Shopping': { icon: IconShoppingCart, color: 'text-pink-600' },
  'Health': { icon: IconHeart, color: 'text-red-600' },
  'Subscriptions': { icon: IconPlayCircle, color: 'text-indigo-600' },
  'Utilities': { icon: () => <span className="text-xl">💡</span>, color: 'text-yellow-600' },
  'Personal Care': { icon: IconSparkles, color: 'text-cyan-600' },
  'Travel': { icon: IconPlane, color: 'text-lime-600' },
  'Gifts & Donations': { icon: IconGift, color: 'text-rose-600' },
  'Entertainment': { icon: () => <span className="text-xl">🎭</span>, color: 'text-amber-600' },
  'Uncategorized': { icon: () => <span className="text-xl">❓</span>, color: 'text-slate-500' },
};

export const getCategoryByName = (name) => {
    return CATEGORIES[name] || CATEGORIES['Uncategorized'];
};