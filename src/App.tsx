import { useState, useEffect } from 'react';
import { Transaction, CategoryBudget, SavingGoal } from './types';
import Dashboard from './components/Dashboard';
import Ledger from './components/Ledger';
import Budgets from './components/Budgets';
import Goals from './components/Goals';
import AiAdvisor from './components/AiAdvisor';
import { ToastProvider } from './components/Toast';
import { 
  BarChart3, FileText, Percent, Target, Sparkles, 
  Wallet, HelpCircle 
} from 'lucide-react';
import { motion } from 'motion/react';

// 初始空数据 — 用户首次使用无示例数据干扰
const INITIAL_TRANSACTIONS: Transaction[] = [];

const INITIAL_BUDGETS: CategoryBudget[] = [];

const INITIAL_GOALS: SavingGoal[] = [];

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const local = localStorage.getItem('flash_transactions');
    return local ? JSON.parse(local) : INITIAL_TRANSACTIONS;
  });

  // Budgets State
  const [budgets, setBudgets] = useState<CategoryBudget[]>(() => {
    const local = localStorage.getItem('flash_budgets');
    return local ? JSON.parse(local) : INITIAL_BUDGETS;
  });

  // Goals State
  const [goals, setGoals] = useState<SavingGoal[]>(() => {
    const local = localStorage.getItem('flash_goals');
    return local ? JSON.parse(local) : INITIAL_GOALS;
  });

  // Sync to LocalStorage on updates
  useEffect(() => {
    localStorage.setItem('flash_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('flash_budgets', JSON.stringify(budgets));
  }, [budgets]);

  useEffect(() => {
    localStorage.setItem('flash_goals', JSON.stringify(goals));
  }, [goals]);

  // A. Add Transaction
  const handleAddTransaction = (t: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = {
      ...t,
      id: Math.random().toString(36).substring(2, 9)
    };
    setTransactions(prev => [newTx, ...prev]);
  };

  // B. Update Transaction
  const handleUpdateTransaction = (id: string, updatedFields: Omit<Transaction, 'id'>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updatedFields } : t));
  };

  // C. Delete Transaction
  const handleDeleteTransaction = (id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  // D. Bulk Import Transactions (Restore backup)
  const handleImportTransactions = (importedList: Transaction[]) => {
    setTransactions(importedList);
  };

  // E. Save Budget
  const handleSaveBudget = (category: string, amount: number) => {
    setBudgets(prev => {
      const exists = prev.some(b => b.category === category);
      if (exists) {
        return prev.map(b => b.category === category ? { ...b, amount } : b);
      } else {
        return [...prev, { category, amount }];
      }
    });
  };

  // F. Create Saving Goal
  const handleAddGoal = (g: Omit<SavingGoal, 'id'>) => {
    const newGoal: SavingGoal = {
      ...g,
      id: Math.random().toString(36).substring(2, 9)
    };
    setGoals(prev => [...prev, newGoal]);
  };

  // G. Deposit into Saving Goal
  const handleDepositGoal = (id: string, amount: number) => {
    setGoals(prev => prev.map(g => {
      if (g.id === id) {
        // Increment goal's progress
        const newAmt = g.currentAmount + amount;
        
        // At the same time, we automatically record this as a "Savings Goal" log transaction inside ledger!
        // To keep the user experience seamless, we record an "expense" classified as "其它" (or we just adjust the goal state).
        // Let's record a tracking expense of category "其它" with remarks showing where it went, which makes sense for Cash-flow tracking!
        handleAddTransaction({
          type: 'expense',
          amount,
          category: '其它',
          date: new Date().toISOString().split('T')[0],
          remarks: `存入储备金：【${g.name}】`
        });

        return {
          ...g,
          currentAmount: parseFloat(newAmt.toFixed(2))
        };
      }
      return g;
    }));
    alert(`成功存入 ¥${amount} 元！并在明细中添加了一笔存钱流水记录。`);
  };

  // H. Delete Saving Goal
  const handleDeleteGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  // I. 清除所有本地数据（重置为初始空状态）
  const handleClearAllData = () => {
    if (confirm('确定要清除所有本地数据吗？此操作不可恢复！')) {
      localStorage.removeItem('flash_transactions');
      localStorage.removeItem('flash_budgets');
      localStorage.removeItem('flash_goals');
      setTransactions([]);
      setBudgets([]);
      setGoals([]);
      alert('所有数据已清除。页面将显示空白状态。');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row antialiased font-sans">
      <ToastProvider>
      
      {/* 1. 侧边栏导航 (Desktop) */}
      <aside className="hidden md:flex md:w-64 bg-slate-900 text-white flex-col justify-between shrink-0 shadow-xl border-r border-slate-800">
        <div>
          {/* Logo 区 */}
          <div className="p-6 border-b border-slate-800 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-black text-sm shadow-md shadow-emerald-500/20">
              闪
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-tight text-white leading-none">小闪智能理财</h1>
              <span className="text-[10px] text-emerald-400 font-bold tracking-wider uppercase mt-1 block">Flash Ledger</span>
            </div>
          </div>

          {/* 导航按钮组 */}
          <nav className="p-4 space-y-1.5">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              财务大盘
            </button>

            <button
              onClick={() => setActiveTab('ledger')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'ledger'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              账目明细
            </button>

            <button
              onClick={() => setActiveTab('budgets')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'budgets'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <Percent className="w-4 h-4 shrink-0" />
              分类预算
            </button>

            <button
              onClick={() => setActiveTab('goals')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'goals'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <Target className="w-4 h-4 shrink-0" />
              梦想储蓄
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer relative ${
                activeTab === 'ai'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
              智能 AI 助手
              <span className="ml-1 px-1.5 py-0.5 rounded text-[8px] font-black bg-rose-500 text-white uppercase tracking-wider animate-bounce flex items-center">
                AI
              </span>
            </button>
          </nav>
        </div>

        {/* 底部信息与备份提示 */}
        <div className="p-4 border-t border-slate-800 text-slate-400 text-[11px] space-y-2">
          <div className="flex items-center gap-1">
            <Wallet className="w-3.5 h-3.5 text-slate-300" />
            <span className="font-semibold text-slate-300">本地离线引擎安全</span>
          </div>
          <p className="leading-relaxed">
            您的数据完全存储在本地，AI 顾问仅在代理请求时做模型分析，保障绝对隐私。
          </p>
          <button
            onClick={handleClearAllData}
            className="text-[10px] text-rose-400/60 hover:text-rose-400 font-semibold transition-colors cursor-pointer pt-1"
          >
            清除所有本地数据
          </button>
        </div>
      </aside>

      {/* 2. 移动端导航头部 (Mobile Only) - 简化: 只显示Logo和当前页面标题 */}
      <header className="md:hidden bg-slate-900 text-white px-5 flex items-center shadow-md" style={{height:'52px'}}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-black text-sm shrink-0">
            闪
          </div>
          <span className="font-bold text-sm truncate">
            {activeTab === 'dashboard' ? '财务大盘' :
             activeTab === 'ledger' ? '账目明细' :
             activeTab === 'budgets' ? '分类预算' :
             activeTab === 'goals' ? '梦想储蓄' :
             activeTab === 'ai' ? 'AI 助手' : '小闪记账'}
          </span>
        </div>
      </header>

      {/* 3. 主内容渲染舞台 - 移动端底部留 padding 给 Tab Bar */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full pb-24 md:pb-8">
        <div className="max-w-6xl mx-auto">
          {/* 所有标签页保持挂载状态，用 CSS 控制显隐。
              避免条件卸载/重装导致 motion 动画重复播放和切换卡顿。 */}
          <div style={{ display: activeTab === 'dashboard' ? '' : 'none' }}>
            <Dashboard 
              transactions={transactions} 
              budgets={budgets} 
              goals={goals} 
              onNavigate={(tab) => setActiveTab(tab)}
            />
          </div>

          <div style={{ display: activeTab === 'ledger' ? '' : 'none' }}>
            <Ledger 
              transactions={transactions} 
              onAddTransaction={handleAddTransaction}
              onUpdateTransaction={handleUpdateTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onImportTransactions={handleImportTransactions}
            />
          </div>

          <div style={{ display: activeTab === 'budgets' ? '' : 'none' }}>
            <Budgets 
              budgets={budgets} 
              transactions={transactions} 
              onSaveBudget={handleSaveBudget}
            />
          </div>

          <div style={{ display: activeTab === 'goals' ? '' : 'none' }}>
            <Goals 
              goals={goals} 
              onAddGoal={handleAddGoal} 
              onDepositGoal={handleDepositGoal} 
              onDeleteGoal={handleDeleteGoal}
            />
          </div>

          <div style={{ display: activeTab === 'ai' ? '' : 'none' }}>
            <AiAdvisor 
              transactions={transactions} 
              budgets={budgets} 
              goals={goals} 
              onAddTransactionFromAi={handleAddTransaction}
            />
          </div>
        </div>
      </main>

      {/* 4. 移动端底部导航 Tab Bar (Mobile Only) — 与微信/支付宝标准底部Tab一致 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-50" style={{paddingBottom:'env(safe-area-inset-bottom, 0px)', height:'calc(56px + env(safe-area-inset-bottom, 0px))'}}>
        <div className="flex items-center justify-evenly w-full h-full">
          {[
            { id: 'dashboard', icon: BarChart3, label: '大盘' },
            { id: 'ledger', icon: FileText, label: '账单' },
            { id: 'budgets', icon: Percent, label: '预算' },
            { id: 'goals', icon: Target, label: '存钱' },
            { id: 'ai', icon: Sparkles, label: 'AI' }
          ].map(item => {
            const isSelected = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center transition-all rounded-xl cursor-pointer active:scale-95 flex-1 max-w-[72px] min-w-0 ${
                  isSelected ? 'text-emerald-400' : 'text-slate-500'
                }`}
                style={{height:'48px'}}
                title={item.label}
              >
                <Icon className={`w-[22px] h-[22px] shrink-0 ${isSelected ? 'drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]' : ''} ${
                  item.id === 'ai' && !isSelected ? 'text-emerald-400/60' : ''
                }`} />
                <span className={`text-[10px] font-bold leading-tight mt-0.5 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      </ToastProvider>
    </div>
  );
}
