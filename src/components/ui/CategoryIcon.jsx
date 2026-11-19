import {
  ShoppingBasket,
  Coffee,
  Car,
  House,
  Plug,
  Cross,
  BookOpen,
  ShoppingBag,
  HandHeart,
  Smartphone,
  Clapperboard,
  Baby,
  Gift,
  BriefcaseBusiness,
  Laptop,
  TrendingUp,
  Tag,
  ArrowDownLeft,
  ArrowRightLeft,
  Landmark,
  Shapes,
  ShieldCheck,
  Sprout,
  Wallet,
} from 'lucide-react';
import { getCategoryAppearance, isCategoryAppearance } from './categoryAppearance.js';

const icons = {
  groceries: ShoppingBasket,
  cafe: Coffee,
  transport: Car,
  home: House,
  utilities: Plug,
  health: Cross,
  education: BookOpen,
  shopping: ShoppingBag,
  charity: HandHeart,
  mobile: Smartphone,
  leisure: Clapperboard,
  kids: Baby,
  gift: Gift,
  salary: BriefcaseBusiness,
  business: Laptop,
  interest: TrendingUp,
  sale: Tag,
  income: ArrowDownLeft,
  transfer: ArrowRightLeft,
  debt: Landmark,
  other: Shapes,
  reserve: ShieldCheck,
  capital: Sprout,
  wallet: Wallet,
};

export default function CategoryIcon({ category, type, appearance, compact = false }) {
  const key =
    isCategoryAppearance(appearance) && icons[appearance] ? appearance : getCategoryAppearance(category, type);
  const Icon = icons[key];
  return (
    <span
      className={`mc-category-icon${compact ? ' mc-category-icon--compact' : ''}`}
      data-category={key}
      aria-hidden="true"
    >
      <Icon size={24} strokeWidth={1.8} />
    </span>
  );
}
