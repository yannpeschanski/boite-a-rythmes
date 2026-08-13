// Clic de métronome pour le précompte avant l'enregistrement du direct
// (PLAN.md §6, retour de Yann : « métronome + précompte avant
// l'enregistrement WAV »). Connecté directement à `ctx.destination`, jamais
// au graphe de mixage (`finalGain`, point de capture de LiveRecorder) —
// audible au performer, jamais dans le WAV capturé, même si le précompte et
// le début de l'enregistrement se chevauchaient d'une frame.
export function scheduleClick(ctx: BaseAudioContext, time: number, accented: boolean): void {
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.setValueAtTime(accented ? 1500 : 1000, time);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(accented ? 0.35 : 0.22, time + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.06);
}
