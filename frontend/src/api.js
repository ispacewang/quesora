import axios from 'axios';

axios.defaults.baseURL = 'http://localhost:3002';

export function uploadFile(file, bankName) {
  const formData = new FormData();
  formData.append('file', file);
  if (bankName) formData.append('bankName', bankName);
  return axios.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function getBanks() {
  return axios.get('/banks');
}

export function getQuestion(bankName) {
  return axios.get('/question', { params: { bankName } });
}

export function submitAnswer(id, userAnswer, bankName) {
  return axios.post('/answer', { id, userAnswer, bankName });
}

export function patternsP(bankName) {
  return axios.get('/patterns', {  params: { bankName }  });
}


export function generatePaper(bankName, count) {
  return axios.get('/generate-paper', { params: { bankName, count } });
}

export function deleteBank(bankName) {
  return axios.delete('/bank', { params: { bankName } });
}