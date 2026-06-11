/** DOM HUD — gauges, prompts, nozzle pips, co-op status, toasts. */
export class Hud {
  private pressureFill = document.getElementById('pressure-fill') as HTMLElement;
  private waterFill = document.getElementById('water-fill') as HTMLElement;
  private hoseInfo = document.getElementById('hose-info') as HTMLElement;
  private prompt = document.getElementById('prompt') as HTMLElement;
  private reticle = document.getElementById('reticle') as HTMLElement;
  private netHud = document.getElementById('net-hud') as HTMLElement;
  private toastEl = document.getElementById('toast') as HTMLElement;
  private hud = document.getElementById('hud') as HTMLElement;
  private modes = [
    document.getElementById('mode-mist') as HTMLElement,
    document.getElementById('mode-stream') as HTMLElement,
    document.getElementById('mode-blast') as HTMLElement,
  ];
  private toastTimer: number | undefined;

  setVisible(v: boolean): void {
    this.hud.classList.toggle('hidden', !v);
  }

  update(s: {
    pressure: number;
    water01: number;
    hoseText: string;
    mode: number;
    spraying: boolean;
    prompt: { key: string; text: string } | null;
  }): void {
    this.pressureFill.style.width = `${Math.round(s.pressure * 100)}%`;
    this.waterFill.style.width = `${Math.round(s.water01 * 100)}%`;
    this.hoseInfo.textContent = s.hoseText;
    this.modes.forEach((el, i) => el.classList.toggle('active', i === s.mode));
    this.reticle.classList.toggle('spraying', s.spraying);

    if (s.prompt) {
      this.prompt.innerHTML = `<span class="key">${s.prompt.key}</span>${s.prompt.text}`;
      this.prompt.classList.remove('hidden');
    } else {
      this.prompt.classList.add('hidden');
    }
  }

  setNetInfo(lines: string[]): void {
    this.netHud.innerHTML = lines
      .map((l) => `<div class="pill">${l}</div>`)
      .join('');
  }

  toast(msg: string): void {
    this.toastEl.textContent = msg;
    this.toastEl.classList.remove('hidden');
    this.toastEl.classList.add('show');
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), 2200);
  }
}
