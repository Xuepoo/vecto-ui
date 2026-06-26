/**
 * Map from a single grapheme character to its pre-measured glyph metrics.
 *
 * Each entry provides the glyph's pixel `width` at `baseSize`, and an `ast`
 * property holding the raw vector path data used by the renderer.
 */
export interface GlyphAtlas {
  [char: string]: {
    width: number;
    baseSize: number;
    ast: any;
  };
}

/**
 * Resolves the pixel advance width of a single grapheme at a given font size,
 * for glyphs not present in a pre-baked {@link GlyphAtlas}.
 *
 * Implemented by {@link createCanvasMeasurer} (canvas `measureText`), but kept
 * abstract so callers can supply their own metrics source.
 */
export interface GlyphMeasurer {
  measure(char: string, fontSize: number): number;
}

/**
 * A single positioned glyph produced by {@link LayoutEngine.layoutText}.
 */
export interface LayoutNode {
  char: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The complete output of a text layout pass — an ordered list of positioned
 * glyphs and the total bounding-box dimensions.
 */
export interface LayoutResult {
  nodes: LayoutNode[];
  totalWidth: number;
  totalHeight: number;
}

/** A single measured grapheme (the "cold" half of the cold/hot split). */
export interface PreparedGlyph {
  char: string;
  /** Advance width at the prepared `fontSize`. */
  width: number;
}

/** A measured word/segment, ready to be placed without re-measuring. */
export interface PreparedWord {
  glyphs: PreparedGlyph[];
  /** Sum of glyph advances — used for word-level wrap decisions. */
  width: number;
  isWordLike: boolean | undefined;
  /** Pre-computed `word.trim().length === 0`. */
  isWhitespace: boolean;
}

/** A measured paragraph; `isEmpty` marks a blank line (forced newline). */
export interface PreparedParagraph {
  words: PreparedWord[];
  isEmpty: boolean;
}

/**
 * The result of the **cold** measurement pass ({@link LayoutEngine.prepare}):
 * segmented + measured text that is independent of layout constraints
 * (`maxWidth`/`maxHeight`/exclusion masks). Reuse it across cheap **hot**
 * re-layouts ({@link LayoutEngine.layoutPrepared}) on resize / reposition,
 * avoiding the per-frame `Intl.Segmenter` + measurement cost.
 */
export interface PreparedText {
  paragraphs: PreparedParagraph[];
  fontSize: number;
}

/**
 * VectoUI Global Layout Engine (Intl.Segmenter)
 * Advanced Typography Engine supporting CJK, Emoji, and Western Graphemes
 */
export class LayoutEngine {
  public maxWidth: number;
  public maxHeight: number;
  public preserveLeadingSpaces: boolean = false;
  private wordSegmenter: Intl.Segmenter;
  private charSegmenter: Intl.Segmenter;
  private wordCache: Map<string, Array<{ segment: string; isWordLike: boolean | undefined }>> =
    new Map();
  private graphemeCache: Map<string, string[]> = new Map();
  private measurer: GlyphMeasurer | null;

  constructor(maxWidth: number, maxHeight: number, measurer?: GlyphMeasurer | null) {
    this.maxWidth = maxWidth;
    this.maxHeight = maxHeight;
    this.measurer = measurer ?? null;

    // Auto-detect browser locale for intelligent CJK and Western word boundaries
    const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';

    this.wordSegmenter = new Intl.Segmenter(locale, { granularity: 'word' });
    this.charSegmenter = new Intl.Segmenter(locale, { granularity: 'grapheme' });
  }

  private getWordSegments(
    paragraph: string,
  ): Array<{ segment: string; isWordLike: boolean | undefined }> {
    const cached = this.wordCache.get(paragraph);
    if (cached) return cached;

    const fresh = Array.from(this.wordSegmenter.segment(paragraph)).map((s) => ({
      segment: s.segment,
      isWordLike: s.isWordLike,
    }));
    if (this.wordCache.size > 500) this.wordCache.clear();
    this.wordCache.set(paragraph, fresh);
    return fresh;
  }

  /**
   * Resolve a grapheme's advance width at `fontSize`, in priority order:
   * pre-baked atlas entry → injected {@link GlyphMeasurer} → `0.5em` fallback.
   */
  private glyphWidth(char: string, fontAtlas: GlyphAtlas, fontSize: number): number {
    const glyphInfo = fontAtlas[char];
    if (glyphInfo) return glyphInfo.width * (fontSize / glyphInfo.baseSize);
    if (this.measurer) return this.measurer.measure(char, fontSize);
    return fontSize * 0.5;
  }

  private getGraphemes(word: string): string[] {
    const cached = this.graphemeCache.get(word);
    if (cached) return cached;

    const fresh = Array.from(this.charSegmenter.segment(word)).map((g) => g.segment);
    if (this.graphemeCache.size > 2000) this.graphemeCache.clear();
    this.graphemeCache.set(word, fresh);
    return fresh;
  }

  /**
   * Lay out a Unicode string into a list of positioned {@link LayoutNode} glyphs.
   *
   * Uses `Intl.Segmenter` to correctly handle CJK, emoji, and Western word
   * boundaries.  An optional `exclusionMask` callback allows glyphs to flow
   * around arbitrary shapes (e.g. physics bodies or video regions).
   *
   * @param text - The raw text string to lay out (newlines force paragraph breaks).
   * @param fontAtlas - Pre-measured glyph metrics keyed by grapheme character.
   * @param fontSize - Target font size in pixels (default: `32`).
   * @param exclusionMask - Optional callback returning `true` when a candidate
   *   glyph bounding box overlaps a forbidden region; the engine skips that
   *   position and advances horizontally.
   * @returns A {@link LayoutResult} with all positioned glyph nodes and total dimensions.
   * @example
   * const result = engine.layoutText('Hello 世界', atlas, 24);
   * result.nodes.forEach(n => console.log(n.char, n.x, n.y));
   */
  public layoutText(
    text: string,
    fontAtlas: GlyphAtlas,
    fontSize: number = 32,
    exclusionMask?: (x: number, y: number, w: number, h: number) => boolean,
  ): LayoutResult {
    return this.layoutPrepared(this.prepare(text, fontAtlas, fontSize), exclusionMask);
  }

  /**
   * **Cold pass.** Segment and measure `text` once into a reusable
   * {@link PreparedText}. Runs `Intl.Segmenter` (word + grapheme) and resolves
   * each grapheme's advance width — the expensive work. The result is
   * independent of `maxWidth`/`maxHeight`/exclusion masks, so it can be re-laid
   * out cheaply by {@link layoutPrepared} on resize / reposition / animation.
   *
   * @param text - The raw text string (newlines force paragraph breaks).
   * @param fontAtlas - Pre-measured glyph metrics keyed by grapheme character.
   * @param fontSize - Target font size in pixels (default: `32`).
   */
  public prepare(text: string, fontAtlas: GlyphAtlas, fontSize: number = 32): PreparedText {
    const paragraphs: PreparedParagraph[] = [];

    for (const paragraph of text.split('\n')) {
      if (paragraph.length === 0) {
        paragraphs.push({ words: [], isEmpty: true });
        continue;
      }

      const words: PreparedWord[] = [];
      for (const segment of this.getWordSegments(paragraph)) {
        const word = segment.segment;
        const glyphs: PreparedGlyph[] = [];
        let width = 0;
        for (const char of this.getGraphemes(word)) {
          const w = this.glyphWidth(char, fontAtlas, fontSize);
          glyphs.push({ char, width: w });
          width += w;
        }
        words.push({
          glyphs,
          width,
          isWordLike: segment.isWordLike,
          isWhitespace: word.trim().length === 0,
        });
      }
      paragraphs.push({ words, isEmpty: false });
    }

    return { paragraphs, fontSize };
  }

  /**
   * **Hot pass.** Place an already-measured {@link PreparedText} into positioned
   * glyphs. Does only wrap/positioning arithmetic — no `Intl.Segmenter`, no
   * re-measurement — so it is cheap enough to call every frame or on every
   * resize. Reads the engine's current `maxWidth`/`maxHeight`, so changing those
   * and re-calling reflows the same prepared text.
   *
   * @param prepared - Output of {@link prepare}.
   * @param exclusionMask - Optional collision callback (see {@link layoutText}).
   */
  public layoutPrepared(
    prepared: PreparedText,
    exclusionMask?: (x: number, y: number, w: number, h: number) => boolean,
  ): LayoutResult {
    const layoutNodes: LayoutNode[] = [];
    const fontSize = prepared.fontSize;
    const lineHeight = fontSize * 1.5;
    let currentX = 0;
    let currentY = 0;
    let maxLineWidth = 0;

    for (const paragraph of prepared.paragraphs) {
      if (paragraph.isEmpty) {
        currentY += lineHeight;
        currentX = 0;
        continue;
      }

      for (const word of paragraph.words) {
        // Word-level wrap
        if (currentX + word.width > this.maxWidth && currentX > 0) {
          if (word.isWordLike === false && word.isWhitespace) continue;
          currentX = 0;
          currentY += lineHeight;
        }

        for (const glyph of word.glyphs) {
          const charWidth = glyph.width;

          let foundSpot = false;
          while (currentY < this.maxHeight) {
            if (currentX + charWidth > this.maxWidth && currentX > 0) {
              currentX = 0;
              currentY += lineHeight;
              continue;
            }
            if (exclusionMask && exclusionMask(currentX, currentY, charWidth, fontSize)) {
              currentX += charWidth;
              continue;
            }
            foundSpot = true;
            break;
          }

          if (!foundSpot || currentY >= this.maxHeight) break; // Out of bounds

          // Don't render invisible leading characters at the START of a new line
          if (currentX === 0 && glyph.char.trim().length === 0 && !this.preserveLeadingSpaces)
            continue;

          layoutNodes.push({
            char: glyph.char,
            x: currentX,
            y: currentY,
            width: charWidth,
            height: fontSize,
          });

          currentX += charWidth;
          if (currentX > maxLineWidth) maxLineWidth = currentX;
        }
      }

      currentX = 0;
      currentY += lineHeight;
    }

    return { nodes: layoutNodes, totalWidth: maxLineWidth, totalHeight: currentY };
  }

  /**
   * Lay out a Unicode string directly into a pre-allocated {@link LayoutResultBuffer}.
   *
   * Avoids GC allocations by writing results directly to flat typed arrays in the buffer.
   *
   * @param text - The raw text string to lay out.
   * @param fontAtlas - Pre-measured glyph metrics keyed by grapheme character.
   * @param fontSize - Target font size in pixels.
   * @param buffer - The pre-allocated buffer to write layout results into.
   * @param exclusionMask - Optional collision-detection callback.
   */
  public layoutTextIntoBuffer(
    text: string,
    fontAtlas: GlyphAtlas,
    fontSize: number,
    buffer: LayoutResultBuffer,
    exclusionMask?: (x: number, y: number, w: number, h: number) => boolean,
  ): void {
    this.layoutPreparedIntoBuffer(this.prepare(text, fontAtlas, fontSize), buffer, exclusionMask);
  }

  /**
   * **Hot pass, zero-GC variant.** Place an already-measured {@link PreparedText}
   * directly into a pre-allocated {@link LayoutResultBuffer}. Like
   * {@link layoutPrepared} but writes flat typed arrays instead of allocating
   * {@link LayoutNode} objects — the per-frame path for large dynamic scenes.
   */
  public layoutPreparedIntoBuffer(
    prepared: PreparedText,
    buffer: LayoutResultBuffer,
    exclusionMask?: (x: number, y: number, w: number, h: number) => boolean,
  ): void {
    buffer.reset();
    const fontSize = prepared.fontSize;
    const lineHeight = fontSize * 1.5;
    let currentX = 0;
    let currentY = 0;

    for (const paragraph of prepared.paragraphs) {
      if (paragraph.isEmpty) {
        currentY += lineHeight;
        currentX = 0;
        continue;
      }

      for (const word of paragraph.words) {
        if (currentX + word.width > this.maxWidth && currentX > 0) {
          if (word.isWordLike === false && word.isWhitespace) continue;
          currentX = 0;
          currentY += lineHeight;
        }

        for (const glyph of word.glyphs) {
          if (buffer.count >= LayoutResultBuffer.CAPACITY) break;

          const charWidth = glyph.width;

          let foundSpot = false;
          while (currentY < this.maxHeight) {
            if (currentX + charWidth > this.maxWidth && currentX > 0) {
              currentX = 0;
              currentY += lineHeight;
              continue;
            }
            if (exclusionMask && exclusionMask(currentX, currentY, charWidth, fontSize)) {
              currentX += charWidth;
              continue;
            }
            foundSpot = true;
            break;
          }

          if (!foundSpot || currentY >= this.maxHeight) break;

          if (currentX === 0 && glyph.char.trim().length === 0) continue;

          const idx = buffer.count;
          buffer.chars[idx] = glyph.char;
          buffer.xs[idx] = currentX;
          buffer.ys[idx] = currentY;
          buffer.ws[idx] = charWidth;
          buffer.hs[idx] = fontSize;
          buffer.count++;

          currentX += charWidth;
        }
      }

      currentX = 0;
      currentY += lineHeight;
    }
  }
}

/**
 * Pre-allocated buffer for zero-GC layout results.
 * Reuse a single instance across frames by calling reset() before each layout pass.
 */
export class LayoutResultBuffer {
  static readonly CAPACITY = 16384;
  /** X positions of each glyph. */
  xs: Float32Array = new Float32Array(LayoutResultBuffer.CAPACITY);
  /** Y positions of each glyph. */
  ys: Float32Array = new Float32Array(LayoutResultBuffer.CAPACITY);
  /** Widths of each glyph. */
  ws: Float32Array = new Float32Array(LayoutResultBuffer.CAPACITY);
  /** Heights of each glyph. */
  hs: Float32Array = new Float32Array(LayoutResultBuffer.CAPACITY);
  /** Character for each glyph slot. */
  chars: string[] = Array.from({ length: LayoutResultBuffer.CAPACITY });
  /** Number of valid glyphs written in this buffer. */
  count: number = 0;

  /** Reset the buffer for reuse. Does NOT free memory. */
  reset(): void {
    this.count = 0;
  }

  /** Convert to the standard LayoutResult format (allocates — use sparingly). */
  toLayoutResult(): LayoutResult {
    const nodes: LayoutNode[] = [];
    for (let i = 0; i < this.count; i++) {
      nodes.push({
        char: this.chars[i],
        x: this.xs[i],
        y: this.ys[i],
        width: this.ws[i],
        height: this.hs[i],
      });
    }
    return { nodes, totalWidth: 0, totalHeight: 0 };
  }
}
