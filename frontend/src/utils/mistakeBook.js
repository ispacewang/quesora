// src/utils/mistakeBook.js

export const MISTAKE_BOOK_ID = 'mistake-book';

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

export function addQuestionToMistakeBook(question) {
  const book = getMistakeBook();
  const exists = book.some(item => item.questionId === question.questionId);
  if (!exists) {
    book.unshift(question);
    saveMistakeBook(book);
  }
}

export function removeQuestionFromMistakeBook(questionId) {
  const book = getMistakeBook().filter(item => item.questionId !== questionId);
  saveMistakeBook(book);
}
