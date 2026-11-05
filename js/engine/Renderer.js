import { renderSeamlessLoopFrames } from './LoopFrames.js';

export default class Renderer {
    constructor(canvas, emitter, options = {}) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.context.imageSmoothingEnabled = false;
        this.emitter = emitter;
        this.showTarget = options.showTarget ?? true;
        this.showOriginDot = options.showOriginDot ?? true;
        this.continuous = options.continuous ?? true;
        this.lastTime = 0;
        this.running = false;
        this.onFrame = options.onFrame || (() => {});
        this.blendMode = 'source-over';
        this.timeScale = 1.0;

        this.framePreviewMode = false;
        this.frameCount = 8;
        this.frameDuration = 1.25;
        this.previewTime = 0;
        this._previewFrames = null;
        this._previewDirty = true;
        this._rebuilding = false;
        this._previewGeneration = 0;
        this._theme = null;
    }

    // getComputedStyle forces a style recalculation; the theme is static for a
    // mounted canvas, so resolve these custom properties once and cache them.
    readTheme() {
        if (!this._theme) {
            const styles = getComputedStyle(this.canvas);
            this._theme = {
                accent: styles.getPropertyValue('--accent').trim() || '#32d7ff',
                muted: styles.getPropertyValue('--text-muted').trim() || '#9aa3b2'
            };
        }
        return this._theme;
    }

    refreshTheme() {
        this._theme = null;
    }

    start() {
        if (this.running) return;
        this.running = true;
        requestAnimationFrame((time) => this.loop(time));
    }

    loop(time) {
        if (!this.running) return;

        const deltaTime = (Math.min((time - this.lastTime) / 1000 || 0, 1 / 30)) * this.timeScale;
        this.lastTime = time;

        if (this.framePreviewMode) {
            this.clear();

            if (this._previewDirty && !this._rebuilding) {
                this._rebuildPreviewFrames();
            }

            if (this._previewFrames && this._previewFrames.length === this.frameCount) {
                this.previewTime += deltaTime;
                if (this.previewTime >= this.frameDuration) {
                    this.previewTime -= this.frameDuration;
                }
                let frameIndex = Math.floor((this.previewTime / this.frameDuration) * this.frameCount);
                frameIndex = Math.min(this.frameCount - 1, Math.max(0, frameIndex));
                this.context.putImageData(this._previewFrames[frameIndex], 0, 0);
                this.onFrame(this.emitter.particles.length);
            }

            this.drawTargetDummy();
            this.drawViewportGuides();

            if (this._rebuilding) {
                this._drawPreviewBuildingOverlay();
            }
        } else {
            this.clear();
            this.drawTargetDummy();
            this.drawViewportGuides();
            this.emitter.update(deltaTime, this.continuous);

            this.context.globalCompositeOperation = this.blendMode;
            this.emitter.draw(this.context);
            this.context.globalCompositeOperation = 'source-over';

            this.onFrame(this.emitter.particles.length);
        }

        requestAnimationFrame((nextTime) => this.loop(nextTime));
    }

    _drawPreviewBuildingOverlay() {
        const context = this.context;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const muted = this.readTheme().muted;

        context.save();
        context.fillStyle = muted;
        context.font = '10px sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText('⟳ Building preview…', w / 2, h / 2);
        context.restore();
    }

    async _rebuildPreviewFrames() {
        const generation = this._previewGeneration;
        const { frameCount } = this;
        const size = this.canvas.width;
        this._rebuilding = true;
        this._previewDirty = false;

        try {
            const { frames } = await renderSeamlessLoopFrames({
                config: this.emitter.config,
                width: size,
                height: size,
                frameCount
            });

            // Discard results produced for configuration or dimensions that have
            // since changed, and never let a rejected build escape as an
            // unhandled promise rejection from the animation loop.
            if (generation !== this._previewGeneration
                || frameCount !== this.frameCount
                || size !== this.canvas.width) return;

            this._previewFrames = frames.map((frameCanvas) => (
                frameCanvas.getContext('2d').getImageData(0, 0, size, size)
            ));
        } catch (error) {
            console.error('Seamless loop preview could not be rebuilt.', error);
            // A later configuration change marks the preview dirty again; retrying
            // every frame here would spin on a permanently failing encoder.
        } finally {
            this._rebuilding = false;
        }
    }

    clear() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    setEmitter(emitter) {
        this.emitter = emitter;
        this.markPreviewDirty();
    }

    setShowTarget(value) {
        this.showTarget = value;
    }

    setShowOriginDot(value) {
        this.showOriginDot = value;
    }

    setContinuous(value) {
        this.continuous = value;
    }

    setBlendMode(mode) {
        this.blendMode = mode;
    }

    setTimeScale(value) {
        this.timeScale = value;
    }

    setFramePreviewMode(enabled, frameCount, frameDuration) {
        const bounded = (value, fallback, minimum, maximum) => {
            const numeric = Number(value);
            return Number.isFinite(numeric) ? Math.min(maximum, Math.max(minimum, numeric)) : fallback;
        };
        this.framePreviewMode = enabled;
        if (frameCount !== undefined) this.frameCount = Math.round(bounded(frameCount, 8, 1, 120));
        if (frameDuration !== undefined) this.frameDuration = bounded(frameDuration, 1.25, 0.05, 30);
        this.markPreviewDirty();
    }

    markPreviewDirty() {
        this._previewDirty = true;
        this._previewGeneration += 1;
    }

    exportPng(filename = `pixel-fx-${Date.now()}.png`) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }

    drawTargetDummy() {
        if (!this.showTarget) return;

        const context = this.context;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        const scale = w / 160;
        const headRadius = 10 * scale;
        const bodyWidth = 18 * scale;
        const bodyHeight = 38 * scale;
        const legHeight = 26 * scale;

        const bodyTop = cy - bodyHeight / 2;
        const bodyBottom = bodyTop + bodyHeight;
        const headCenterY = bodyTop - headRadius;

        context.fillStyle = 'rgba(255,255,255,0.07)';

        context.beginPath();
        context.arc(cx, headCenterY, headRadius, 0, Math.PI * 2);
        context.fill();

        context.fillRect(cx - bodyWidth / 2, bodyTop, bodyWidth, bodyHeight);

        const legWidth = bodyWidth / 2.6;
        context.fillRect(cx - bodyWidth / 2, bodyBottom, legWidth, legHeight);
        context.fillRect(cx + bodyWidth / 2 - legWidth, bodyBottom, legWidth, legHeight);
    }

    drawViewportGuides() {
        const context = this.context;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        context.save();
        context.strokeStyle = 'rgba(255,255,255,0.04)';
        context.setLineDash([2, 4]);

        context.beginPath();
        context.moveTo(0, cy);
        context.lineTo(w, cy);
        context.stroke();

        context.beginPath();
        context.moveTo(cx, 0);
        context.lineTo(cx, h);
        context.stroke();

        context.setLineDash([]);
        context.restore();

        if (this.showOriginDot) {
            const accent = this.readTheme().accent;
            const ox = Math.round(this.emitter.originX);
            const oy = Math.round(this.emitter.originY);
            context.fillStyle = accent;
            context.fillRect(ox - 1, oy - 1, 3, 3);
        }
    }
}
