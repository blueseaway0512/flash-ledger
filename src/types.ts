export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  remarks?: string;
}

export interface CategoryBudget {
  category: string;
  amount: number;
}

export interface SavingGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string; // YYYY-MM-DD
  color: string; // tailwind color class e.g., 'bg-emerald-500'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string; // HH:MM
  isParsingResult?: boolean;
  parsedData?: {
    type: TransactionType;
    amount: number;
    category: string;
    remarks?: string;
  };
}

export interface FinancialReport {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  score: number; // 0-100
  generatedAt: string;
}

export const EXPENSE_CATEGORIES = [
  '餐饮',
  '购物',
  '服饰',
  '日用',
  '交通',
  '通讯',
  '数码',
  '娱乐',
  '住房',
  '医疗',
  '人情',
  '教育',
  '其它'
];

export const INCOME_CATEGORIES = [
  '工资',
  '兼职',
  '理财',
  '礼金',
  '其它'
];

export const CATEGORY_ICONS: Record<string, string> = {
  '餐饮': 'Utensils',
  '购物': 'ShoppingBag',
  '服饰': 'Shirt',
  '日用': 'Package',
  '交通': 'Car',
  '通讯': 'Smartphone',
  '数码': 'Monitor',
  '娱乐': 'Gamepad2',
  '住房': 'Home',
  '医疗': 'HeartPulse',
  '人情': 'Gift',
  '教育': 'BookOpen',
  '其它': 'FileText',
  '工资': 'Briefcase',
  '兼职': 'TrendingUp',
  '理财': 'Coins',
  '礼金': 'Award'
};
