/**
 * Keyboard + mouse input with pointer-lock look.
 * Action-mapped so rebinding stays trivial later.
 */
export class Input {
  private keys = new Set<string>();
  private pressedThisFrame = new Set<string>();

  /** Accumulated look delta since last consume (pointer-locked mouse). */
  lookX = 0;
  lookY = 0;
  /** Mouse wheel steps since last consume (+1 / -1 per notch). */
  wheel = 0;

  mouseDown = false;
  private mousePressedThisFrame = false;

  locked = false;
  /** When false (menu open) gameplay input is ignored. */
  enabled = false;

  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;
      if (e.repeat) return;
      this.keys.add(e.code);
      this.pressedThisFrame.add(e.code);
      // keep the browser from scrolling / focusing UI
      if (['Space', 'Tab', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.releaseAll());

    this.canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled || !this.locked) return;
      if (e.button === 0) {
        this.mouseDown = true;
        this.mousePressedThisFrame = true;
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.lookX += e.movementX;
      this.lookY += e.movementY;
    });

    window.addEventListener(
      'wheel',
      (e) => {
        if (!this.enabled || !this.locked) return;
        this.wheel += Math.sign(e.deltaY);
      },
      { passive: true },
    );

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.canvas;
      if (!this.locked) this.releaseAll();
      this.onLockChange?.(this.locked);
    });
  }

  onLockChange: ((locked: boolean) => void) | null = null;

  requestLock(): void {
    this.canvas.requestPointerLock();
  }

  private releaseAll(): void {
    this.keys.clear();
    this.mouseDown = false;
  }

  down(code: string): boolean {
    return this.keys.has(code);
  }
  /** True only on the frame the key went down. */
  pressed(code: string): boolean {
    return this.pressedThisFrame.has(code);
  }
  clickPressed(): boolean {
    return this.mousePressedThisFrame;
  }

  /** Read & clear accumulated look delta. */
  consumeLook(): { x: number; y: number } {
    const r = { x: this.lookX, y: this.lookY };
    this.lookX = 0;
    this.lookY = 0;
    return r;
  }
  consumeWheel(): number {
    const w = this.wheel;
    this.wheel = 0;
    return w;
  }

  /** Call at end of each frame. */
  endFrame(): void {
    this.pressedThisFrame.clear();
    this.mousePressedThisFrame = false;
  }
}
