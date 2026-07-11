import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());

// Initialize Gemini SDK lazily
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not defined!");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Category lists for validation and matching
const EXPENSE_CATEGORIES = ['餐饮', '购物', '服饰', '日用', '交通', '通讯', '数码', '娱乐', '住房', '医疗', '人情', '教育', '其它'];
const INCOME_CATEGORIES = ['工资', '兼职', '理财', '礼金', '其它'];

// 1. NLP parsing endpoint: text to structured transaction
app.post('/api/gemini/parse-billing', async (req, res) => {
  try {
    const { text, currentDate } = req.body;
    if (!text) {
      return res.status(400).json({ error: '请提供需要解析的文本内容' });
    }

    const ai = getAi();
    const systemInstruction = `你是一个专业的记账助手。请从用户的中文描述中，解析出以下记账信息，并严格以指定的 JSON 格式返回。
支持的支出类别 (EXPENSE_CATEGORIES): ${EXPENSE_CATEGORIES.join(', ')}
支持的收入类别 (INCOME_CATEGORIES): ${INCOME_CATEGORIES.join(', ')}

如果匹配不到特定类别，请分类为“其它”。
当前时间是 ${currentDate || new Date().toISOString().split('T')[0]}。

请严格输出符合以下 JSON 结构的解析结果（不需要任何 markdown 代码块标记，直接返回 JSON 对象字符串）：
{
  "type": "expense" 或 "income",
  "amount": 数字（必填，正数）,
  "category": 必须是上述对应的类别之一,
  "remarks": 简明扼要的备注（如：午餐、买衣服、发薪水等，若没有则返回空字符串）
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: text,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: {
              type: Type.STRING,
              enum: ['expense', 'income'],
              description: '交易类型：支出（expense）或收入（income）'
            },
            amount: {
              type: Type.NUMBER,
              description: '交易金额（必须是正数）'
            },
            category: {
              type: Type.STRING,
              description: '匹配的分类名称，必须为系统预设之一'
            },
            remarks: {
              type: Type.STRING,
              description: '账目备注说明，简明扼要'
            }
          },
          required: ['type', 'amount', 'category', 'remarks']
        }
      }
    });

    const resultText = response.text || '';
    const parsedData = JSON.parse(resultText.trim());
    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Parse billing error:', error);
    return res.status(500).json({ 
      error: 'AI 记账解析失败，请尝试手动输入或换种表达方式。',
      details: error.message 
    });
  }
});

// 2. Chat Advisory endpoint: chat with dynamic context
app.post('/api/gemini/advisor', async (req, res) => {
  try {
    const { message, history, transactions, budgets, goals } = req.body;
    
    const ai = getAi();
    const systemInstruction = `你是一位专业且充满温情的个人财务顾问，名叫“小闪 AI 财务顾问”。
你的任务是根据用户的财务数据（账单、预算和存钱目标）来回答他们关于记账、省钱、理财、投资、消费合理性的问题，或者进行日常的财务闲聊。

=== 用户当前财务数据 ===
账单记录数：${transactions ? transactions.length : 0} 条
支出类别预设：${EXPENSE_CATEGORIES.join(', ')}
收入类别预设：${INCOME_CATEGORIES.join(', ')}
当前月度预算配置：${JSON.stringify(budgets || [])}
当前的存钱目标：${JSON.stringify(goals || [])}
用户最近 5 条账单摘要：${JSON.stringify((transactions || []).slice(0, 5))}

=== 你的回答风格与原则 ===
1. 语言：亲切、专业、通俗易懂、多用鼓励性的语气，避免生硬和纯说教。
2. 数据分析：如果用户问及他们的开支，优先使用他们提供的真实交易数据进行精确分析和计算（如总收入、总支出、最高消费分类、预算消耗比例等）。
3. 实用性：给出具体、可执行的省钱、存钱和消费建议，例如“可以尝试50/30/20法则”、“适当缩减餐饮/购物开支”等。
4. 格式：使用排版精美的 Markdown 格式，适当运用列表、加粗、引用块，使其更易阅读。

请直接以 Markdown 文本形式进行回答。
`;

    // Map history to the SDK format
    // In @google/genai, ai.chats.create takes model and optional history or config.
    // However, to be extremely safe, we can compile the prompt with history inside `contents` or use the Chat object.
    // Let's build the full messages structure to query generateContent for deterministic chat simulation
    const contents: any[] = [];
    
    if (history && Array.isArray(history)) {
      history.forEach((msg: any) => {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      });
    }

    // Append the current message
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    return res.json({ success: true, reply: response.text });
  } catch (error: any) {
    console.error('Advisor error:', error);
    return res.status(500).json({ 
      error: 'AI 顾问由于网络波动暂时无法连接，请稍后再试。',
      details: error.message 
    });
  }
});

// 3. Financial Analysis Report Generator endpoint
app.post('/api/gemini/financial-report', async (req, res) => {
  try {
    const { transactions, budgets, goals } = req.body;

    const ai = getAi();
    const systemInstruction = `你是一位资深的特许金融分析师 (CFA) 和个人理财专家。
请仔细评估用户提供的账单记录、月度预算配置以及理财目标，并出具一份专业的《个人财务健康评估诊断报告》。

=== 用户的原始数据 ===
账单记录：${JSON.stringify(transactions || [])}
类别预算：${JSON.stringify(budgets || [])}
存钱目标：${JSON.stringify(goals || [])}

=== 诊断指标与算法规则 ===
1. 财务健康分 (score):
   - 满分 100 分。根据支出与收入比例（蓄水率/储蓄率）、预算超支情况、以及目标储蓄进度综合打分。
   - 储蓄率 >= 30% 加分；频繁超预算扣分；有清晰的储蓄目标并按进度存钱加分。
2. 财务优势 (strengths): 列出 2-3 条做得好的地方（例如“餐饮预算控制在安全线内”、“有积极的储蓄目标规划”等）。
3. 财务漏洞与风险 (weaknesses): 列出 2-3 条存在的消费隐患（例如“购物开支偏高”、“无源头理财性收入”、“未设定明确分类预算”等）。
4. 改善行动建议 (suggestions): 列出 3-5 条定制化的、具体有数字或规律的改善建议。
5. 综合诊断概述 (summary): 150-200字，客观、中肯地总结其目前的财务现状与未来发展。

请严格返回如下 JSON 数据格式：
{
  "score": 75,
  "summary": "财务现状的综合深度诊断概述...",
  "strengths": [
    "优势点 1",
    "优势点 2"
  ],
  "weaknesses": [
    "漏洞或风险 1",
    "漏洞或风险 2"
  ],
  "suggestions": [
    "改善建议 1（例如：建议将月度购物开支从当前的 X% 降至 Y%）",
    "改善建议 2",
    "改善建议 3"
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: '请根据我的账单、预算和目标，生成我的专属财务健康报告。',
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: {
              type: Type.INTEGER,
              description: '财务健康得分，范围 0-100'
            },
            summary: {
              type: Type.STRING,
              description: '综合诊断诊断概述'
            },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '财务优势，列出 2-3 条'
            },
            weaknesses: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '财务漏洞与风险，列出 2-3 条'
            },
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '针对性的财务改进建议，列出 3-5 条'
            }
          },
          required: ['score', 'summary', 'strengths', 'weaknesses', 'suggestions']
        }
      }
    });

    const resultText = response.text || '';
    const reportData = JSON.parse(resultText.trim());
    return res.json({ success: true, data: reportData });
  } catch (error: any) {
    console.error('Financial report error:', error);
    return res.status(500).json({ 
      error: '生成财务诊断报告失败，可能由于账单数据过少或系统繁忙，请多记几笔账单后再试。',
      details: error.message 
    });
  }
});

// Configure Vite middleware or Static files
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // SPA routing - serve index.html for all client routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
