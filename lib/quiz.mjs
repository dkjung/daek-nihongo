export function buildQuizQueue(data) {
  const sentences = data?.sentences || [];
  const words = sentences.flatMap((sentence) => sentence.words.map((word) => ({ ...word, sentence })));
  const queue = [];
  if (sentences.length > 1) queue.push(...sentences.map((entry) => ({ type: 'meaning', entry })));
  if (sentences.some((entry) => entry.reading)) queue.push(...sentences.filter((entry) => entry.reading).map((entry) => ({ type: 'reading', entry })));
  queue.push(...sentences.map((entry) => ({ type: 'recall', entry })));
  if (words.length > 1) queue.push(...words.map((word) => ({ type: 'word', word })));
  return queue;
}
