/** @file material.js — AI 出题附件：用 markitdown 二进制把附件转成 Markdown 文本 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/** 支持的附件类型（markitdown 可解析；旧版 .doc/.xls 二进制格式不支持） */
const SUPPORTED_EXTS = ['.txt', '.md', '.csv', '.pdf', '.docx', '.xlsx'];
/** 单个附件最多保留的 Markdown 字符数，超出部分丢弃 */
const MAX_CHARS = 120000;

/** 附件本身的问题（类型不支持、内容无法解析），HTTP 应回 400 而不是 500 */
function clientError(message) {
  const err = new Error(message);
  err.clientError = true;
  return err;
}

/**
 * 附件转 Markdown 文本（调用 markitdown，无论成败都删除临时文件）
 * @param {string} filePath — 上传到临时目录的附件路径
 * @param {string} originalName — 原始文件名（取扩展名判断类型）
 * @returns {{text: string, truncated: boolean}} Markdown 文本与是否被截断
 */
function convertToMarkdown(filePath, originalName) {
  const outPath = `${filePath}.md`;
  try {
    const ext = path.extname(originalName || '').toLowerCase();
    if (!SUPPORTED_EXTS.includes(ext)) {
      throw clientError(`不支持的附件类型 ${ext || '(无扩展名)'}，支持 ${SUPPORTED_EXTS.join(' / ')}`);
    }

    try {
      // -o 输出文件：避免子进程 stdout 走系统编码，中文会乱码
      execFileSync(require('@mote-software/markitdown').getBinaryPath(), [filePath, '-o', outPath], {
        stdio: ['ignore', 'ignore', 'pipe'],
        encoding: 'utf8',
        timeout: 120000,
      });
    } catch (e) {
      console.error('[material] markitdown 转换失败:', e.message);
      throw clientError('附件内容无法解析，请确认文件未加密、且含可提取的文字');
    }

    const raw = fs.readFileSync(outPath, 'utf8');
    if (!raw.trim()) throw clientError('附件中没有解析出文字内容');
    const truncated = raw.length > MAX_CHARS;
    return { text: truncated ? raw.slice(0, MAX_CHARS) : raw, truncated };
  } finally {
    for (const p of [filePath, outPath]) {
      try { fs.unlinkSync(p); } catch { }
    }
  }
}

module.exports = { convertToMarkdown, SUPPORTED_EXTS, MAX_CHARS };
