import React, { useState } from 'react';
import { SavingGoal } from '../types';
import { Target, PiggyBank, Plus, Calendar, Coins, Trash2, Check, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GoalsProps {
  goals: SavingGoal[];
  onAddGoal: (goal: Omit<SavingGoal, 'id'>) => void;
  onDepositGoal: (id: string, amount: number) => void;
  onDeleteGoal: (id: string) => void;
}

const PALETTE_COLORS = [
  'bg-emerald-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-indigo-500'
];

export default function Goals({ goals, onAddGoal, onDepositGoal, onDeleteGoal }: GoalsProps) {
  // New goal state
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [color, setColor] = useState(PALETTE_COLORS[0]);

  // Deposit state
  const [depositingId, setDepositingId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  // Handle Create Goal
  const handleSubmitGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedTarget = parseFloat(targetAmount);
    if (isNaN(parsedTarget) || parsedTarget <= 0) {
      alert('请输入有效的目标金额');
      return;
    }

    onAddGoal({
      name: name.trim(),
      targetAmount: parsedTarget,
      currentAmount: 0,
      deadline,
      color
    });

    // Reset Form
    setName('');
    setTargetAmount('');
    setDeadline('');
    setColor(PALETTE_COLORS[0]);
    setShowAddForm(false);
  };

  // Handle Deposit submit
  const handleDepositSubmit = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    const parsedAmount = parseFloat(depositAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('请输入有效的存入金额');
      return;
    }

    onDepositGoal(id, parsedAmount);
    setDepositingId(null);
    setDepositAmount('');
  };

  return (
    <div className="space-y-6">
      {/* 顶部标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">梦想储备金 (存钱计划)</h1>
          <p className="text-sm text-slate-500 mt-1">
            设定明确的理财目标，积沙成塔，加速梦想落地。
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" /> 新建存钱目标
        </button>
      </div>

      {/* 创建目标表单 (展开抽屉) */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-slate-50 p-5 rounded-2xl border border-slate-200/50"
          >
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">规划新存钱项目</h3>
            <form onSubmit={handleSubmitGoal} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              {/* 目标名 */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">目标名称</label>
                <input
                  type="text"
                  required
                  placeholder="如：买新电脑、旅游基金、应急周转金"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-emerald-500"
                />
              </div>

              {/* 目标金额 */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">目标储备金 (元)</label>
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-800 outline-none focus:border-emerald-500"
                />
              </div>

              {/* 截止日期 */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">规划达成截止日期</label>
                <input
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 outline-none focus:border-emerald-500"
                />
              </div>

              {/* 主题色 & 提交 */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">项目色彩主题</label>
                  <div className="flex items-center gap-1.5">
                    {PALETTE_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-5 h-5 rounded-full ${c} border-2 transition-all cursor-pointer ${
                          color === c ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer whitespace-nowrap"
                >
                  确定立项
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 目标卡片网格列表 */}
      {goals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map(g => {
            const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
            const isCompleted = pct >= 100;
            const isDepositing = depositingId === g.id;

            return (
              <motion.div
                key={g.id}
                layout
                className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between min-h-[220px] hover:shadow-md transition-shadow relative"
              >
                {/* 装饰性主题彩条 */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl ${g.color}`} />

                {/* 卡片头部：名称、截至日期与删除按钮 */}
                <div className="pt-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-slate-400" />
                        {g.name}
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3" /> 目标截止：{g.deadline}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        if (confirm('确定要放弃并删除这个存钱目标吗？')) {
                          onDeleteGoal(g.id);
                        }
                      }}
                      className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-all cursor-pointer"
                      title="放弃项目"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* 进度环/百分比条 */}
                  <div className="mt-5 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-400">蓄水进度</span>
                      <span className={`font-mono font-bold ${isCompleted ? 'text-emerald-600' : 'text-slate-700'}`}>
                        {pct}%
                      </span>
                    </div>

                    {/* 精致水平进度条 */}
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${g.color}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>

                    {/* 金额数字明细 */}
                    <div className="flex justify-between items-baseline pt-1">
                      <div className="space-x-1">
                        <span className="text-base font-bold font-mono text-slate-800">¥{g.currentAmount.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400 font-medium">已存入</span>
                      </div>
                      <div className="space-x-0.5 text-right">
                        <span className="text-[11px] font-bold font-mono text-slate-500">/ ¥{g.targetAmount.toLocaleString()}</span>
                        <span className="text-[10px] text-slate-400 block">目标储备额</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 卡片底部：存入、加速与完成勋章 */}
                <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-between gap-2 min-h-[44px]">
                  {isCompleted ? (
                    <div className="w-full p-2 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-center gap-1.5 text-xs text-emerald-800 font-bold">
                      <Sparkles className="w-4 h-4 text-yellow-500 animate-pulse" />
                      项目达成！恭喜实现梦想！
                    </div>
                  ) : isDepositing ? (
                    <form onSubmit={(e) => handleDepositSubmit(e, g.id)} className="w-full flex items-center gap-1.5">
                      <span className="text-xs text-slate-400 font-mono font-bold">¥</span>
                      <input
                        type="number"
                        required
                        autoFocus
                        placeholder="存入额"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold font-mono outline-none focus:border-emerald-500"
                      />
                      <button
                        type="submit"
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                      >
                        存入
                      </button>
                      <button
                        type="button"
                        onClick={() => setDepositingId(null)}
                        className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-lg cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  ) : (
                    <div className="w-full flex justify-between gap-2">
                      <button
                        onClick={() => onDepositGoal(g.id, 100)}
                        className="py-1 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-600 transition-colors cursor-pointer"
                      >
                        存100
                      </button>
                      <button
                        onClick={() => onDepositGoal(g.id, 500)}
                        className="py-1 px-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-lg text-[10px] font-bold text-slate-600 transition-colors cursor-pointer"
                      >
                        存500
                      </button>

                      <button
                        onClick={() => setDepositingId(g.id)}
                        className="flex-1 py-1 px-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-lg text-[10px] font-bold text-emerald-800 transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Coins className="w-3 h-3" /> 自定义存款
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
          <PiggyBank className="w-12 h-12 text-slate-300 mb-2" />
          <p className="text-sm font-semibold">暂无存钱目标</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">
            点击右上角“新建存钱目标”，定下一个攒钱计划，我们一同陪伴你离梦想更近。
          </p>
        </div>
      )}
    </div>
  );
}
