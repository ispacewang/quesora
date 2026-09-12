// backend/ai/deepseek.js — DeepSeek API 封装 (v4)
const https = require('https');

const API_HOST = 'api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-v4-pro';

/** 推荐模型列表（优先显示） */
const RECOMMENDED_MODELS = [
  { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro' },
  { id: 'deepseek-v4-flash', name: 'DeepSeek V4 Flash' },
];

/**
 * 调用 DeepSeek Chat API (OpenAI 兼容格式)
 * @param {string} apiKey
 * @param {Array<{role:string, content:string}>} messages
 * @param {object} opts — { temperature, max_tokens, model }
 * @returns {Promise<string>} 助手回复文本
 */
async function chat(apiKey, messages, opts = {}) {
  const { temperature = 0.7, max_tokens = 4096, model = DEFAULT_MODEL } = opts;
  const json = await requestJson('/v1/chat/completions', apiKey, {
    model,
    messages,
    temperature,
    max_tokens,
    stream: false,
  }, 120000);
  const content = json.choices?.[0]?.message?.content || '';
  if (!content) throw new Error('API 未返回可用内容');
  return content;
}

/**
 * 获取可用模型列表
 * @param {string} apiKey
 * @returns {Promise<Array<{id:string, name:string}>>}
 */
async function fetchModels(apiKey) {
  const json = await requestJson('/v1/models', apiKey, null, 15000);
  const models = (json.data || [])
    .filter(m => m.id && m.id.startsWith('deepseek'))
    .map(m => ({ id: m.id, name: m.id }));

  const seen = new Set(RECOMMENDED_MODELS.map(m => m.id));
  const rest = models.filter(m => !seen.has(m.id));
  return [...RECOMMENDED_MODELS, ...rest];
}

/**
 * 通过 Electron 的 Chromium 网络栈发请求，以便遵从系统代理；在纯 Node 环境保留 HTTPS 回退。
 * Electron net 文档：https://www.electronjs.org/docs/latest/api/net
 */
async function requestJson(pathname, apiKey, body, timeout) {
  const url = `https://${API_HOST}${pathname}`;
  const headers = { Authorization: `Bearer ${apiKey}` };
  if (body) headers['Content-Type'] = 'application/json';

  try {
    const { app, net } = require('electron');
    if (app?.isReady?.() && net?.fetch) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await net.fetch(url, {
          method: body ? 'POST' : 'GET',
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
        const text = await response.text();
        return parseApiResponse(response.status, text);
      } catch (err) {
        if (err.name === 'AbortError') throw new Error('API 请求超时');
        throw err;
      } finally {
        clearTimeout(timer);
      }
    }
  } catch (err) {
    if (err.message !== "Cannot find module 'electron'") throw err;
  }

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: API_HOST,
      path: pathname,
      method: body ? 'POST' : 'GET',
      timeout,
      headers: { ...headers, ...(body ? { 'Content-Length': Buffer.byteLength(JSON.stringify(body)) } : {}) },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(parseApiResponse(res.statusCode, data)); } catch (err) { reject(err); }
      });
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('API 请求超时')); });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function parseApiResponse(status, text) {
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`API 响应无法解析（HTTP ${status}）`); }
  if (status < 200 || status >= 300 || json.error) {
    throw new Error(json.error?.message || `API 请求失败（HTTP ${status}）`);
  }
  return json;
}

module.exports = { chat, fetchModels, DEFAULT_MODEL, RECOMMENDED_MODELS };
