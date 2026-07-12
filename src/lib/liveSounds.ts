// Procedural sound effects for the live show using Web Audio API.
// No external assets — synthesized on the fly so it works offline & instantly.

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      const AC = (window.AudioContext || (window as any).webkitAudioContext);
      if (!AC) return null;
      ctx = new AC();
    } catch { return null; }
  }
  if (ctx?.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

type Note = { freq: number; start: number; dur: number; type?: OscillatorType; gain?: number };

function playNotes(notes: Note[]) {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  notes.forEach((n) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = n.type ?? 'sine';
    osc.frequency.value = n.freq;
    const peak = n.gain ?? 0.18;
    g.gain.setValueAtTime(0.0001, now + n.start);
    g.gain.exponentialRampToValueAtTime(peak, now + n.start + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + n.start + n.dur);
    osc.connect(g).connect(ac.destination);
    osc.start(now + n.start);
    osc.stop(now + n.start + n.dur + 0.02);
  });
}

// 1) New question — bright ascending arpeggio
export function playNewQuestion() {
  playNotes([
    { freq: 523.25, start: 0.00, dur: 0.18, type: 'triangle' }, // C5
    { freq: 659.25, start: 0.10, dur: 0.18, type: 'triangle' }, // E5
    { freq: 783.99, start: 0.20, dur: 0.28, type: 'triangle' }, // G5
  ]);
}

// 2) Answer submitted, waiting — soft ticking pulse
export function playWaiting() {
  playNotes([
    { freq: 440, start: 0.00, dur: 0.12, type: 'sine', gain: 0.12 },
    { freq: 440, start: 0.22, dur: 0.12, type: 'sine', gain: 0.10 },
  ]);
}

// 3) Correct — cheerful major triad rise
export function playCorrect() {
  playNotes([
    { freq: 659.25, start: 0.00, dur: 0.18, type: 'triangle' }, // E5
    { freq: 783.99, start: 0.10, dur: 0.20, type: 'triangle' }, // G5
    { freq: 1046.5, start: 0.22, dur: 0.35, type: 'triangle', gain: 0.22 }, // C6
  ]);
}

// 4) Wrong — descending buzz
export function playWrong() {
  playNotes([
    { freq: 220, start: 0.00, dur: 0.22, type: 'sawtooth', gain: 0.14 },
    { freq: 155, start: 0.18, dur: 0.35, type: 'sawtooth', gain: 0.14 },
  ]);
}
