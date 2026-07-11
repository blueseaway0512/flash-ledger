import { useState, useMemo } from 'react';
import { CategoryBudget, EXPENSE_CATEGORIES, Transaction } from '../types';
import { CategoryIcon } from './Dashboard';
import { Edit2, ShieldAlert, BadgePercent, Check, X, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface BudgetsProps {
  budgets: CategoryBudget[];
  transactions: Transaction[];
  onSaveBudget: (category: string, amount: number) => void;
}

export default function Budgets({ budgets, transactions, onSaveBudget }: BudgetsProps) {
  // Config state for each category
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');

  // 1. Calculate category spent amount (total overall of active expenses)
  const categorySpentMap = useMemo(() => {
    const map: Record<string, number> = {};
    EXPENSE_CATEGORIES.forEach(c => map[c] = 0);
    
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        if (map[t.category] !== undefined) {
          map[t.category] += t.amount;
        } else {
          map[t.category] = t.amount;
        }
      });
    return map;
  }, [transactions]);

  // 2. Budget mapping list
  const budgetItems = useMemo(() => {
    const budgetMap: Record<string, number> = {};
    budgets.forEach(b => budgetMap[b.category] = b.amount);

    return EXPENSE_CATEGORIES.map(category => {
      const budgetAmount = budgetMap[category] || 0;
      const spent = categorySpentMap[category] || 0;
      const remaining = Math.max(0, budgetAmount - spent);
      const ratio = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

      return {
        category,
        budget: budgetAmount,
        spent,
        remaining,
        ratio: Math.round(ratio)
      };
    });
  }, [budgets, categorySpentMap]);

  // Edit action
  const handleStartEdit = (category: string, currentBudget: number) => {
    setEditingCategory(category);
    setEditAmount(currentBudget > 0 ? currentBudget.toString() : '');
  };

  // Save budget
  const handleSave = (category: string) => {
    const parsed = parseFloat(editAmount);
    if (isNaN(parsed) || parsed < 0) {
      alert('请输入有效的预算数额（必须为正数）');
      return;
    }
    onSaveBudget(category, parsed);
    setEditingCategory(null);
  };

  return (
    <div className="space-y-6">
      {/* 顶部标题栏 */}
      <div className="border-b border-slate-100 pb-4">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">分类预算</h1>
        <p className="text-sm text-slate-500 mt-1">
          设定品类开销限额，精细化配置收支流向。
        </p>
      </div>

      {/* 预算汇总指标卡 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 指标：总预算 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-400">总月度预算</span>
          <span className="text-xl font-bold font-mono text-slate-800 mt-2">
            ¥{budgetItems.reduce((acc, b) => acc + b.budget, 0).toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 mt-1">所有分类配置的预算之和</span>
        </div>

        {/* 指标：已消耗 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-400">已用预算额</span>
          <span className="text-xl font-bold font-mono text-rose-500 mt-2">
            ¥{budgetItems.reduce((acc, b) => acc + (b.budget > 0 ? b.spent : 0), 0).toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 mt-1">在已配置预算的品类中的累计花费</span>
        </div>

        {/* 指标：总余量 */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-400 font-medium">可用余额</span>
          <span className="text-xl font-bold font-mono text-emerald-600 mt-2">
            ¥{budgetItems.reduce((acc, b) => acc + (b.budget > 0 ? b.remaining : 0), 0).toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 mt-1">已配预算分类剩余的安全可用额</span>
        </div>
      </div>

      {/* 预算条目表格与进度条 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-5">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <BadgePercent className="w-4 h-4 text-emerald-500" />
          品类预算进度板
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgetItems.map(item => {
            const isEditing = editingCategory === item.category;
            const hasBudget = item.budget > 0;
            
            // Progress Bar Color
            let barColorClass = 'bg-emerald-500';
            let textColorClass = 'text-emerald-600';
            let bgColorClass = 'bg-emerald-50';
            
            if (item.ratio > 100) {
              barColorClass = 'bg-rose-500';
              textColorClass = 'text-rose-600';
              bgColorClass = 'bg-rose-50';
            } else if (item.ratio > 80) {
              barColorClass = 'bg-amber-500';
              textColorClass = 'text-amber-600';
              bgColorClass = 'bg-amber-50';
            } else if (item.ratio > 50) {
              barColorClass = 'bg-blue-500';
              textColorClass = 'text-blue-600';
              bgColorClass = 'bg-blue-50';
            }

            return (
              <div 
                key={item.category} 
                className={`p-4 border rounded-xl flex flex-col justify-between gap-3 transition-all ${
                  hasBudget 
                    ? item.ratio > 100 
                      ? 'bg-rose-50/20 border-rose-100' 
                      : 'bg-white border-slate-100 hover:border-slate-200' 
                    : 'bg-slate-50/40 border-slate-100 border-dashed'
                } min-h-[180px]`}
              >
                {/* 顶排：图标、分类名和编辑选项 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <CategoryIcon name={item.category} />
                    <div>
                      <span className="text-xs font-bold text-slate-800">{item.category}分类</span>
                      {!hasBudget && (
                        <span className="text-[10px] text-slate-400 ml-2 font-medium">（未配置预算）</span>
                      )}
                    </div>
                  </div>

                  {/* 预算设定按钮 */}
                  <div className="flex items-center gap-1.5">
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400 font-mono">¥</span>
                        <input
                          type="number"
                          autoFocus
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          placeholder="限额"
                          className="w-16 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-xs font-bold font-mono outline-none focus:border-emerald-500"
                        />
                        <button 
                          onClick={() => handleSave(item.category)}
                          className="p-1 hover:bg-emerald-50 text-emerald-600 rounded cursor-pointer"
                          title="确定"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setEditingCategory(null)}
                          className="p-1 hover:bg-slate-100 text-slate-400 rounded cursor-pointer"
                          title="取消"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartEdit(item.category, item.budget)}
                        className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                        title="设置预算"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 进度显示 (如果设置了预算) */}
                {hasBudget ? (
                  <div className="space-y-1.5 flex-1 flex flex-col justify-center">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">预算进度</span>
                      <span className={`font-mono font-bold ${textColorClass}`}>
                        {item.ratio}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${barColorClass}`}
                        style={{ width: `${Math.min(100, item.ratio)}%` }}
                      ></div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>已花: ¥{item.spent.toFixed(1)}</span>
                      <span>限额: ¥{item.budget.toFixed(0)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-2.5 flex-1 flex items-center justify-center text-xs text-slate-400 bg-slate-100/50 rounded-lg">
                    <span className="text-[10px] text-slate-400">点击右侧编辑图标为该分类设定限额</span>
                  </div>
                )}

                {/* 超支友情提醒卡片 */}
                {hasBudget && item.ratio > 100 && (
                  <div className="p-2 bg-rose-50/50 rounded-lg border border-rose-100/30 flex items-center gap-1.5 mt-1 text-[10px] text-rose-700">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>该分类已超支 ¥{(item.spent - item.budget).toFixed(1)}，请适当削减此类开支。</span>
                  </div>
                )}
                
                {hasBudget && item.ratio <= 100 && item.ratio >= 80 && (
                  <div className="p-2 bg-amber-50/50 rounded-lg border border-amber-100/30 flex items-center gap-1.5 mt-1 text-[10px] text-amber-700">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>余额告急！该分类预算仅剩 ¥{item.remaining.toFixed(1)} 可用。</span>
                  </div>
                )}
                
                {hasBudget && item.ratio < 80 && (
                  <div className="p-2 bg-emerald-50/50 rounded-lg border border-emerald-100/30 flex items-center gap-1.5 mt-1 text-[10px] text-emerald-700">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>表现完美！该分类开销保持在极度安全的区间内。</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
