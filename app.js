const state = { data: null, filtered: [], quizQueue: [], quizIndex: 0, answered: false };
const $ = (id) => document.getElementById(id);
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));

function normalizeAnswer(value) {
  return String(value).normalize('NFC').replace(/[\s、。！？・]/g, '').replace(/[ァ-ン]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60)).toLowerCase();
}

function allWords() { return state.data.sentences.flatMap((sentence) => sentence.words.map((word) => ({ ...word, sentence }))); }
function shuffled(items) { return [...items].sort(() => Math.random() - 0.5); }

function renderLibrary() {
  const entries = state.filtered;
  $('sentenceCount').textContent = state.data.sentences.length;
  $('resultLabel').textContent = entries.length === state.data.sentences.length ? `문장 ${entries.length}개` : `검색 결과 ${entries.length}개`;
  $('entryList').innerHTML = entries.map((entry, index) => `<article class="entry-card"><div class="entry-top"><span class="entry-number">${String(index + 1).padStart(2, '0')} / ${entry.id}</span></div><h3>${escapeHtml(entry.japanese)}</h3>${entry.reading ? `<p class="reading">${escapeHtml(entry.reading)}</p>` : ''}<p class="meaning">${escapeHtml(entry.meaning)}</p><div class="word-list">${entry.words.map((word) => `<span class="word">${escapeHtml(word.japanese)} · ${escapeHtml(word.meaning)}</span>`).join('')}</div>${entry.note ? `<p class="note">${escapeHtml(entry.note)}</p>` : ''}</article>`).join('');
  $('entryList').classList.toggle('hidden', entries.length === 0);
  $('emptyState').classList.toggle('hidden', entries.length !== 0);
}

function makeQuizQueue() {
  const sentences = state.data.sentences;
  const words = allWords();
  const queue = [];
  if (sentences.length > 1) queue.push(...sentences.map((entry) => ({ type: 'meaning', entry })));
  if (sentences.some((entry) => entry.reading)) queue.push(...sentences.filter((entry) => entry.reading).map((entry) => ({ type: 'reading', entry })));
  queue.push(...sentences.map((entry) => ({ type: 'recall', entry })));
  if (words.length > 1) queue.push(...words.map((word) => ({ type: 'word', word })));
  state.quizQueue = shuffled(queue).slice(0, Math.min(10, queue.length));
  state.quizIndex = 0;
}

function renderQuiz() {
  if (!state.quizQueue.length) makeQuizQueue();
  const question = state.quizQueue[state.quizIndex];
  if (!question) { makeQuizQueue(); return renderQuiz(); }
  state.answered = false;
  $('quizMeta').textContent = `${state.quizIndex + 1} / ${state.quizQueue.length}`;
  if (question.type === 'meaning') return renderChoiceQuestion(question.entry.japanese, question.entry.meaning, state.data.sentences.map((entry) => entry.meaning), '문장 뜻');
  if (question.type === 'word') return renderChoiceQuestion(question.word.japanese, question.word.meaning, allWords().map((word) => word.meaning), '단어 뜻');
  if (question.type === 'reading') return renderReadingQuestion(question.entry);
  return renderRecallQuestion(question.entry);
}

function renderChoiceQuestion(prompt, answer, candidates, label) {
  const options = shuffled([...new Set([answer, ...shuffled(candidates.filter((item) => item !== answer)).slice(0, 3)])]);
  $('quizCard').innerHTML = `<p class="quiz-type">${label.toUpperCase()} · 4지선다</p><h3>${escapeHtml(prompt)}</h3><div class="options">${options.map((option) => `<button class="option" data-answer="${escapeHtml(option)}">${escapeHtml(option)}</button>`).join('')}</div><p class="quiz-result" id="quizResult" aria-live="polite">가장 알맞은 답을 고르세요.</p>`;
  $('quizCard').querySelectorAll('.option').forEach((button) => button.addEventListener('click', () => {
    if (state.answered) return;
    state.answered = true;
    const correct = button.dataset.answer === answer;
    button.classList.add(correct ? 'correct' : 'wrong');
    if (!correct) [...$('quizCard').querySelectorAll('.option')].find((item) => item.dataset.answer === answer)?.classList.add('correct');
    $('quizResult').textContent = correct ? '정답입니다.' : `정답: ${answer}`;
    nextButton();
  }));
}

function renderReadingQuestion(entry) {
  $('quizCard').innerHTML = `<p class="quiz-type">READING · 입력형</p><h3>${escapeHtml(entry.japanese)}</h3><input class="quiz-input" id="readingAnswer" placeholder="히라가나로 입력" autocomplete="off" /><div class="quiz-actions"><button class="grade-button" id="checkReading">확인</button></div><p class="quiz-result" id="quizResult" aria-live="polite">문장의 읽기를 히라가나로 입력하세요.</p>`;
  const check = () => {
    if (state.answered) return;
    state.answered = true;
    const correct = normalizeAnswer($('readingAnswer').value) === normalizeAnswer(entry.reading);
    $('quizResult').textContent = correct ? '정답입니다.' : `정답: ${entry.reading}`;
    nextButton();
  };
  $('checkReading').addEventListener('click', check);
  $('readingAnswer').addEventListener('keydown', (event) => { if (event.key === 'Enter') check(); });
  $('readingAnswer').focus();
}

function renderRecallQuestion(entry) {
  $('quizCard').innerHTML = `<p class="quiz-type">RECALL · 자기 평가</p><h3>${escapeHtml(entry.meaning)}</h3><p class="quiz-result">일본어 문장을 먼저 떠올린 뒤 정답을 확인하세요.</p><button class="next-button" id="revealAnswer">정답 보기</button>`;
  $('revealAnswer').addEventListener('click', () => {
    $('quizCard').innerHTML = `<p class="quiz-type">RECALL · 정답</p><h3>${escapeHtml(entry.japanese)}</h3>${entry.reading ? `<p class="quiz-reading">${escapeHtml(entry.reading)}</p>` : ''}<p class="quiz-result">떠올린 정도를 선택하세요.</p><div class="quiz-actions"><button class="grade-button retry" id="retry">다시 보기</button><button class="grade-button" id="known">알았다</button></div>`;
    $('retry').addEventListener('click', nextQuestion);
    $('known').addEventListener('click', nextQuestion);
  });
}

function nextButton() { const button = document.createElement('button'); button.className = 'next-button'; button.textContent = '다음 문제'; button.addEventListener('click', nextQuestion); $('quizCard').append(button); }
function nextQuestion() { state.quizIndex += 1; if (state.quizIndex >= state.quizQueue.length) makeQuizQueue(); renderQuiz(); }

async function boot() {
  try {
    const response = await fetch('./data/lessons.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('학습 데이터를 불러올 수 없습니다.');
    state.data = await response.json();
    state.filtered = state.data.sentences;
    renderLibrary();
    $('searchInput').addEventListener('input', (event) => {
      const query = event.target.value.normalize('NFC').toLocaleLowerCase();
      state.filtered = state.data.sentences.filter((entry) => JSON.stringify(entry).normalize('NFC').toLocaleLowerCase().includes(query));
      renderLibrary();
    });
    document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((item) => item.classList.toggle('active', item === tab));
      const library = tab.dataset.view === 'library';
      $('libraryView').classList.toggle('hidden', !library);
      $('quizView').classList.toggle('hidden', library);
      if (!library) renderQuiz();
    }));
  } catch (error) {
    $('entryList').innerHTML = `<p class="result-label">${escapeHtml(error.message)}</p>`;
  }
}

boot();
