// src/utils/mistakeBook.js

// 使用一个常量作为 localStorage 的键，避免魔法字符串
export const MISTAKE_BOOK_ID = 'mistake-book';

/**
 * 从 localStorage 获取错题库
 * @returns {Array} 错题数组，如果不存在则返回空数组
 */
export function getMistakeBook() {
  try {
    const book = localStorage.getItem(MISTAKE_BOOK_ID);
    return book ? JSON.parse(book) : [];
  } catch (error) {
    console.error('获取错题库失败:', error);
    return [];
  }
}

/**
 * 保存错题库到 localStorage
 * @param {Array} book - 错题数组
 */
function saveMistakeBook(book) {
  try {
    localStorage.setItem(MISTAKE_BOOK_ID, JSON.stringify(book));
  } catch (error) {
    console.error('保存错题库失败:', error);
  }
}

/**
 * 向错题库中添加一道题，如果不存在的话
 * @param {Object} question - 完整的题目对象
 */
export function addQuestionToMistakeBook(question) {
  const book = getMistakeBook();
  // 使用题目的唯一标识符 idx 来判断是否已存在
  const isAlreadyInBook = book.some(item => item.idx === question.idx);

  if (!isAlreadyInBook) {
    book.push(question);
    saveMistakeBook(book);
    console.log(`题目 #${question.idx} 已添加到错题库。`);
  } else {
    console.log(`题目 #${question.idx} 已存在于错题库中，无需重复添加。`);
  }
}

/**
 * 从错题库中移除一道题
 * @param {number} questionIdx - 要移除的题目的 idx
 */
export function removeQuestionFromMistakeBook(questionIdx) {
  let book = getMistakeBook();
  book = book.filter(item => item.idx !== questionIdx);
  saveMistakeBook(book);
  console.log(`题目 #${questionIdx} 已从错题库移除。`);
}
