// Vercel Serverless entry point
// Re-uses the Express app from server.ts without starting the HTTP listener

import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());

// Initialize Gemini SDK
let aiClient = null;
function getAi() {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || '',
      httpOptions: {
        headers: { 'User-Agent': 'aistudio-build' }
      }
    });
  }
  return aiClient;
}

const EXPENSE_CATEGORIES = ['餐饮', '购物', '服饰', '日用', '交通', '通讯', '数码', '娱乐', '住房', '医疗', '人情', '教育', '其它'];
const INCOME_CATEGORIES = ['工资', '兼职', '理财', '礼金', '其它'];

// 1. NLP parsing endpoint
app.post('/api/gemini/parse-billing', async (req, res) => {
  try {
    const { text, currentDate } = req.body;
    if (!text) return res.status(400).json({ error: '请提供需要解析的文本内容' });

    const ai = getAi();
    const systemInstruction = `你是一个专业的记账助手。请从用户的中文描述中，解析出以下记账信息，并严格以指定的 JSON 格式返回。
支持的支出类别 (EXPENSE_CATEGORIES): ${EXPENSE_CATEGORIES.join(', ')}
支持的收入类别 (INCOME_CATEGORIES): ${INCOME_CATEGORIES.join(', ')}

如果匹配不到特定类别，请分类为"其它"。
当前时间是 ${currentDate || new Date().toISOString().split('T')[0]}。

请严格输出符合以下 JSON 结构的解析结果（直接返回 JSON 对象字符串）：
{
  "type": "expense" 或 "income",
  "amount": 数字（必填，正数）,
  "category": 必须是上述对应的类别之一,
  "remarks": 简明扼要的备注
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: text,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ['expense', 'income'] },
            amount: { type: Type.NUMBER },
            category: { type: Type.STRING },
            remarks: { type: Type.STRING }
          },
          required: ['type', 'amount', 'category', 'remarks']
        }
      }
    });

    const resultText = response.text || '';
    const parsedData = JSON.parse(resultText.trim());
    return res.json({ success: true, data: parsedData });
  } catch (error) {
    console.error('Parse billing error:', error);
    return res.status(500).json({ error: 'AI 记账解析失败，请尝试手动输入或换种表达方式。' });
  }
});

// 2. Chat Advisory endpoint
app.post('/api/gemini/advisor', async (req, res) => {
  try {
    const { message, history, transactions, budgets, goals } = req.body;
    const ai = getAi();
    const systemInstruction = `你是一位专业且充满温情的个人财务顾问，名叫"小闪 AI 财务顾问"。
你的任务是根据用户的财务数据（账单、预算和存钱目标）来回答他们关于记账、省钱、理财、投资、消费合理性的问题。

=== 用户当前财务数据 ===
账单记录数：${transactions ? transactions.length : 0} 条
支出类别预设：${EXPENSE_CATEGORIES.join(', ')}
收入类别预设：${INCOME_CATEGORIES.join(', ')}
当前月度预算配置：${JSON.stringify(budgets || [])}
当前的存钱目标：${JSON.stringify(goals || [])}
用户最近 5 条账单摘要：${JSON.stringify((transactions || []).slice(0, 5))}

=== 回答风格 ===
1. 亲切、专业、多用鼓励性语气
2. 优先使用用户的真实交易数据进行精确分析
3. 给出具体、可执行的省钱和存钱建议
4. 使用排版精美的 Markdown 格式

请直接以 Markdown 文本形式回答。`;

    const contents = [];
    if (history && Array.isArray(history)) {
      history.forEach(msg => {
        contents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] });
      });
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents,
      config: { systemInstruction, temperature: 0.7 }
    });

    return res.json({ success: true, reply: response.text });
  } catch (error) {
    console.error('Advisor error:', error);
    return res.status(500).json({ error: 'AI 顾问暂时无法连接，请稍后再试。' });
  }
});

// 3. Financial Report endpoint
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

=== 诊断指标 ===
1. score: 0-100，根据储蓄率、预算超支、目标进度综合打分
2. strengths: 2-3条优点
3. weaknesses: 2-3条潜在问题
4. suggestions: 3-5条具体改善建议
5. summary: 150-200字综合概述

请严格返回 JSON。`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: '请根据我的账单、预算和目标，生成我的专属财务健康报告。',
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            summary: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['score', 'summary', 'strengths', 'weaknesses', 'suggestions']
        }
      }
    });

    const resultText = response.text || '';
    const reportData = JSON.parse(resultText.trim());
    return res.json({ success: true, data: reportData });
  } catch (error) {
    console.error('Financial report error:', error);
    return res.status(500).json({ error: '生成财务诊断报告失败。' });
  }
});

// Serve static files in production
app.use(express.static(path.join(__dirname, '../dist')));

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '../dist', 'index.html'));
  }
});

export default app;
