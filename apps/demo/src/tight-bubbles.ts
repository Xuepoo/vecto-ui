import { Scene, Entity, CanvasRenderer, LayoutEngine } from '@vecto/core';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const MESSAGES = [
  "Hey! How's it going?",
  "I'm working on a high-performance Canvas ECS engine. It's incredibly fast!",
  'That sounds awesome! Does it support text wrapping?',
  'Yes! In fact, it supports tight multiline message bubbles. Unlike the DOM, which leaves huge empty spaces on the right when text wraps, this engine calculates the exact maximum line width and shrinks the bubble to fit perfectly.',
  "Wow, that's exactly what Pretext does! The 'Bubbles' demo.",
  'Exactly! Zero DOM measurements in the hot path. 🚀',
  'Can it handle thousands of bubbles?',
  "Let's find out! Drag these bubbles around to see the physics.",
];

export class ChatBubbleEntity extends Entity {
  private text: string;
  private padding: number = 16;
  private maxWidth: number = 300;
  private bgColor: string;
  private lines: any[] = [];
  private tightWidth: number = 0;
  private totalHeight: number = 0;

  public vx: number = 0;
  public vy: number = 0;

  constructor(text: string, color: string) {
    super();
    this.text = text;
    this.bgColor = color;
    this.interactive = true;
    this.layout();
  }

  private layout() {
    // 1. Layout text with maximum allowed width
    this.lines = LayoutEngine.layout(this.text, {
      font: '16px "Helvetica Neue", Helvetica, sans-serif',
      maxWidth: this.maxWidth,
      lineHeight: 24,
    });

    // 2. Calculate the "Tight Width" (maximum of all individual line widths)
    this.tightWidth = 0;
    for (const line of this.lines) {
      if (line.width > this.tightWidth) {
        this.tightWidth = line.width;
      }
    }

    // 3. Set physical bounding box for interactions
    this.width = this.tightWidth + this.padding * 2;
    this.height = this.lines.length * 24 + this.padding * 2;
  }

  update(dt: number, time: number) {
    // Basic screen bounce physics
    this.x += this.vx;
    this.y += this.vy;

    if (this.x < 0) {
      this.x = 0;
      this.vx *= -1;
    }
    if (this.y < 0) {
      this.y = 0;
      this.vy *= -1;
    }
    if (this.x + this.width > window.innerWidth) {
      this.x = window.innerWidth - this.width;
      this.vx *= -1;
    }
    if (this.y + this.height > window.innerHeight) {
      this.y = window.innerHeight - this.height;
      this.vy *= -1;
    }
  }

  render(renderer: any) {
    // 1. Draw Bubble Background
    renderer.beginPath();
    const r = 16;
    renderer.moveTo(r, 0);
    renderer.lineTo(this.width - r, 0);
    // top right
    renderer.bezierCurveTo(this.width, 0, this.width, r, this.width, r);
    renderer.lineTo(this.width, this.height - r);
    // bottom right
    renderer.bezierCurveTo(
      this.width,
      this.height,
      this.width - r,
      this.height,
      this.width - r,
      this.height,
    );
    renderer.lineTo(r, this.height);
    // bottom left
    renderer.bezierCurveTo(0, this.height, 0, this.height - r, 0, this.height - r);
    renderer.lineTo(0, r);
    // top left
    renderer.bezierCurveTo(0, 0, r, 0, r, 0);
    renderer.closePath();

    renderer.fill(this.bgColor);

    // 2. Draw Text Lines
    let currentY = this.padding + 16; // 16 is approx text ascent
    for (const line of this.lines) {
      renderer.fillText(
        line.text,
        this.padding,
        currentY,
        '16px "Helvetica Neue", Helvetica, sans-serif',
        '#ffffff',
      );
      currentY += 24;
    }
  }
}

export async function bootstrap() {
  document.body.innerHTML = '';
  document.body.style.margin = '0';
  document.body.style.overflow = 'hidden';
  document.body.style.backgroundColor = '#fbf7f0';

  const canvasParent = document.createElement('div');
  document.body.appendChild(canvasParent);

  const canvas = document.createElement('canvas');
  canvasParent.appendChild(canvas);

  const scene = new Scene(canvas);

  // Create Bubbles
  let startY = 100;
  for (let i = 0; i < MESSAGES.length; i++) {
    const bubble = new ChatBubbleEntity(MESSAGES[i], COLORS[i % COLORS.length]);
    bubble.setPosition(100 + Math.random() * 200, startY);
    bubble.vx = (Math.random() - 0.5) * 2;
    bubble.vy = (Math.random() - 0.5) * 2;
    scene.add(bubble);
    startY += bubble.height + 20;
  }

  // Interaction
  let draggedEntity: ChatBubbleEntity | null = null;
  let offsetX = 0;
  let offsetY = 0;

  window.addEventListener('pointerdown', (e) => {
    // Reverse iterate to find top-most
    for (let i = scene['root'].children.length - 1; i >= 0; i--) {
      const child = scene['root'].children[i] as ChatBubbleEntity;
      if (
        e.clientX >= child.x &&
        e.clientX <= child.x + child.width &&
        e.clientY >= child.y &&
        e.clientY <= child.y + child.height
      ) {
        draggedEntity = child;
        offsetX = e.clientX - child.x;
        offsetY = e.clientY - child.y;

        // Move to front
        scene['root'].children.splice(i, 1);
        scene.add(child);
        break;
      }
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (draggedEntity) {
      draggedEntity.x = e.clientX - offsetX;
      draggedEntity.y = e.clientY - offsetY;
    }
  });

  window.addEventListener('pointerup', () => {
    draggedEntity = null;
  });

  scene.start();

  // NavBar
  const nav = document.createElement('div');
  nav.style.position = 'fixed';
  nav.style.top = '0';
  nav.style.left = '0';
  nav.style.width = '100%';
  nav.style.zIndex = '9999';
  nav.style.background = 'rgba(0,0,0,0.8)';
  nav.style.color = 'white';
  nav.style.padding = '10px';
  nav.style.fontFamily = 'monospace';
  nav.style.display = 'flex';
  nav.style.gap = '20px';
  nav.style.alignItems = 'center';
  nav.style.borderBottom = '1px solid #444';

  nav.innerHTML = `
    <b style="color: #38bdf8;">Vectomancy Pro</b>
    <a href="#tight-bubbles" style="color: #fca5a5; text-decoration: none;" onclick="setTimeout(()=>location.reload(), 10)">💬 Tight Bubbles</a>
    <a href="#physics" style="color: #fff; text-decoration: none;" onclick="setTimeout(()=>location.reload(), 10)">📚 Physics Text</a>
    <a href="#bad-apple-lyrics" style="color: #fff; text-decoration: none;" onclick="setTimeout(()=>location.reload(), 10)">🎵 Lyrics Reflow</a>
    <a href="#bad-apple-variable" style="color: #fff; text-decoration: none;" onclick="setTimeout(()=>location.reload(), 10)">✨ Variable Font ASCII</a>
  `;
  document.body.appendChild(nav);
}

bootstrap();
