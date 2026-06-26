// src/utils/mistakeBook.js

export const MISTAKE_BOOK_ID = 'mistake-book';

/**
 * 从 localStorage 读取错题本
 * @returns {Object[]} 错题列表
 */
export function getMistakeBook() {
  try {
    const book = localStorage.getItem(MISTAKE_BOOK_ID);
    return book ? JSON.parse(book) : [];
  } catch {
    return [];
  }
}

function saveMistakeBook(book) {
  try {
    localStorage.setItem(MISTAKE_BOOK_ID, JSON.stringify(book));
  } catch { }
}

/**
 * 添加题目到错题本（去重：已存在则跳过）
 * @param {Object} question - 错题对象，需含 questionId 字段
 */
export function addQuestionToMistakeBook(question) {
  const book = getMistakeBook();
  const idx = book.findIndex(item => item.questionId === question.questionId);
  if (idx === -1) {
    book.unshift(question);
  } else {
    book[idx] = { ...book[idx], ...question, note: question.note ?? book[idx].note ?? '' };
  }
  saveMistakeBook(book);
}


/**
 * 更新错题备注
 * @param {string} questionId - 题目 ID
 * @param {string} note - 用户备注
 * @returns {Object|null} 更新后的错题对象
 */
export function updateMistakeNote(questionId, note) {
  const book = getMistakeBook();
  const idx = book.findIndex(item => item.questionId === questionId);
  if (idx === -1) return null;
  book[idx] = { ...book[idx], note: note || '' };
  saveMistakeBook(book);
  return book[idx];
}

/**
 * 从错题本中移除指定题目
 * @param {string} questionId - 要移除的题目 ID
 */
export function removeQuestionFromMistakeBook(questionId) {
  const book = getMistakeBook().filter(item => item.questionId !== questionId);
  saveMistakeBook(book);
}

/**
 * 清空错题库（清除 localStorage 中的所有错题）
 */
export function clearMistakeBook() {
  localStorage.removeItem(MISTAKE_BOOK_ID);
}
