import React, { useState, useMemo, useRef } from 'react';
import { 
  Transaction, TransactionType, EXPENSE_CATEGORIES, INCOME_CATEGORIES 
} from '../types';
import { CategoryIcon } from './Dashboard';
import { useToast } from './Toast';
import { 
  Search, Filter, Plus, Calendar, Edit2, Trash2, 
  Download, Upload, Check, X, SlidersHorizontal, ArrowLeftRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LedgerProps {
  transactions: Transaction[];
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  onUpdateTransaction: (id: string, t: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
  onImportTransactions: (ts: Transaction[]) => void;
}

export default function Ledger({ 
  transactions, 
  onAddTransaction, 
  onUpdateTransaction, 
  onDeleteTransaction,
  onImportTransactions
}: LedgerProps) {
  // 1. Form States (Add/Edit)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');

  // 2. Filter / Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMonth, setFilterMonth] = useState(''); // YYYY-MM
  const [showFilters, setShowFilters] = useState(false);

  // File input ref for importing
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ success?: boolean; msg?: string } | null>(null);
  const { showToast } = useToast();

  // Categories list based on active selected type in the form
  const availableCategories = useMemo(() => {
    return type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  }, [type]);

  // Adjust category automatically when type toggles to prevent invalid selections
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setCategory(newType === 'expense' ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0]);
  };

  // Submit handler (Add or Update)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('请输入有效的交易金额（必须大于 0）');
      return;
    }

    const payload = {
      type,
      amount: parsedAmount,
      category,
      date,
      remarks: remarks.trim()
    };

    if (editingId) {
      onUpdateTransaction(editingId, payload);
      setEditingId(null);
    } else {
      onAddTransaction(payload);
    }

    // Reset inputs
    setAmount('');
    setRemarks('');
    showToast('success', editingId ? '账目已更新 ✅' : '记账成功 ✅');
  };

  // Edit action
  const handleStartEdit = (t: Transaction) => {
    setEditingId(t.id);
    setType(t.type);
    setAmount(t.amount.toString());
    setCategory(t.category);
    setDate(t.date);
    setRemarks(t.remarks || '');
    // 滚动到表单位置（避开固定头部52px）
    window.scrollTo({ top: 60, behavior: 'smooth' });
  };

  // Cancel Edit
  const handleCancelEdit = () => {
    setEditingId(null);
    setAmount('');
    setRemarks('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  // 3. Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Search remarks & category
      const matchesSearch = 
        t.category.includes(searchQuery) || 
        (t.remarks && t.remarks.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Filter Type
      const matchesType = filterType === 'all' || t.type === filterType;
      
      // Filter Category
      const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
      
      // Filter Month
      const matchesMonth = !filterMonth || t.date.startsWith(filterMonth);

      return matchesSearch && matchesType && matchesCategory && matchesMonth;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id));
  }, [transactions, searchQuery, filterType, filterCategory, filterMonth]);

  // 4. Export to JSON file
  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(transactions, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `智能记账账单备份_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('导出账单备份失败');
    }
  };

  // 5. Import from JSON file
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const rawJson = event.target?.result as string;
        const parsed = JSON.parse(rawJson);

        if (Array.isArray(parsed)) {
          // Quick schema validation
          const isValid = parsed.every(t => 
            t && typeof t.amount === 'number' && t.type && t.category && t.date
          );

          if (isValid) {
            // Guarantee all elements have ids
            const sanitized = parsed.map(t => ({
              ...t,
              id: t.id || Math.random().toString(36).substring(2, 9)
            }));
            onImportTransactions(sanitized);
            setImportStatus({ success: true, msg: `成功导入 ${sanitized.length} 条账目记录！` });
          } else {
            setImportStatus({ success: false, msg: '导入数据格式不规范，请选择合法的记账数据文件' });
          }
        } else {
          setImportStatus({ success: false, msg: '导入文件内容必须为账单数组' });
        }
      } catch (err) {
        setImportStatus({ success: false, msg: '文件解析出错，请确保是正确的 JSON 文件' });
      }
    };
    reader.readAsText(file);
    // Clear input
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* 顶部标题栏 & 备份工具 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">账目明细</h1>
          <p className="text-sm text-slate-500 mt-1">
            录入每一笔收支，让钱流清晰可见。
          </p>
        </div>

        {/* 导入/导出工具 */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200/60 transition-colors cursor-pointer"
            title="导出为 JSON 文件，用于备份"
          >
            <Download className="w-3.5 h-3.5" /> 导出备份
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200/60 transition-colors cursor-pointer"
            title="选择之前导出的 JSON 备份文件恢复数据"
          >
            <Upload className="w-3.5 h-3.5" /> 导入备份
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImport} 
            accept=".json" 
            className="hidden" 
          />
        </div>
      </div>

      {/* 导入状态横幅 */}
      {importStatus && (
        <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium ${
          importStatus.success ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-rose-50 text-rose-800 border-rose-100'
        }`}>
          <span>{importStatus.msg}</span>
          <button onClick={() => setImportStatus(null)} className="p-1 hover:bg-slate-100/50 rounded cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 主体两栏布局：左侧记账输入，右侧账单明细列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左栏：记账表单 (Add/Edit) */}
        <div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm sticky top-6">
            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-3 bg-emerald-500 rounded-full"></span>
              {editingId ? '编辑此笔账目' : '手工记一笔'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 收支类型选择器 */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">账目类型</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => handleTypeChange('expense')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      type === 'expense' 
                        ? 'bg-rose-500 text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    支出记录
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('income')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      type === 'income' 
                        ? 'bg-emerald-600 text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    收入记录
                  </button>
                </div>
              </div>

              {/* 交易金额 */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">交易金额 (元)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm font-semibold font-mono">¥</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white rounded-xl pl-7 pr-3 py-2 text-sm font-bold font-mono text-slate-800 outline-none transition-all"
                  />
                </div>
              </div>

              {/* 品类选择 */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">账目分类</label>
                <div className="grid grid-cols-3 gap-2">
                  {availableCategories.map(c => {
                    const isSelected = category === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCategory(c)}
                        className={`py-2 px-1 text-xs border rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 font-bold' 
                            : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <CategoryIcon name={c} className="w-3.5 h-3.5 p-0.5 bg-transparent" />
                        <span className="text-[10px]">{c}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 记账日期 */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">交易日期</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-700 outline-none transition-all"
                  />
                </div>
              </div>

              {/* 备注 */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">详情备注</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="吃火锅、发季度奖、打车等..."
                  className="w-full bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white rounded-xl px-3 py-2 text-xs font-medium text-slate-700 outline-none transition-all"
                />
              </div>

              {/* 提交按钮组 */}
              <div className="flex gap-2 pt-2">
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                  >
                    取消修改
                  </button>
                )}
                <button
                  type="submit"
                  className={`flex-1 py-2 text-white rounded-xl text-xs font-bold transition-all cursor-pointer text-center shadow-sm ${
                    type === 'expense' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {editingId ? '保存更改' : '录入账单'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 右栏：账单筛选、搜索和流水表格 */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            {/* 顶排搜索和筛选展示开关 */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="搜索分类名称或账目备注..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-700 outline-none transition-all"
                />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  showFilters || filterType !== 'all' || filterCategory !== 'all' || filterMonth
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" /> 
                高级筛选
                {(filterType !== 'all' || filterCategory !== 'all' || filterMonth) && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                )}
              </button>
            </div>

            {/* 高级筛选细项 (展开面板) */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden bg-slate-50/50 rounded-xl p-4 border border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3"
                >
                  {/* 筛选1：交易类型 */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">收支类型</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-600 outline-none"
                    >
                      <option value="all">全类型</option>
                      <option value="expense">支出账单</option>
                      <option value="income">收入账单</option>
                    </select>
                  </div>

                  {/* 筛选2：分类名称 */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">交易分类</label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-600 outline-none"
                    >
                      <option value="all">全分类</option>
                      {EXPENSE_CATEGORIES.map(c => <option key={`exp-${c}`} value={c}>支出 - {c}</option>)}
                      {INCOME_CATEGORIES.map(c => <option key={`inc-${c}`} value={c}>收入 - {c}</option>)}
                    </select>
                  </div>

                  {/* 筛选3：月份账单 */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase">归档月份</label>
                    <input
                      type="month"
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1 text-xs text-slate-600 outline-none"
                    />
                  </div>

                  {/* 清空筛选按钮 */}
                  <div className="sm:col-span-3 flex justify-end">
                    <button
                      onClick={() => {
                        setFilterType('all');
                        setFilterCategory('all');
                        setFilterMonth('');
                        setSearchQuery('');
                      }}
                      className="text-[10px] text-slate-400 font-bold hover:text-emerald-600 cursor-pointer"
                    >
                      清空筛选条件
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 流水明细列表 */}
            <div className="overflow-x-auto min-h-[350px]">
              {filteredTransactions.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {filteredTransactions.map(t => {
                    const isExpense = t.type === 'expense';
                    return (
                      <div 
                        key={t.id} 
                        className="flex items-center py-3.5 hover:bg-slate-50/50 rounded-xl px-2 transition-all group"
                      >
                        {/* 左侧：分类图标 & 备注/时间 */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <CategoryIcon name={t.category} className="w-[30px] h-[30px] text-base bg-slate-50 shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-800">{t.category}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                isExpense ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                              }`}>
                                {isExpense ? '支' : '收'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5 whitespace-nowrap">
                                <Calendar className="w-2.5 h-2.5 shrink-0" />
                                {t.date}
                              </span>
                              {t.remarks && (
                                <span className="text-[10px] text-slate-500 font-medium truncate max-w-[130px] sm:max-w-[200px]">
                                  · {t.remarks}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 右侧：金额固定宽度右对齐 + 操作按钮 */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`w-[105px] text-right text-sm font-bold font-mono tracking-tight whitespace-nowrap ${
                            isExpense ? 'text-rose-500' : 'text-emerald-600'
                          }`}>
                            {isExpense ? '-' : '+'}¥{t.amount.toFixed(2)}
                          </span>

                          {/* 操作按钮（始终可见，便于触屏操作） */}
                          <div className="flex items-center gap-2 ml-1">
                            <button
                              onClick={() => handleStartEdit(t)}
                              className="p-1.5 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg transition-all cursor-pointer active:scale-90"
                              title="编辑分类/金额"
                            >
                              <Edit2 className="w-[18px] h-[18px]" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('确定要删除这笔记账记录吗？')) {
                                  onDeleteTransaction(t.id);
                                  showToast('success', '账目已删除 🗑️');
                                }
                              }}
                              className="p-1.5 hover:bg-rose-50 text-red-300 hover:text-red-500 rounded-lg transition-all cursor-pointer active:scale-90"
                              title="删除此记录"
                            >
                              <Trash2 className="w-[18px] h-[18px]" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200/80">
                  <ArrowLeftRight className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-xs">暂无账目流水，在左侧记一笔，或者调整筛选条件吧！</p>
                </div>
              )}
            </div>
          </div>

          {/* 分页或统计 */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-400 border-t border-slate-100 pt-3 mt-4">
            <span>当前筛选显示 <span className="font-semibold text-slate-700">{filteredTransactions.length}</span> 条账目</span>
            <span className="font-mono whitespace-nowrap">
              总支出: <span className="text-rose-500">-¥{filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}</span> · 
              总收入: <span className="text-emerald-600">+¥{filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0).toFixed(2)}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
