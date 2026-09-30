// Diccionario Morse internacional
const MORSE_CODE_MAP = {
  'A': '.-',     'B': '-...',   'C': '-.-.',   'D': '-..',
  'E': '.',      'F': '..-.',   'G': '--.',    'H': '....',
  'I': '..',     'J': '.---',   'K': '-.-',    'L': '.-..',
  'M': '--',     'N': '-.',     'O': '---',    'P': '.--.',
  'Q': '--.-',   'R': '.-.',    'S': '...',    'T': '-',
  'U': '..-',    'V': '...-',   'W': '.--',    'X': '-..-',
  'Y': '-.--',   'Z': '--..',
  '1': '.----',  '2': '..---',  '3': '...--',  '4': '....-',  '5': '.....',
  '6': '-....',  '7': '--...',  '8': '---..',  '9': '----.',  '0': '-----',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.',
  '!': '-.-.--', '/': '-..-.',  '(': '-.--.',  ')': '-.--.-',
  '&': '.-...',  ':': '---...', ';': '-.-.-.', '=': '-...-',
  '+': '.-.-.',  '-': '-....-', '_': '..--.-', '"': '.-..-.',
  '$': '...-..-', '@': '.--.-.', ' ': '/'
};

// Diccionario inverso Morse -> Texto
const REVERSE_MORSE_MAP = {};
for (const [letter, code] of Object.entries(MORSE_CODE_MAP)) {
  REVERSE_MORSE_MAP[code] = letter;
}
// Variaciones comunes
REVERSE_MORSE_MAP['/'] = ' ';

// Estado de la aplicación
let currentMode = 'text-to-morse'; // 'text-to-morse' | 'morse-to-text'
let isPlayingAudio = false;
let audioContext = null;
let stopAudioRequested = false;

// Elementos del DOM
const inputText = document.getElementById('input-text');
const outputText = document.getElementById('output-text');
const inputTitle = document.getElementById('input-title');
const outputTitle = document.getElementById('output-title');
const inputCounter = document.getElementById('input-counter');
const clearBtn = document.getElementById('clear-btn');
const copyBtn = document.getElementById('copy-btn');
const copyLabel = document.getElementById('copy-label');
const playSoundBtn = document.getElementById('play-sound-btn');
const playLabel = document.getElementById('play-label');
const modeTextToMorseBtn = document.getElementById('mode-text-to-morse');
const modeMorseToTextBtn = document.getElementById('mode-morse-to-text');
const swapModeBtn = document.getElementById('swap-mode-btn');
const morseHelpers = document.getElementById('morse-helpers');
const signalLight = document.getElementById('signal-light');
const lamp = document.querySelector('.lamp');
const morseRefGrid = document.getElementById('morse-reference-grid');

// Inicializar tabla de referencia Morse
function initReferenceTable() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
  morseRefGrid.innerHTML = chars.map(char => `
    <div class="morse-item">
      <span class="char">${char}</span>
      <span class="code">${MORSE_CODE_MAP[char]}</span>
    </div>
  `).join('');
}

// Normalizar texto (elimina tildes y diacríticos)
function normalizeText(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

// Traducir Texto -> Morse
function translateTextToMorse(text) {
  const normalized = normalizeText(text);
  const words = normalized.split(/\s+/);
  
  return words
    .filter(w => w.length > 0)
    .map(word => {
      return word
        .split('')
        .map(char => MORSE_CODE_MAP[char] || '')
        .filter(Boolean)
        .join(' ');
    })
    .join(' / ');
}

// Traducir Morse -> Texto
function translateMorseToText(morse) {
  // Limpiar y estandarizar separadores
  const sanitized = morse.trim();
  if (!sanitized) return '';

  // Dividir por palabras (separadas por '/' o triples espacios)
  const words = sanitized.split(/\s*\/\s*|\s{3,}/);

  return words
    .map(word => {
      // Dividir por letras dentro de la palabra (espacios simples)
      const letters = word.trim().split(/\s+/);
      return letters
        .map(code => REVERSE_MORSE_MAP[code] || (code ? '?' : ''))
        .join('');
    })
    .join(' ');
}

// Función principal de actualización
function doTranslation() {
  const value = inputText.value;
  inputCounter.textContent = `${value.length} caracteres`;

  if (!value.trim()) {
    outputText.value = '';
    return;
  }

  if (currentMode === 'text-to-morse') {
    outputText.value = translateTextToMorse(value);
  } else {
    outputText.value = translateMorseToText(value);
  }
}

// Cambiar modo de traducción
function setMode(mode) {
  if (currentMode === mode) return;
  currentMode = mode;

  // Si había sonido reproduciéndose, detenerlo
  stopAudioPlayback();

  if (currentMode === 'text-to-morse') {
    modeTextToMorseBtn.classList.add('active');
    modeMorseToTextBtn.classList.remove('active');
    inputTitle.textContent = 'Texto normal';
    outputTitle.textContent = 'Código Morse';
    inputText.placeholder = 'Escribe tu mensaje aquí...';
    outputText.placeholder = 'La traducción en código morse aparecerá aquí...';
    inputText.classList.remove('morse-mode-input');
    outputText.classList.add('morse-mode-input');
    morseHelpers.style.display = 'none';
  } else {
    modeMorseToTextBtn.classList.add('active');
    modeTextToMorseBtn.classList.remove('active');
    inputTitle.textContent = 'Código Morse';
    outputTitle.textContent = 'Texto normal';
    inputText.placeholder = 'Escribe Morse usando . y - (ej: .... --- .-.. .-)...';
    outputText.placeholder = 'La traducción a texto normal aparecerá aquí...';
    inputText.classList.add('morse-mode-input');
    outputText.classList.remove('morse-mode-input');
    morseHelpers.style.display = 'flex';
  }

  // Intercambiar contenido actual si existe
  const prevOutput = outputText.value;
  inputText.value = prevOutput;
  doTranslation();
  inputText.focus();
}

// Invertir modo
function toggleMode() {
  setMode(currentMode === 'text-to-morse' ? 'morse-to-text' : 'text-to-morse');
}

// Inserción rápida de botones morse (. / - / espacio)
function insertAtCursor(textToInsert) {
  const start = inputText.selectionStart;
  const end = inputText.selectionEnd;
  const val = inputText.value;
  inputText.value = val.substring(0, start) + textToInsert + val.substring(end);
  inputText.selectionStart = inputText.selectionEnd = start + textToInsert.length;
  inputText.focus();
  doTranslation();
}

// Copiar al portapapeles
async function copyOutput() {
  if (!outputText.value) return;
  try {
    await navigator.clipboard.writeText(outputText.value);
    copyLabel.textContent = '¡Copiado!';
    copyBtn.style.background = 'var(--success)';
    setTimeout(() => {
      copyLabel.textContent = 'Copiar';
      copyBtn.style.background = '';
    }, 1800);
  } catch (err) {
    // Fallback si falla clipboard api
    outputText.select();
    document.execCommand('copy');
    copyLabel.textContent = '¡Copiado!';
    setTimeout(() => {
      copyLabel.textContent = 'Copiar';
    }, 1800);
  }
}

// Sonido y Señal Luminosa Web Audio API
function getAudioContext() {
  if (!audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioContext = new AudioCtx();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

function playTone(durationMs, freq = 650) {
  return new Promise(resolve => {
    if (stopAudioRequested) {
      resolve();
      return;
    }
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    // Suavizar click con rampa
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.005);
    gain.gain.setValueAtTime(0.2, ctx.currentTime + (durationMs / 1000) - 0.005);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + (durationMs / 1000));

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Encender LED visual
    lamp.classList.add('on');

    osc.start();
    osc.stop(ctx.currentTime + (durationMs / 1000));

    setTimeout(() => {
      lamp.classList.remove('on');
      resolve();
    }, durationMs);
  });
}

function waitDelay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function stopAudioPlayback() {
  stopAudioRequested = true;
  isPlayingAudio = false;
  playSoundBtn.classList.remove('playing');
  playLabel.textContent = 'Escuchar';
  signalLight.classList.remove('active');
  lamp.classList.remove('on');
}

async function playMorseAudio() {
  if (isPlayingAudio) {
    stopAudioPlayback();
    return;
  }

  // Determinar el código morse a reproducir
  let morseCode = '';
  if (currentMode === 'text-to-morse') {
    morseCode = outputText.value;
  } else {
    morseCode = inputText.value;
  }

  if (!morseCode.trim()) return;

  isPlayingAudio = true;
  stopAudioRequested = false;
  playSoundBtn.classList.add('playing');
  playLabel.textContent = 'Detener';
  signalLight.classList.add('active');

  const UNIT = 75; // Duración base de 1 punto (en ms)
  const DOT_TIME = UNIT;
  const DASH_TIME = UNIT * 3;
  const SYMBOL_PAUSE = UNIT;
  const LETTER_PAUSE = UNIT * 3;
  const WORD_PAUSE = UNIT * 7;

  for (let i = 0; i < morseCode.length; i++) {
    if (stopAudioRequested) break;

    const char = morseCode[i];

    if (char === '.') {
      await playTone(DOT_TIME);
      await waitDelay(SYMBOL_PAUSE);
    } else if (char === '-' || char === '—') {
      await playTone(DASH_TIME);
      await waitDelay(SYMBOL_PAUSE);
    } else if (char === ' ') {
      await waitDelay(LETTER_PAUSE);
    } else if (char === '/') {
      await waitDelay(WORD_PAUSE);
    }
  }

  stopAudioPlayback();
}

// Event Listeners
inputText.addEventListener('input', doTranslation);

clearBtn.addEventListener('click', () => {
  inputText.value = '';
  outputText.value = '';
  inputCounter.textContent = '0 caracteres';
  stopAudioPlayback();
  inputText.focus();
});

copyBtn.addEventListener('click', copyOutput);
playSoundBtn.addEventListener('click', playMorseAudio);
swapModeBtn.addEventListener('click', toggleMode);
modeTextToMorseBtn.addEventListener('click', () => setMode('text-to-morse'));
modeMorseToTextBtn.addEventListener('click', () => setMode('morse-to-text'));

// Botones de ayuda morse
document.querySelectorAll('.morse-insert-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    insertAtCursor(btn.dataset.val);
  });
});

// Inicialización
initReferenceTable();
outputText.classList.add('morse-mode-input');
