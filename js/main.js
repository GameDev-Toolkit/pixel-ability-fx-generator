import {
    AbilityEffect,
    EFFECT_FAMILIES,
    ELEMENTS,
    FORMATIONS,
    PARTICLE_KITS,
    PARTICLE_SHAPES,
    POWER_LEVELS,
    TEMPORAL_STYLES,
    TRACE_STYLES,
    createEffectRecipe,
    randomSeed,
    renderEffectFrames
} from './AbilityEffect.js?v=13';
import { LOOP_MOTIFS, LOOP_MOTIF_GROUPS } from './engine/LoopArt.js?v=3';

const GIF_WORKER_URL = new URL('./gif.worker.js', import.meta.url).href;
const GIF_TRANSPARENT_COLOR = 0x010203;
const GIF_MATTE_COLOR = '#010203';

const canvas = document.querySelector('#fxCanvas');
const context = canvas.getContext('2d');
context.imageSmoothingEnabled = false;

const controls = {
    family: document.querySelector('#familySelect'),
    element: document.querySelector('#elementSelect'),
    power: document.querySelector('#powerSelect'),
    motif: document.querySelector('#motifSelect'),
    formation: document.querySelector('#formationSelect'),
    secondaryFormation: document.querySelector('#secondaryFormationSelect'),
    geometry: document.querySelector('#geometrySelect'),
    secondaryGeometry: document.querySelector('#secondaryGeometrySelect'),
    trace: document.querySelector('#traceSelect'),
    secondaryTrace: document.querySelector('#secondaryTraceSelect'),
    particleKit: document.querySelector('#particleKitSelect'),
    flow: document.querySelector('#flowSelect'),
    temporal: document.querySelector('#temporalSelect')
};

const seedInput = document.querySelector('#seedInput');
const generateButton = document.querySelector('#generateBtn');
const newSeedButton = document.querySelector('#newSeedBtn');
const replayButton = document.querySelector('#replayBtn');
const pauseButton = document.querySelector('#pauseBtn');
const recipeFamily = document.querySelector('#recipeFamily');
const recipeElement = document.querySelector('#recipeElement');
const durationStat = document.querySelector('#durationStat');
const particleStat = document.querySelector('#particleStat');
const layerStat = document.querySelector('#layerStat');
const symmetryStat = document.querySelector('#symmetryStat');
const paletteSwatches = document.querySelector('#paletteSwatches');
const frameProgress = document.querySelector('#frameProgress');
const stageLabel = document.querySelector('#stageLabel');
const canvasSizeSelect = document.querySelector('#canvasSizeSelect');
const frameCountSelect = document.querySelector('#frameCountSelect');
const fpsSelect = document.querySelector('#fpsSelect');
const atlasPreview = document.querySelector('#atlasPreview');
const atlasPreviewShell = document.querySelector('#atlasPreviewShell');
const notice = document.querySelector('#notice');
const particleShapePicker = document.querySelector('#particleShapePicker');
const particleShapeValue = document.querySelector('#particleShapeValue');
const exportButtons = [...document.querySelectorAll('#exportAtlasBtn, #exportFramesBtn, #exportGifBtn')];

const allGeometries = [...new Set(Object.values(FORMATIONS)
    .flatMap((family) => Object.values(family))
    .flatMap((formation) => formation.geometries))];
const allFlows = [...new Set(Object.values(FORMATIONS)
    .flatMap((family) => Object.values(family))
    .flatMap((formation) => formation.flows))];

const FORMATION_MOTIFS = {
    burst: {
        radial: 'starburst', cone: 'comet', axes: 'runicCross', spiral: 'spiral',
        collapse: 'blackhole', eruption: 'fire', twin: 'infinity', spokes: 'sunwheel',
        meteor: 'meteorRain', fissure: 'lightning', cascade: 'waterfall', orbitBreak: 'nova',
        crescent: 'eclipse', ricochet: 'shuriken', beam: 'radar', scatter: 'glitch'
    },
    barrier: {
        orbit: 'orbit', polygon: 'sigil', broken: 'thornRing', satellites: 'chain',
        braid: 'dna', diamondField: 'crystalCage', shell: 'prism', compass: 'clockwork',
        wall: 'lattice', cage: 'octahedron', prism: 'tetrahedron', gates: 'portal',
        swarm: 'plasma', hourglass: 'hourglass', cells: 'checker', arcArray: 'hexagram'
    },
    aura: {
        halo: 'mandala', fountain: 'crystalBloom', spiral: 'rose', petals: 'daisy',
        rain: 'rain', constellation: 'pentagram', helix: 'helix', tide: 'tide',
        mist: 'smoke', pillars: 'vine', orbitLanes: 'tunnel', wavefront: 'waves',
        leafVortex: 'leafVortex', pulseGrid: 'lissajous', comets: 'bladeWheel', swarm: 'aurora'
    }
};

let baseRecipe;
let activeEffect;
let startedAt = performance.now();
let frozenTime = 0;
let playing = true;
let noticeTimer;
let seedInputTimer;
let exportInProgress = false;
let atlasPreviewUrl;
let lastRenderedTime = Number.NaN;
let lastProgressStep = -1;
let lastStageText = '';

// Resolving computed styles on every icon repaint forces a style recalculation.
// The value is cached here and refreshed whenever the recipe palette changes.
let shapeIconColor = getComputedStyle(document.documentElement).getPropertyValue('--effect-accent').trim() || '#ef8dff';

const prettyLabel = (value) => String(value)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/-/g, ' ')
    .replace(/^./, (letter) => letter.toUpperCase());

const paintShapeIcon = (canvas, shape) => {
    const icon = canvas.getContext('2d');
    const color = shapeIconColor;
    icon.clearRect(0, 0, canvas.width, canvas.height);
    icon.fillStyle = color;
    const cells = {
        mixed: ['10001', '01010', '00100', '01010', '10001'],
        square: ['11111', '11111', '11111', '11111', '11111'],
        circle: ['01110', '11111', '11111', '11111', '01110'],
        diamond: ['00100', '01110', '11111', '01110', '00100'],
        cross: ['10001', '01010', '00100', '01010', '10001'],
        plus: ['00100', '00100', '11111', '00100', '00100'],
        spark: ['10101', '01110', '11111', '01110', '10101'],
        triangle: ['00100', '01110', '01110', '11111', '11111'],
        star: ['10101', '01110', '11111', '01110', '10101'],
        ring: ['01110', '10001', '10001', '10001', '01110'],
        hexagon: ['01110', '11111', '11111', '11111', '01110'],
        heart: ['01010', '11111', '11111', '01110', '00100'],
        shard: ['00100', '00110', '01110', '01100', '01000'],
        streak: ['00100', '00100', '00100', '00100', '00000'],
        chevron: ['10001', '01010', '00100', '00000', '00000'],
        cluster: ['11010', '11110', '01100', '10010', '00000']
    };
    const pattern = cells[shape] || cells.square;
    pattern.forEach((row, y) => [...row].forEach((cell, x) => {
        if (cell === '1') icon.fillRect(3 + x * 3, 3 + y * 3, 3, 3);
    }));
};

const buildParticleShapePicker = () => {
    const entries = [['mixed', 'Mixed kit'], ...Object.entries(PARTICLE_SHAPES)];
    entries.forEach(([key, label]) => {
        const button = document.createElement('button');
        const icon = document.createElement('canvas');
        const name = document.createElement('span');
        button.className = 'shape-option';
        button.type = 'button';
        button.dataset.shape = key;
        button.setAttribute('role', 'radio');
        button.setAttribute('aria-checked', 'false');
        button.title = label;
        icon.width = 21;
        icon.height = 21;
        icon.setAttribute('aria-hidden', 'true');
        name.textContent = label;
        button.append(icon, name);
        particleShapePicker.append(button);
        paintShapeIcon(icon, key);
    });
};

const selectedParticleShape = () => baseRecipe?.particleShapes?.length === 1
    ? baseRecipe.particleShapes[0]
    : 'mixed';

const syncParticleShapePicker = () => {
    const selected = selectedParticleShape();
    particleShapePicker.querySelectorAll('.shape-option').forEach((button) => {
        const active = button.dataset.shape === selected;
        button.classList.toggle('selected', active);
        button.setAttribute('aria-checked', String(active));
        paintShapeIcon(button.querySelector('canvas'), button.dataset.shape);
    });
    particleShapeValue.textContent = selected === 'mixed' ? 'Mixed kit' : PARTICLE_SHAPES[selected] || prettyLabel(selected);
};

const setSelectOptions = (select, entries, value, firstOption) => {
    select.replaceChildren();
    if (firstOption) select.append(new Option(firstOption.label, firstOption.value));
    entries.forEach(([key, label]) => select.append(new Option(label, key)));
    select.value = value;
};

const populateStaticControls = () => {
    setSelectOptions(
        controls.family,
        Object.entries(EFFECT_FAMILIES).map(([key, item]) => [key, item.shortLabel]),
        'burst'
    );
    setSelectOptions(
        controls.element,
        Object.entries(ELEMENTS).map(([key, item]) => [key, item.label]),
        'arcane'
    );
    setSelectOptions(
        controls.power,
        Object.entries(POWER_LEVELS).map(([key, item]) => [key, item.label]),
        'standard'
    );
    controls.motif.replaceChildren();
    for (const group of LOOP_MOTIF_GROUPS) {
        const options = document.createElement('optgroup');
        options.label = group.label;
        for (const [key, label] of Object.entries(group.motifs)) options.append(new Option(label, key));
        controls.motif.append(options);
    }
    controls.motif.value = 'mandala';
    setSelectOptions(controls.geometry, allGeometries.map((key) => [key, prettyLabel(key)]), 'circle');
    setSelectOptions(controls.secondaryGeometry, allGeometries.map((key) => [key, prettyLabel(key)]), 'ellipse');
    setSelectOptions(controls.trace, TRACE_STYLES.map((key) => [key, prettyLabel(key)]), 'pixels');
    setSelectOptions(controls.secondaryTrace, TRACE_STYLES.map((key) => [key, prettyLabel(key)]), 'dashes');
    setSelectOptions(
        controls.particleKit,
        Object.keys(PARTICLE_KITS).map((key) => [key, prettyLabel(key)]),
        'motes'
    );
    setSelectOptions(controls.flow, allFlows.map((key) => [key, prettyLabel(key)]), 'outward');
    setSelectOptions(
        controls.temporal,
        TEMPORAL_STYLES.map((key) => [key, prettyLabel(key)]),
        'instant'
    );
};

const syncFormationControls = () => {
    const formationEntries = Object.entries(FORMATIONS[baseRecipe.family])
        .map(([key, item]) => [key, item.label]);
    setSelectOptions(controls.formation, formationEntries, baseRecipe.formation);
    setSelectOptions(
        controls.secondaryFormation,
        formationEntries,
        baseRecipe.hybrid ? baseRecipe.secondaryFormation : 'none',
        { value: 'none', label: 'None' }
    );
};

const syncControls = () => {
    controls.family.value = baseRecipe.family;
    controls.element.value = baseRecipe.element;
    controls.power.value = baseRecipe.power;
    controls.motif.value = baseRecipe.motif;
    syncFormationControls();
    controls.geometry.value = baseRecipe.geometry;
    controls.secondaryGeometry.value = baseRecipe.secondaryGeometry;
    controls.trace.value = baseRecipe.traceStyle;
    controls.secondaryTrace.value = baseRecipe.secondaryTraceStyle;
    controls.particleKit.value = baseRecipe.particleKit;
    controls.flow.value = baseRecipe.flow;
    controls.temporal.value = baseRecipe.temporalStyle;
    controls.secondaryGeometry.disabled = !baseRecipe.hybrid;
    controls.secondaryTrace.disabled = !baseRecipe.hybrid;
    syncParticleShapePicker();
};

const setNotice = (message, tone = 'default') => {
    notice.textContent = message;
    notice.dataset.tone = tone;
    notice.classList.add('visible');
    window.clearTimeout(noticeTimer);
    noticeTimer = window.setTimeout(() => notice.classList.remove('visible'), 2800);
};

const sanitizeFilename = (value) => String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'ability-fx';

const exportName = () => `${sanitizeFilename(baseRecipe.name)}-${sanitizeFilename(baseRecipe.motif)}`;

const timestamp = () => new Date().toISOString().replace(/[:.]/g, '-');

const downloadUrl = (url, filename) => {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
};

const canvasToBlob = (sourceCanvas) => new Promise((resolve, reject) => {
    sourceCanvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas export failed.'));
    }, 'image/png');
});

const releaseAtlasPreview = () => {
    if (!atlasPreviewUrl) return;
    URL.revokeObjectURL(atlasPreviewUrl);
    atlasPreviewUrl = null;
};

// Export dimensions are select values, but they still bound the amount of canvas
// memory a single export can allocate. Reject non-finite or out-of-range values.
const boundedSetting = (value, fallback, minimum, maximum) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.min(maximum, Math.max(minimum, numeric)) : fallback;
};

const currentExportOptions = () => ({
    size: Math.round(boundedSetting(canvasSizeSelect.value, 160, 128, 256)),
    frameCount: Math.round(boundedSetting(frameCountSelect.value, 32, 24, 48)),
    fps: Math.round(boundedSetting(fpsSelect.value, 16, 12, 24))
});

const beginExport = () => {
    if (exportInProgress) {
        setNotice('An export is already in progress.', 'default');
        return false;
    }
    exportInProgress = true;
    exportButtons.forEach((button) => { button.disabled = true; });
    return true;
};

const endExport = () => {
    exportInProgress = false;
    exportButtons.forEach((button) => { button.disabled = false; });
};

const updateRecipeReadout = () => {
    recipeFamily.textContent = EFFECT_FAMILIES[baseRecipe.family]?.shortLabel ?? prettyLabel(baseRecipe.family);
    recipeElement.textContent = ELEMENTS[baseRecipe.element]?.label ?? prettyLabel(baseRecipe.element);
    durationStat.textContent = `${activeEffect.duration.toFixed(1)}s`;
    particleStat.textContent = activeEffect.particleCount;
    layerStat.textContent = baseRecipe.motif === 'orbit' || baseRecipe.motif === 'waves' ? 3 : 2;
    symmetryStat.textContent = `${baseRecipe.symmetry}-way`;
    paletteSwatches.replaceChildren();
    const palette = Array.isArray(baseRecipe.palette) ? baseRecipe.palette : [];
    palette.forEach((color, index) => {
        const swatch = document.createElement('span');
        swatch.className = 'palette-swatch';
        swatch.style.background = color;
        swatch.title = `${index + 1}: ${color}`;
        paletteSwatches.append(swatch);
    });
    shapeIconColor = palette[1] || '#ef8dff';
    document.documentElement.style.setProperty('--effect-accent', shapeIconColor);
    document.documentElement.style.setProperty('--effect-deep', palette[3] || '#6422b8');
    seedInput.value = baseRecipe.seed;
};

const resetPlayback = () => {
    startedAt = performance.now();
    frozenTime = 0;
    playing = true;
    lastRenderedTime = Number.NaN;
    lastProgressStep = -1;
    lastStageText = '';
    pauseButton.textContent = 'Pause';
    pauseButton.setAttribute('aria-pressed', 'false');
};

const applyRecipe = (recipe, { showNotice = false } = {}) => {
    baseRecipe = structuredClone(recipe);
    activeEffect = new AbilityEffect(baseRecipe);
    updateRecipeReadout();
    syncControls();
    resetPlayback();
    atlasPreviewShell.hidden = true;
    atlasPreview.replaceChildren();
    releaseAtlasPreview();
    lastRenderedTime = Number.NaN;
    lastProgressStep = -1;
    lastStageText = '';
    if (showNotice) setNotice('Effect updated', 'success');
};

const rebuildRecipe = (patch, { showNotice = true } = {}) => {
    applyRecipe({ ...baseRecipe, ...patch }, { showNotice });
};

// Seeds are exposed as a numeric input, so coerce them to the documented uint32
// range instead of letting NaN, Infinity or fractions reach the generator.
const MAX_SEED = 0xffffffff;
const normalizeSeed = (value) => {
    const raw = String(value ?? '').trim();
    const numeric = Number(raw);
    if (!raw || !Number.isFinite(numeric)) return randomSeed();
    return Math.min(MAX_SEED, Math.max(1, Math.trunc(numeric)));
};

const generateFromControls = ({ freshSeed = false } = {}) => {
    const seed = freshSeed ? randomSeed() : normalizeSeed(seedInput.value);
    const recipe = createEffectRecipe({
        family: controls.family.value,
        element: controls.element.value,
        power: controls.power.value,
        seed
    });
    applyRecipe(recipe);
    setNotice(`Variation ${recipe.seed} generated`, 'success');
};

const playbackTime = (now) => playing ? (now - startedAt) / 1000 : frozenTime;

const getStage = () => Object.hasOwn(LOOP_MOTIFS, baseRecipe.motif)
    ? LOOP_MOTIFS[baseRecipe.motif]
    : 'Seamless loop';

const animationLoop = (now) => {
    requestAnimationFrame(animationLoop);

    // Background tabs and paused playback do not change the frame; skip the full
    // canvas redraw and the associated DOM writes until the time actually moves.
    if (document.hidden) return;

    let time = playbackTime(now);
    if (playing && time >= activeEffect.duration) {
        const elapsedCycles = Math.floor(time / activeEffect.duration);
        startedAt += elapsedCycles * activeEffect.duration * 1000;
        time %= activeEffect.duration;
    }

    if (time === lastRenderedTime) return;
    lastRenderedTime = time;

    activeEffect.draw(context, time);
    const progress = Math.max(0, Math.min(1, time / activeEffect.duration));
    const progressStep = Math.round(progress * 200);
    if (progressStep !== lastProgressStep) {
        frameProgress.style.width = `${progressStep / 2}%`;
        lastProgressStep = progressStep;
    }
    const stageText = `${getStage()} · ${time.toFixed(1)}s`;
    if (stageText !== lastStageText) {
        stageLabel.textContent = stageText;
        lastStageText = stageText;
    }
};

const createAtlas = (frames, size) => {
    const columns = Math.min(8, frames.length);
    const rows = Math.ceil(frames.length / columns);
    const atlas = document.createElement('canvas');
    atlas.width = size * columns;
    atlas.height = size * rows;
    const atlasContext = atlas.getContext('2d');
    atlasContext.imageSmoothingEnabled = false;
    frames.forEach((frame, index) => {
        atlasContext.drawImage(frame, index % columns * size, Math.floor(index / columns) * size);
    });
    return atlas;
};

const prepareGifFrame = (frame) => {
    const prepared = document.createElement('canvas');
    prepared.width = frame.width;
    prepared.height = frame.height;
    const preparedContext = prepared.getContext('2d');
    preparedContext.fillStyle = GIF_MATTE_COLOR;
    preparedContext.fillRect(0, 0, prepared.width, prepared.height);
    preparedContext.drawImage(frame, 0, 0);
    return prepared;
};

const captureFrames = async () => {
    const settings = currentExportOptions();
    setNotice('Rendering seamless loop…');
    const result = await renderEffectFrames({
        recipe: baseRecipe,
        size: settings.size,
        frameCount: settings.frameCount
    });
    return { ...result, ...settings };
};

// A download must keep its object URL alive until the browser has consumed it;
// one second is too aggressive for large archives on slower storage.
const releaseAfterDownload = (url) => {
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

const exportAtlas = async () => {
    if (!beginExport()) return;
    try {
        const { frames, size } = await captureFrames();
        const atlas = createAtlas(frames, size);
        const blob = await canvasToBlob(atlas);
        releaseAtlasPreview();
        // Separate URLs prevent a recipe change (which releases the preview) from
        // invalidating the object URL the browser is still streaming to disk.
        const previewUrl = URL.createObjectURL(blob);
        const downloadBlobUrl = URL.createObjectURL(blob);
        atlasPreviewUrl = previewUrl;
        const image = new Image();
        image.src = previewUrl;
        image.alt = `${baseRecipe.name} sprite atlas`;
        atlasPreview.replaceChildren(image);
        atlasPreviewShell.hidden = false;
        downloadUrl(downloadBlobUrl, `atlas-${exportName()}-${timestamp()}.png`);
        releaseAfterDownload(downloadBlobUrl);
        setNotice('Sprite atlas exported', 'success');
    } catch (error) {
        console.error(error);
        setNotice(error.message, 'danger');
    } finally {
        endExport();
    }
};

const exportFramesZip = async () => {
    if (!globalThis.JSZip) {
        setNotice('ZIP exporter is still loading.', 'danger');
        return;
    }
    if (!beginExport()) return;
    try {
        const { frames } = await captureFrames();
        const zip = new JSZip();
        const blobs = await Promise.all(frames.map((frame) => canvasToBlob(frame)));
        blobs.forEach((blob, index) => {
            zip.file(`frame-${String(index).padStart(3, '0')}.png`, blob);
        });
        zip.file('recipe.json', JSON.stringify(baseRecipe, null, 2));
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        downloadUrl(url, `frames-${exportName()}-${timestamp()}.zip`);
        releaseAfterDownload(url);
        setNotice('PNG sequence exported', 'success');
    } catch (error) {
        console.error(error);
        setNotice(error.message, 'danger');
    } finally {
        endExport();
    }
};

const exportGif = async () => {
    if (!globalThis.GIF) {
        setNotice('GIF exporter is still loading.', 'danger');
        return;
    }
    if (!beginExport()) return;

    let gif;
    let watchdog;
    const finish = () => {
        window.clearTimeout(watchdog);
        endExport();
    };

    try {
        const { frames, fps } = await captureFrames();
        setNotice('Encoding transparent GIF…');
        gif = new GIF({
            workers: 2,
            quality: 10,
            repeat: 0,
            transparent: GIF_TRANSPARENT_COLOR,
            workerScript: GIF_WORKER_URL
        });
        frames.forEach((frame) => {
            gif.addFrame(prepareGifFrame(frame), {
                copy: true,
                delay: Math.round(1000 / fps)
            });
        });
        gif.on('finished', (blob) => {
            try {
                const url = URL.createObjectURL(blob);
                downloadUrl(url, `loop-${exportName()}-${timestamp()}.gif`);
                releaseAfterDownload(url);
                setNotice('Transparent GIF exported', 'success');
            } finally {
                finish();
            }
        });
        gif.on('abort', () => {
            setNotice('GIF export was cancelled.', 'danger');
            finish();
        });
        // Bounds the export lock if a worker never starts or never reports back.
        watchdog = window.setTimeout(() => {
            setNotice('GIF export timed out.', 'danger');
            gif.abort();
        }, 120_000);
        gif.render();
    } catch (error) {
        console.error(error);
        setNotice(error.message, 'danger');
        finish();
    }
};

const bindStructureControls = () => {
    controls.family.addEventListener('change', () => generateFromControls());
    controls.element.addEventListener('change', () => generateFromControls());
    controls.power.addEventListener('change', () => generateFromControls());
    controls.motif.addEventListener('change', () => rebuildRecipe({ motif: controls.motif.value }));

    controls.formation.addEventListener('change', () => {
        const key = controls.formation.value;
        const formation = FORMATIONS[baseRecipe.family][key];
        rebuildRecipe({
            formation: key,
            formationLabel: formation.label,
            motif: FORMATION_MOTIFS[baseRecipe.family][key] || baseRecipe.motif,
            geometry: formation.geometries[0],
            flow: formation.flows[0]
        });
    });

    controls.secondaryFormation.addEventListener('change', () => {
        const key = controls.secondaryFormation.value;
        if (key === 'none') {
            rebuildRecipe({ hybrid: false });
            return;
        }
        const formation = FORMATIONS[baseRecipe.family][key];
        rebuildRecipe({
            hybrid: true,
            secondaryFormation: key,
            secondaryFormationLabel: formation.label,
            secondaryGeometry: formation.geometries[0]
        });
    });

    controls.geometry.addEventListener('change', () => rebuildRecipe({ geometry: controls.geometry.value }));
    controls.secondaryGeometry.addEventListener('change', () => rebuildRecipe({
        secondaryGeometry: controls.secondaryGeometry.value
    }));
    controls.trace.addEventListener('change', () => rebuildRecipe({ traceStyle: controls.trace.value }));
    controls.secondaryTrace.addEventListener('change', () => rebuildRecipe({
        secondaryTraceStyle: controls.secondaryTrace.value
    }));
    controls.particleKit.addEventListener('change', () => {
        const particleKit = controls.particleKit.value;
        rebuildRecipe({
            particleKit,
            particleShapes: [...PARTICLE_KITS[particleKit]]
        });
    });
    particleShapePicker.addEventListener('click', (event) => {
        const button = event.target.closest('.shape-option');
        if (!button) return;
        const shape = button.dataset.shape;
        if (shape === 'mixed') {
            const particleKit = controls.particleKit.value;
            rebuildRecipe({ particleShapes: [...PARTICLE_KITS[particleKit]] });
            return;
        }
        rebuildRecipe({ particleShapes: [shape] });
    });
    controls.flow.addEventListener('change', () => rebuildRecipe({
        flow: controls.flow.value,
        direction: ['inward', 'fall', 'counter-orbit', 'counter-flow'].some((part) => controls.flow.value.includes(part)) ? -1 : 1,
        loopTurns: controls.flow.value.length % 3 === 0 ? 2 : 1
    }));
    controls.temporal.addEventListener('change', () => rebuildRecipe({ temporalStyle: controls.temporal.value }));
};

buildParticleShapePicker();
populateStaticControls();
bindStructureControls();

generateButton.addEventListener('click', () => generateFromControls());
newSeedButton.addEventListener('click', () => generateFromControls({ freshSeed: true }));
seedInput.addEventListener('change', () => generateFromControls());
seedInput.addEventListener('input', () => {
    window.clearTimeout(seedInputTimer);
    seedInputTimer = window.setTimeout(() => generateFromControls(), 260);
});
seedInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') generateFromControls();
});
replayButton.addEventListener('click', resetPlayback);
pauseButton.addEventListener('click', () => {
    if (playing) {
        frozenTime = Math.min((performance.now() - startedAt) / 1000, activeEffect.duration);
        playing = false;
        lastRenderedTime = Number.NaN;
        pauseButton.textContent = 'Play';
        pauseButton.setAttribute('aria-pressed', 'true');
    } else {
        startedAt = performance.now() - frozenTime * 1000;
        playing = true;
        pauseButton.textContent = 'Pause';
        pauseButton.setAttribute('aria-pressed', 'false');
    }
});

document.querySelector('#exportAtlasBtn').addEventListener('click', exportAtlas);
document.querySelector('#exportFramesBtn').addEventListener('click', exportFramesZip);
document.querySelector('#exportGifBtn').addEventListener('click', exportGif);
window.addEventListener('pagehide', releaseAtlasPreview, { once: true });

const initialRecipe = createEffectRecipe({ family: 'burst', element: 'arcane', power: 'standard', seed: 734211 });
applyRecipe({
    ...initialRecipe,
    formation: 'radial',
    formationLabel: FORMATIONS.burst.radial.label,
    geometry: 'ellipse',
    hybrid: true,
    secondaryFormation: 'crescent',
    secondaryFormationLabel: FORMATIONS.burst.crescent.label,
    secondaryGeometry: 'bow',
    traceStyle: 'shards',
    secondaryTraceStyle: 'spray',
    particleKit: 'crystals',
    particleShapes: [...PARTICLE_KITS.crystals],
    flow: 'outward',
    temporalStyle: 'instant',
    motif: 'mandala'
});
requestAnimationFrame(animationLoop);
