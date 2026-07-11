import { useState, useRef, useEffect } from 'react';
import { 
  Transaction, CategoryBudget, SavingGoal, ChatMessage, FinancialReport 
} from '../types';
import { CategoryIcon } from './Dashboard';
import { useToast } from './Toast';
import { 
  Sparkles, MessageSquare, Brain, Send, Check, X, 
  RefreshCw, ClipboardList, TrendingUp, AlertCircle, CheckCircle2, ChevronRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Simple parser to render basic markdown in chat (bold, lists, code)
function SimpleMarkdown({ text }: { text: string }) {
  if (!text) return null;

  // Split text by lines
  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 text-xs text-slate-700 leading-relaxed font-medium">
      {lines.map((line, idx) => {
        let content = line;
        
        // Handle headers e.g. "### Title"
        if (content.startsWith('### ')) {
          return <h4 key={idx} className="text-sm font-bold text-slate-900 pt-2 mb-1 flex items-center gap-1">✨ {content.replace('### ', '')}</h4>;
        }
        if (content.startsWith('## ')) {
          return <h3 key={idx} className="text-base font-bold text-slate-900 pt-3 mb-1 flex items-center gap-1.5 border-b border-slate-100 pb-1">⚡ {content.replace('## ', '')}</h3>;
        }

        // Handle bullet lists
        let isBullet = false;
        if (content.startsWith('- ') || content.startsWith('* ')) {
          isBullet = true;
          content = content.substring(2);
        }

        // Handle bold parsing: **bold**
        const boldRegex = /\*\*(.*?)\*\*/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = boldRegex.exec(content)) !== null) {
          if (match.index > lastIndex) {
            parts.push(content.substring(lastIndex, match.index));
          }
          parts.push(<strong key={match.index} className="font-bold text-slate-900">{match[1]}</strong>);
          lastIndex = boldRegex.lastIndex;
        }

        if (lastIndex < content.length) {
          parts.push(content.substring(lastIndex));
        }

        const formattedContent = parts.length > 0 ? parts : content;

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-2">
              <span className="text-emerald-500 shrink-0 select-none font-bold">•</span>
              <span>{formattedContent}</span>
            </div>
          );
        }

        return <p key={idx} className={line.trim() === '' ? 'h-2' : ''}>{formattedContent}</p>;
      })}
    </div>
  );
}

interface AiAdvisorProps {
  transactions: Transaction[];
  budgets: CategoryBudget[];
  goals: SavingGoal[];
  onAddTransactionFromAi: (t: Omit<Transaction, 'id'>) => void;
}

export default function AiAdvisor({ 
  transactions, 
  budgets, 
  goals, 
  onAddTransactionFromAi 
}: AiAdvisorProps) {
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'parse' | 'report'>('parse');

  // 1. NLP Bookkeeping States
  const [nlpInput, setNlpInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedCard, setParsedCard] = useState<any | null>(null);

  // 2. Chat Advisory States
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content: '你好！我是你的专属 **小闪 AI 财务顾问**。我们可以聊一聊理财妙招、省钱计划、或者根据你录入的数据来诊断日常的账单合理性。你可以试着问我：“可以根据我的账单给我一些理财建议吗？”',
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isChatting, setIsChatting] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // 3. Health Report States
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const { showToast } = useToast();

  // Auto scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isChatting]);

  // Examples list for speedy demo
  const nlpExamples = [
    '今天中午和同事吃面花了 45.5 元',
    '今天兼职写代码赚了 1500 块发在微信上',
    '买了一双运动鞋支出 499 元，购物大出血',
    '打车上班坐地铁花费了 18 元'
  ];

  const chatSuggestions = [
    '分析我目前的消费大头和省钱机会',
    '我该如何进行科学的财务预算规划？',
    '请问什么是 50/30/20 理财法则？'
  ];

  // A. Trigger Billing Parse
  const handleParseBilling = async (textToParse?: string) => {
    const text = textToParse || nlpInput;
    if (!text.trim()) return;

    setIsParsing(true);
    setParsedCard(null);

    try {
      const res = await fetch('/api/gemini/parse-billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text,
          currentDate: new Date().toISOString().split('T')[0]
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        setParsedCard(json.data);
        if (!textToParse) setNlpInput('');
      } else {
        alert(json.error || '解析失败，请尝试用更简单的文字表达。');
      }
    } catch (err) {
      alert('无法连接服务器，解析账单失败。');
    } finally {
      setIsParsing(false);
    }
  };

  // B. Confirm Parsed Bill
  const handleConfirmBill = () => {
    if (!parsedCard) return;
    onAddTransactionFromAi({
      type: parsedCard.type,
      amount: parsedCard.amount,
      category: parsedCard.category,
      date: new Date().toISOString().split('T')[0],
      remarks: parsedCard.remarks
    });
    setParsedCard(null);
    showToast('success', '成功记账一笔 ✅');
  };

  // C. Trigger Chat Advisor Send
  const handleSendChat = async (presetQuestion?: string) => {
    const question = presetQuestion || chatInput;
    if (!question.trim()) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 9),
      role: 'user',
      content: question,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    };

    setChatHistory(prev => [...prev, userMsg]);
    if (!presetQuestion) setChatInput('');
    setIsChatting(true);

    try {
      const res = await fetch('/api/gemini/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          history: chatHistory.slice(-10), // Send last 10 messages for context
          transactions,
          budgets,
          goals
        })
      });

      const json = await res.json();
      if (json.success && json.reply) {
        const modelMsg: ChatMessage = {
          id: Math.random().toString(36).substring(2, 9),
          role: 'model',
          content: json.reply,
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        };
        setChatHistory(prev => [...prev, modelMsg]);
      } else {
        throw new Error(json.error || '回复失败');
      }
    } catch (err: any) {
      const errMsg: ChatMessage = {
        id: Math.random().toString(36).substring(2, 9),
        role: 'model',
        content: `**抱歉，我的网络遇到一点小故障**: ${err.message || '请再试一次'}`,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      };
      setChatHistory(prev => [...prev, errMsg]);
    } finally {
      setIsChatting(false);
    }
  };

  // D. Generate Financial Health Report
  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    setReport(null);

    try {
      const res = await fetch('/api/gemini/financial-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions, budgets, goals })
      });

      const json = await res.json();
      if (json.success && json.data) {
        setReport({
          ...json.data,
          generatedAt: new Date().toLocaleString('zh-CN')
        });
      } else {
        alert(json.error || '诊断失败，请确保您有至少录入几条支出与收入记录后再生成分析。');
      }
    } catch (err) {
      alert('连接分析服务失败，请稍后重试。');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 顶部标题 */}
      <div className="border-b border-slate-100 pb-4">
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-emerald-500 animate-pulse" />
          智能 AI 助手
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          由大语言模型 Gemini 驱动，赋能极简记账、多维对话与全方位财务健康状况扫描。
        </p>
      </div>

      {/* AI 二级导航菜单 */}
      <div className="flex border-b border-slate-100">
        <button
          onClick={() => setActiveSubTab('parse')}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'parse'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Brain className="w-4 h-4" /> 语音文本快捷记账
        </button>

        <button
          onClick={() => setActiveSubTab('chat')}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'chat'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <MessageSquare className="w-4 h-4" /> 智能理财顾问
        </button>

        <button
          onClick={() => setActiveSubTab('report')}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'report'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <ClipboardList className="w-4 h-4" /> 财务健康一键体检
        </button>
      </div>

      {/* 子菜单面板切换 */}
      <div>
        {/* SUBTAB 1: NLP parsing */}
        {activeSubTab === 'parse' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左边：输入框 */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">自由口语记账</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    打字输入一句日常描述（如：“晚上和朋友吃火锅花了 120 元”），AI 就会智能转换并帮您对号入座记好账。
                  </p>
                </div>

                <div className="space-y-3">
                  <textarea
                    rows={4}
                    value={nlpInput}
                    onChange={(e) => setNlpInput(e.target.value)}
                    placeholder="描述一下你的账目。如：今天兼职做家教赚了200元，直接存微信。"
                    className="w-full bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white rounded-xl p-4 text-xs font-medium text-slate-700 outline-none transition-all resize-none"
                  />

                  <div className="flex justify-end">
                    <button
                      onClick={() => handleParseBilling()}
                      disabled={isParsing || !nlpInput.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                    >
                      {isParsing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          AI 解析中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          开始解析
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* 快捷示例 */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/40">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">💡 试一下这些生活场景</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {nlpExamples.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setNlpInput(ex);
                        handleParseBilling(ex);
                      }}
                      className="text-left p-2.5 bg-white hover:bg-emerald-50/50 hover:border-emerald-200/50 border border-slate-100 rounded-xl text-xs text-slate-600 hover:text-emerald-800 transition-all cursor-pointer font-medium"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 右边：解析确认卡片 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm min-h-[220px] flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">🔮 AI 匹配结果待确认</h3>
                  
                  {isParsing && (
                    <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400">
                      <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
                      <p className="text-xs">小闪 AI 正在为您整理账本标签...</p>
                    </div>
                  )}

                  {!isParsing && parsedCard ? (
                    <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-100 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          parsedCard.type === 'expense' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {parsedCard.type === 'expense' ? '支出账单' : '收入账单'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">今天（录入）</span>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-[10px] text-slate-400">账目金额</p>
                        <p className="text-2xl font-bold font-mono text-slate-800">
                          ¥{parsedCard.amount.toFixed(2)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-[10px] text-slate-400 mb-0.5">自动匹配分类</p>
                          <span className="font-bold text-slate-700">🏷️ {parsedCard.category}</span>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 mb-0.5">明细备注</p>
                          <span className="font-semibold text-slate-600 truncate block">
                            {parsedCard.remarks || '（未备注）'}
                          </span>
                        </div>
                      </div>

                      {/* 编辑预览微型输入（允许在确认前微调） */}
                      <div className="border-t border-emerald-100/40 pt-3 flex gap-2">
                        <button
                          onClick={() => setParsedCard(null)}
                          className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg text-xs transition-colors cursor-pointer"
                        >
                          重新录
                        </button>
                        <button
                          onClick={handleConfirmBill}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-0.5"
                        >
                          <Check className="w-3.5 h-3.5" /> 确认入账
                        </button>
                      </div>
                    </div>
                  ) : (
                    !isParsing && (
                      <div className="py-12 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <Brain className="w-10 h-10 text-slate-300 mb-2" />
                        <p className="text-xs text-center px-4">
                          在左边录入后，AI 智能标签解析结果将立刻呈现在这里供您核对。
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 2: AI Chat Advisory */}
        {activeSubTab === 'chat' && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[500px]">
            {/* 顶排：小闪 AI 财务助理信息 */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3 rounded-t-2xl">
              <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 border border-emerald-200">
                🤖
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">小闪 AI 财务顾问</h4>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-[10px] text-slate-400 font-semibold">Gemini 3.5 全能大脑在线</span>
                </div>
              </div>
            </div>

            {/* 对话消息区 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatHistory.map((msg) => {
                const isModel = msg.role === 'model';
                return (
                  <div 
                    key={msg.id} 
                    className={`flex items-start gap-2.5 ${isModel ? '' : 'flex-row-reverse'}`}
                  >
                    {/* 头像 */}
                    <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs ${
                      isModel ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {isModel ? '🤖' : '👤'}
                    </div>

                    {/* 消息框 */}
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm border ${
                      isModel 
                        ? 'bg-slate-50 border-slate-100/60 rounded-tl-none' 
                        : 'bg-emerald-600 text-white border-emerald-500 rounded-tr-none'
                    }`}>
                      {isModel ? (
                        <SimpleMarkdown text={msg.content} />
                      ) : (
                        <p className="text-xs font-semibold leading-relaxed">{msg.content}</p>
                      )}
                      <span className={`text-[9px] block mt-1.5 text-right font-mono ${
                        isModel ? 'text-slate-400' : 'text-emerald-200'
                      }`}>
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}

              {isChatting && (
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs">
                    🤖
                  </div>
                  <div className="bg-slate-50 border border-slate-100/60 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* 常用建议追问标签 */}
            <div className="px-4 py-2 border-t border-slate-50 bg-slate-50/20 flex gap-1.5 overflow-x-auto">
              {chatSuggestions.map((ex, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendChat(ex)}
                  disabled={isChatting}
                  className="shrink-0 py-1 px-2.5 bg-white border border-slate-100 hover:border-emerald-200 text-slate-500 hover:text-emerald-800 rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-sm"
                >
                  {ex}
                </button>
              ))}
            </div>

            {/* 输入区 */}
            <div className="p-3 border-t border-slate-100 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="在此输入您关心的理财或消费疑问..."
                disabled={isChatting}
                className="flex-1 bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white rounded-xl px-4 py-2.5 text-xs font-medium text-slate-700 outline-none transition-all"
              />
              <button
                onClick={() => handleSendChat()}
                disabled={isChatting || !chatInput.trim()}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* SUBTAB 3: Financial Health One-click Diagnostics */}
        {activeSubTab === 'report' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">一键智能财务健康诊断</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  AI 顾问将全面扫描您的全部收支账单、月度分类预算和储蓄目标，给出定制的资产健康评估。
                </p>
              </div>

              <button
                onClick={handleGenerateReport}
                disabled={isGeneratingReport || transactions.length < 2}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                {isGeneratingReport ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    全面诊断中...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-3.5 h-3.5" />
                    开始生成专属报告
                  </>
                )}
              </button>
            </div>

            {transactions.length < 2 && (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-2.5 text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>您的账本记录过少（至少需要 2 笔记录），请先去“账目明细”栏目中录入几笔常用的支出与收入，以便 AI 获得基础诊断依据。</span>
              </div>
            )}

            {/* 报告显示面板 */}
            <AnimatePresence>
              {report && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                  {/* 得分与总结 */}
                  <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm md:col-span-1 flex flex-col items-center text-center justify-between min-h-[300px]">
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">财务安全评分</h4>
                      
                      {/* 圆形进度环 */}
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f1f5f9" strokeWidth="8" />
                          <circle 
                            cx="50" 
                            cy="50" 
                            r="40" 
                            fill="transparent" 
                            stroke={report.score >= 80 ? '#10b981' : report.score >= 60 ? '#f59e0b' : '#ef4444'} 
                            strokeWidth="8" 
                            strokeDasharray={251.2} 
                            strokeDashoffset={251.2 - (251.2 * report.score) / 100}
                            strokeLinecap="round"
                            className="transition-all duration-1000"
                          />
                        </svg>
                        <span className="absolute text-3xl font-extrabold font-mono text-slate-800">{report.score}</span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1">
                      <p className="text-xs font-bold text-slate-700">财务等级：
                        <span className={`font-extrabold ${
                          report.score >= 80 ? 'text-emerald-600' : report.score >= 60 ? 'text-amber-500' : 'text-rose-500'
                        }`}>
                          {report.score >= 80 ? '卓越 A' : report.score >= 60 ? '良好 B' : '警戒 C'}
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">评估日期：{report.generatedAt}</p>
                    </div>
                  </div>

                  {/* 报告明细与改善建议 */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm md:col-span-2 space-y-6">
                    {/* 一：综述诊断 */}
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">📋 AI 专家诊断概述</h4>
                      <p className="text-xs font-medium text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        {report.summary}
                      </p>
                    </div>

                    {/* 二：优势与弱点 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* 优势面 */}
                      <div className="space-y-2">
                        <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          财务表现优势
                        </h5>
                        <ul className="space-y-1.5">
                          {report.strengths.map((s, idx) => (
                            <li key={idx} className="text-xs font-semibold text-slate-700 flex items-start gap-1.5 pl-1">
                              <span className="text-emerald-500 font-bold shrink-0">✓</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* 弱项面 */}
                      <div className="space-y-2">
                        <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                          潜在财务隐患 / 漏洞
                        </h5>
                        <ul className="space-y-1.5">
                          {report.weaknesses.map((w, idx) => (
                            <li key={idx} className="text-xs font-semibold text-slate-700 flex items-start gap-1.5 pl-1">
                              <span className="text-amber-500 font-bold shrink-0">⚠</span>
                              <span>{w}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* 三：行动建议 */}
                    <div className="space-y-2 border-t border-slate-100 pt-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">🎯 深度量化改善行动纲要</h4>
                      <div className="space-y-2">
                        {report.suggestions.map((s, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 p-2 bg-slate-50/50 rounded-lg hover:bg-slate-50 transition-colors">
                            <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-semibold text-slate-700 leading-relaxed">{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
