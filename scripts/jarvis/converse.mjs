// Plays scripted conversations through the built-in AI and prints each reply.
//   npm run jarvis:chat
import { think } from '@/lib/jarvis/brain';

const CHATS = [
  ['What is Qurious?', 'how many tests does it have?', 'is it live?', 'what stack does it use', 'tell me more', 'yes'],
  ['Show me his Android work', 'Which AI projects has he built?', 'Is he open to internships?', 'Download his resume', 'Take me to the museum'],
  ['what accuracy did deepguard reach', 'how does the telegram bot fit in', 'how many tests does qurious have', 'what is sih26140'],
  ['does he know rust', 'does he know docker', 'does he know python', 'where did he use fastapi', 'what is entanglement', 'what is ai'],
  ['I am Priya, a recruiter', 'what is his salary expectation', 'who won the world cup', 'why should i hire him', 'are you chatgpt', 'do you learn'],
  ['nithesh pathi sollunga', 'enna projects pannirukaru', 'qurious enna', 'resume anuppunga', 'எத்தனை சான்றிதழ் இருக்கு', 'react தெரியுமா'],
  ['tamil la pesu', 'what is deepguard', 'email enna', 'english la sollu', 'what is testai'],
  ['what is buzzer', 'whats new', 'tell me about the noise lab in qurious', 'zxcvb qwerty', 'open the certificate for css', 'show me the css certificate'],
];

const repos = [
  { name: 'Deep-Guard', language: 'Python', description: null, pushed: '2026-10-11', url: 'https://github.com/Nithesh-cod/Deep-Guard', onPortfolio: true },
  { name: 'qurious', language: 'TypeScript', description: 'Learn quantum computing by building it', pushed: '2026-09-10', url: 'https://github.com/Nithesh-cod/qurious', onPortfolio: true },
  { name: 'buzzer', language: 'HTML', description: null, pushed: '2026-07-18', url: 'https://github.com/Nithesh-cod/buzzer', onPortfolio: false },
];

for (const chat of CHATS) {
  const history = [];
  console.log('\n────────');
  for (const question of chat) {
    const started = performance.now();
    const r = think({ question, history, memory: null, facts: [], repos, learning: true });
    const ms = (performance.now() - started).toFixed(1);
    console.log(`\nQ: ${question}\nA: ${r.text}`);
    console.log(`   [${r.intent}${r.tools.length ? ` | ${r.tools.map((t) => t.name).join(', ')}` : ''}${r.gap ? ' | gap' : ''} | ${ms} ms]`);
    history.push({ role: 'user', text: question }, { role: 'assistant', text: r.text });
  }
}
