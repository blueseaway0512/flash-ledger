import { useMemo, useState } from 'react';
import { 
  Transaction, CategoryBudget, SavingGoal, EXPENSE_CATEGORIES, CATEGORY_ICONS 
} from '../types';
import { 
  ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, 
  PiggyBank, ShieldAlert, Sparkles, AlertTriangle, ArrowRight 
} from 'lucide-react';
import { motion } from 'motion/react';

// Icon mapping component — 使用 inline-flex 确保图标与文字严格居中对齐
export function CategoryIcon({ name, className = 'w-6 h-6' }: { name: string; className?: string }) {
  const iconMap: Record<string, string> = {
    '餐饮': '🍔', '购物': '🛍️', '服饰': '👔', '日用': '🧼', '交通': '🚗',
    '通讯': '📱', '数码': '💻', '娱乐': '🎮', '住房': '🏠', '医疗': '🏥',
    '人情': '🎁', '教育': '📚', '其它': '📝', '工资': '💼', '兼职': '📈',
    '理财': '🪙', '礼金': '🧧'
  };
  const bgMap: Record<string, string> = {
    '餐饮': 'bg-orange-100 text-orange-600', '购物': 'bg-blue-100 text-blue-600',
    '服饰': 'bg-violet-100 text-violet-600', '日用': 'bg-indigo-100 text-indigo-600',
    '交通': 'bg-teal-100 text-teal-600', '通讯': 'bg-cyan-100 text-cyan-600',
    '数码': 'bg-gray-100 text-gray-600', '娱乐': 'bg-purple-100 text-purple-600',
    '住房': 'bg-amber-100 text-amber-600', '医疗': 'bg-rose-100 text-rose-600',
    '人情': 'bg-pink-100 text-pink-600', '教育': 'bg-sky-100 text-sky-600',
    '其它': 'bg-slate-100 text-slate-600', '工资': 'bg-emerald-100 text-emerald-600',
    '兼职': 'bg-cyan-100 text-cyan-600', '理财': 'bg-yellow-100 text-yellow-600',
    '礼金': 'bg-red-100 text-red-600'
  };
  const bgClass = bgMap[name] || 'bg-slate-100 text-slate-600';
  return <span className={`inline-flex items-center justify-center rounded-lg ${bgClass} ${className}`}>{iconMap[name] || '💵'}</span>;
}

interface DashboardProps {
  transactions: Transaction[];
  budgets: CategoryBudget[];
  goals: SavingGoal[];
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ transactions, budgets, goals, onNavigate }: DashboardProps) {
  const [hoveredDataPoint, setHoveredDataPoint] = useState<{ date: string; balance: number } | null>(null);

  // 1. Calculations
  const stats = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else {
        totalExpense += t.amount;
      }
    });

    const balance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.max(0, Math.min(100, Math.round(((totalIncome - totalExpense) / totalIncome) * 100))) : 0;

    return {
      totalIncome,
      totalExpense,
      balance,
      savingsRate
    };
  }, [transactions]);

  // 2. Spending by category calculation
  const categorySpending = useMemo(() => {
    const map: Record<string, number> = {};
    EXPENSE_CATEGORIES.forEach(c => map[c] = 0);

    transactions.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });

    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const totalExpenseByCategories = useMemo(() => {
    return categorySpending.reduce((acc, curr) => acc + curr.value, 0);
  }, [categorySpending]);

  // 3. Trend calculations (Last 7 Days Balance cumulative)
  const trendData = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Group all transactions by date
    const dateMap: Record<string, { income: number; expense: number }> = {};
    
    // Populate last 7 days with zeros initially to guarantee a trend
    const last7Days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      last7Days.push(dateStr);
      dateMap[dateStr] = { income: 0, expense: 0 };
    }

    // Accumulate transactions
    sorted.forEach(t => {
      const dStr = t.date;
      if (!dateMap[dStr]) {
        dateMap[dStr] = { income: 0, expense: 0 };
      }
      if (t.type === 'income') {
        dateMap[dStr].income += t.amount;
      } else {
        dateMap[dStr].expense += t.amount;
      }
    });

    // We can compute cumulative balance up to each day
    let cumulative = 0;
    // To make a realistic trend, let's first compute the starting cumulative balance prior to the 7-day window
    const first7DayStr = last7Days[0];
    const priorTransactions = sorted.filter(t => t.date < first7DayStr);
    priorTransactions.forEach(t => {
      if (t.type === 'income') cumulative += t.amount;
      else cumulative -= t.amount;
    });

    const data = last7Days.map(date => {
      const dayData = dateMap[date];
      cumulative += (dayData.income - dayData.expense);
      return {
        date: date.substring(5), // MM-DD
        balance: cumulative,
        fullDate: date
      };
    });

    return data;
  }, [transactions]);

  // SVG dimensions for trend chart
  const chartWidth = 500;
  const chartHeight = 180;
  const paddingLeft = 40;
  const paddingRight = 30;
  const paddingTop = 20;
  const paddingBottom = 30;

  const trendSvgPathAndPoints = useMemo(() => {
    if (trendData.length === 0) return { path: '', area: '', points: [] };

    const balances = trendData.map(d => d.balance);
    const minBal = Math.min(...balances, 0);
    const maxBal = Math.max(...balances, 100);
    const balRange = maxBal - minBal === 0 ? 100 : maxBal - minBal;

    const points = trendData.map((d, index) => {
      const x = paddingLeft + (index / (trendData.length - 1)) * (chartWidth - paddingLeft - paddingRight);
      const y = chartHeight - paddingBottom - ((d.balance - minBal) / balRange) * (chartHeight - paddingTop - paddingBottom);
      return { x, y, balance: d.balance, date: d.fullDate };
    });

    // Build SVG path
    let pathD = '';
    let areaD = '';

    if (points.length > 0) {
      pathD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        pathD += ` L ${points[i].x} ${points[i].y}`;
      }

      // Close the path to make an filled area
      const bottomY = chartHeight - paddingBottom;
      areaD = `${pathD} L ${points[points.length - 1].x} ${bottomY} L ${points[0].x} ${bottomY} Z`;
    }

    return { path: pathD, area: areaD, points };
  }, [trendData]);

  // 4. Budget progress warnings
  const budgetAlerts = useMemo(() => {
    return budgets.map(b => {
      const categorySpend = transactions
        .filter(t => t.type === 'expense' && t.category === b.category)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const ratio = b.amount > 0 ? (categorySpend / b.amount) * 100 : 0;
      return {
        category: b.category,
        budget: b.amount,
        spent: categorySpend,
        ratio: Math.round(ratio)
      };
    }).filter(b => b.ratio >= 80) // 80% or more used
      .sort((a, b) => b.ratio - a.ratio);
  }, [transactions, budgets]);

  return (
    <div className="space-y-6">
      {/* 顶部标题栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">财务大盘</h1>
          <p className="text-sm text-slate-500 mt-1">
            一目了然的资金状况、开销分类与储蓄概览。
          </p>
        </div>
        <button
          onClick={() => onNavigate('ledger')}
          className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer self-start sm:self-auto shadow-sm"
        >
          <span className="font-bold">+</span> 记一笔账
        </button>
      </div>

      {/* 第一行：四大财务核心卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 卡片：总账户余额 */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[120px]"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 tracking-wider">当前净资产</span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900 font-mono whitespace-nowrap">
                ¥{stats.balance.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <span>净蓄水（总收入 - 总支出）</span>
          </div>
        </motion.div>

        {/* 卡片：总收入 */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[120px]"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 tracking-wider">累计总收入</span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900 font-mono text-emerald-600 whitespace-nowrap">
                +¥{stats.totalIncome.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            共录入 <span className="font-semibold text-slate-700">{transactions.filter(t => t.type === 'income').length}</span> 笔收入
          </div>
        </motion.div>

        {/* 卡片：总支出 */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[120px]"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 tracking-wider">累计总支出</span>
              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-slate-900 font-mono text-rose-500 whitespace-nowrap">
                -¥{stats.totalExpense.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2">
            共录入 <span className="font-semibold text-slate-700">{transactions.filter(t => t.type === 'expense').length}</span> 笔支出
          </div>
        </motion.div>

        {/* 卡片：储蓄率 */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[120px]"
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 tracking-wider">当前资产蓄水率</span>
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <PiggyBank className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900 font-mono">
                {stats.savingsRate}%
              </span>
              <span className="text-xs font-medium text-slate-400">（推荐 &gt; 30%）</span>
            </div>
          </div>
          {/* 简易水平进度条 */}
          <div className="mt-3 relative">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  stats.savingsRate >= 40 ? 'bg-emerald-500' : stats.savingsRate >= 20 ? 'bg-yellow-500' : 'bg-rose-500'
                }`}
                style={{ width: `${stats.savingsRate}%` }}
              ></div>
            </div>
            {/* 30% 推荐线标记 */}
            <div className="absolute top-0 left-[30%] w-px h-2 bg-white/60" title="推荐蓄水率 ≥30%" />
          </div>
        </motion.div>
      </div>

      {/* 第二行：趋势线图 与 开消构成比例 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧及中间：7日资金变动趋势 */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  最近 7 天账户净额趋势
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">累积总资产的每日推移情况。</p>
              </div>
              {hoveredDataPoint && (
                <div className="text-right">
                  <p className="text-xs text-slate-400">{hoveredDataPoint.date}</p>
                  <p className="text-sm font-bold font-mono text-emerald-600">¥{hoveredDataPoint.balance.toFixed(2)}</p>
                </div>
              )}
            </div>

            {/* SVG 趋势折线图 */}
            <div className="relative h-[180px] w-full">
              {trendData.length > 1 ? (
                <svg className="w-full h-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.2"/>
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
                    </linearGradient>
                  </defs>

                  {/* 网格水平线 */}
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                    const y = paddingTop + ratio * (chartHeight - paddingTop - paddingBottom);
                    return (
                      <line 
                        key={idx}
                        x1={paddingLeft} 
                        y1={y} 
                        x2={chartWidth - paddingRight} 
                        y2={y} 
                        stroke="#f1f5f9" 
                        strokeWidth="1" 
                      />
                    );
                  })}

                  {/* 阴影渐变面积区域 */}
                  {trendSvgPathAndPoints.area && (
                    <path 
                      d={trendSvgPathAndPoints.area} 
                      fill="url(#chartGradient)" 
                    />
                  )}

                  {/* 主趋势折线 */}
                  {trendSvgPathAndPoints.path && (
                    <path 
                      d={trendSvgPathAndPoints.path} 
                      fill="none" 
                      stroke="#10b981" 
                      strokeWidth="2.5" 
                      strokeLinecap="round"
                    />
                  )}

                  {/* 交互圆点和文字轴标 */}
                  {trendSvgPathAndPoints.points.map((p, idx) => {
                    const isHovered = hoveredDataPoint?.fullDate === p.date;
                    return (
                      <g key={idx}>
                        {/* X 轴日期 */}
                        <text 
                          x={p.x} 
                          y={chartHeight - 10} 
                          textAnchor="middle" 
                          fill="#94a3b8" 
                          fontSize="10" 
                          className="font-mono"
                        >
                          {trendData[idx].date}
                        </text>

                        {/* 数据圆点 */}
                        <circle 
                          cx={p.x} 
                          cy={p.y} 
                          r={isHovered ? 6 : 4} 
                          fill={isHovered ? '#059669' : '#10b981'} 
                          stroke="#ffffff"
                          strokeWidth="2"
                          className="transition-all duration-150 cursor-pointer"
                          onMouseEnter={() => setHoveredDataPoint({ date: p.date, balance: p.balance })}
                          onMouseLeave={() => setHoveredDataPoint(null)}
                        />
                      </g>
                    );
                  })}
                </svg>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs">数据不足，记录至少两天账单后将生成趋势大盘。</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧：支出品类配比榜 */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">支出品类配比</h3>
            <p className="text-xs text-slate-400 mt-0.5">占比最高的消费项目排行。</p>

            <div className="mt-5 space-y-4 pr-1">
              {categorySpending.length > 0 ? (
                categorySpending.map((item, index) => {
                  const pct = totalExpenseByCategories > 0 ? Math.round((item.value / totalExpenseByCategories) * 100) : 0;
                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-400">#{index + 1}</span>
                          <CategoryIcon name={item.name} className="w-3.5 h-3.5 p-1 bg-slate-50" />
                          <span className="font-semibold text-slate-700">{item.name}</span>
                        </div>
                        <div className="font-mono text-slate-500">
                          ¥{item.value.toFixed(0)} <span className="text-slate-400">({pct}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-50 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-[160px] text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs">暂无支出明细，开始记账吧！</p>
                </div>
              )}
            </div>
          </div>

          <button 
            onClick={() => onNavigate('ledger')}
            className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold mt-4 transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            查看完整的流水账单 <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 第三行：预算预警 与 存钱目标 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 预算红线与预警 */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                超支风险预警 (&gt;80%)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">密切监督即将用尽或已超额的分类预算。</p>
            </div>
            <button 
              onClick={() => onNavigate('budgets')}
              className="text-xs text-emerald-600 font-semibold hover:underline cursor-pointer"
            >
              配置预算
            </button>
          </div>

          <div className="space-y-4 max-h-[200px] overflow-y-auto">
            {budgetAlerts.length > 0 ? (
              budgetAlerts.map(b => (
                <div key={b.category} className="p-3 bg-rose-50/50 rounded-xl border border-rose-100/50 flex flex-col justify-between gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CategoryIcon name={b.category} />
                      <span className="text-xs font-bold text-slate-800">{b.category}分类</span>
                    </div>
                    <span className={`text-xs font-bold ${b.ratio >= 100 ? 'text-rose-600' : 'text-amber-600'}`}>
                      已消耗 {b.ratio}%
                    </span>
                  </div>

                  <div className="w-full bg-rose-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${b.ratio >= 100 ? 'bg-rose-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(100, b.ratio)}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-400">
                    <span>已花: ¥{b.spent.toFixed(1)}</span>
                    <span>限额: ¥{b.budget.toFixed(0)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <ShieldAlert className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs text-center px-4">
                  太棒了！目前没有超支预警，所有分类预算均在安全范围内。
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 存钱目标进度 */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  攒钱梦想清单
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">梦想的累积进度条，持续添砖加瓦！</p>
              </div>
              <button 
                onClick={() => onNavigate('goals')}
                className="text-xs text-emerald-600 font-semibold hover:underline cursor-pointer"
              >
                全部目标
              </button>
            </div>

            <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
              {goals.length > 0 ? (
                goals.slice(0, 3).map(g => {
                  const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0;
                  return (
                    <div key={g.id} className="p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{g.name}</p>
                          <p className="text-[10px] text-slate-400">截止日期：{g.deadline}</p>
                        </div>
                        <span className="text-xs font-bold font-mono text-emerald-600">
                          {pct}%
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        ></div>
                      </div>

                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>已蓄：¥{g.currentAmount.toLocaleString()}</span>
                        <span className="text-slate-400">目标：¥{g.targetAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <PiggyBank className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs">还没有立下存钱目标，快去列出你的梦想清单吧！</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
