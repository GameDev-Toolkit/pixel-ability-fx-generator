// A phase-based renderer: every animated value is a function of an angle that
// completes an integer number of turns. No particle is born or dies at the seam.
const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export const LOOP_MOTIFS = {
    mandala: 'Petal mandala',
    sigil: 'Arcane sigil',
    orbit: 'Orbital rings',
    spiral: 'Spiral vortex',
    prism: 'Turning prism',
    lightning: 'Branch lightning',
    waves: 'Wave flower',
    plasma: 'Plasma halo'
};

const randomFromSeed = (seed) => {
    let state = seed >>> 0;
    return () => {
        state += 0x6d2b79f5;
        let value = state;
        value = Math.imul(value ^ value >>> 15, value | 1);
        value ^= value + Math.imul(value ^ value >>> 7, value | 61);
        return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
};

const dot = (context, x, y, size, color, alpha = 1) => {
    const width = Math.max(1, Math.round(size));
    const px = clamp(Math.round(x - width / 2), 3, 156 - width);
    const py = clamp(Math.round(y - width / 2), 3, 156 - width);
    context.globalAlpha = clamp(alpha, 0, 1);
    context.fillStyle = color;
    context.fillRect(px, py, width, width);
};

const mark = (context, x, y, size, color, alpha, shape) => {
    if (shape === 'diamond' || shape === 'shard' || shape === 'chevron') {
        dot(context, x, y - size, size, color, alpha);
        dot(context, x - size, y, size, color, alpha);
        dot(context, x + size, y, size, color, alpha);
        dot(context, x, y + size, size, color, alpha);
    } else if (shape === 'spark' || shape === 'star' || shape === 'cross') {
        dot(context, x, y, size + 1, color, alpha);
        dot(context, x - size * 2, y, 1, color, alpha * 0.8);
        dot(context, x + size * 2, y, 1, color, alpha * 0.8);
        dot(context, x, y - size * 2, 1, color, alpha * 0.8);
        dot(context, x, y + size * 2, 1, color, alpha * 0.8);
    } else {
        dot(context, x, y, size, color, alpha);
    }
};

const line = (context, ax, ay, bx, by, color, alpha = 1, size = 2, gaps = false) => {
    const length = Math.hypot(bx - ax, by - ay);
    const steps = Math.max(1, Math.ceil(length / 1.5));
    for (let index = 0; index <= steps; index += 1) {
        if (gaps && Math.floor(index / 5) % 4 === 3) continue;
        const t = index / steps;
        dot(context, ax + (bx - ax) * t, ay + (by - ay) * t, size, color, alpha);
    }
};

const curve = (context, count, pointAt, color, alpha, size, gaps = false) => {
    for (let index = 0; index < count; index += 1) {
        if (gaps && Math.floor(index / 8) % 5 === 4) continue;
        const point = pointAt(index / count);
        dot(context, point.x, point.y, size, color, alpha);
    }
};

const polar = (angle, radius) => ({ x: 80 + Math.cos(angle) * radius, y: 80 + Math.sin(angle) * radius });
const colors = (recipe) => recipe.palette;
const turns = (recipe) => (recipe.direction || 1) * (recipe.loopTurns || 1);
const points = (recipe) => clamp(Math.round(recipe.symmetry || 6), 3, 12);
const motifRadius = (recipe) => clamp((recipe.radius || 55) * (recipe.scale || 1) * 0.77, 31, 57);
const pulse = (recipe, angle) => {
    const style = recipe.temporalStyle;
    if (style === 'double-pulse') return 0.78 + 0.22 * Math.cos(angle * 2);
    if (style === 'staggered') return 0.82 + 0.18 * Math.sin(angle * 3);
    if (style === 'echo') return 0.86 + 0.14 * Math.cos(angle * 3);
    if (style === 'slow-build') return 0.66 + 0.34 * (0.5 - 0.5 * Math.cos(angle));
    return 0.84 + 0.16 * Math.cos(angle);
};

const polygon = (context, sides, radius, rotation, color, alpha, size, gaps = false) => {
    for (let side = 0; side < sides; side += 1) {
        const a = polar(rotation + side * TAU / sides, radius);
        const b = polar(rotation + (side + 1) * TAU / sides, radius);
        line(context, a.x, a.y, b.x, b.y, color, alpha, size, gaps);
    }
};

const drawMandala = (context, recipe, angle) => {
    const c = colors(recipe);
    const petals = points(recipe);
    const radius = motifRadius(recipe);
    const spin = angle * turns(recipe);
    const breath = pulse(recipe, angle);
    for (let layer = 0; layer < 2; layer += 1) {
        const base = radius * (layer ? 0.56 : 1);
        curve(context, 260, (unit) => {
            const theta = unit * TAU + spin * (layer ? -1 : 1) + recipe.tilt;
            return polar(theta, base * (0.63 + 0.37 * Math.cos(theta * petals - spin * (petals + (layer ? 1 : 0)))) * breath);
        }, c[layer ? 2 : 1], layer ? 0.72 : 0.9, layer ? 1 : 2);
    }
    for (let petal = 0; petal < petals; petal += 1) {
        const theta = petal * TAU / petals + spin + recipe.tilt;
        const tip = polar(theta, radius * 0.91 * breath);
        mark(context, tip.x, tip.y, 2, c[0], 0.96, recipe.particleShapes?.[0]);
    }
    polygon(context, petals, radius * 0.22, -spin, c[3], 0.8, 2);
    mark(context, 80, 80, 3, c[0], 1, 'spark');
};

const drawSigil = (context, recipe, angle) => {
    const c = colors(recipe);
    const sides = points(recipe);
    const radius = motifRadius(recipe);
    const spin = angle * turns(recipe);
    polygon(context, sides, radius, spin + recipe.tilt, c[1], 0.9, 2, recipe.traceStyle === 'dashes');
    polygon(context, sides, radius * 0.68, -spin + recipe.tilt, c[2], 0.72, 1);
    polygon(context, Math.max(3, Math.round(sides / 2)), radius * 0.34, spin, c[0], 0.9, 2);
    for (let index = 0; index < sides; index += 1) {
        const theta = index * TAU / sides + spin + recipe.tilt;
        const inside = polar(theta, radius * 0.73);
        const outside = polar(theta, radius * 0.89);
        line(context, inside.x, inside.y, outside.x, outside.y, c[3], 0.72, 1);
        const tip = polar(theta, radius);
        mark(context, tip.x, tip.y, 2, c[0], 0.95, 'diamond');
    }
    mark(context, 80, 80, 3, c[0], 1, 'spark');
};

const drawOrbit = (context, recipe, angle) => {
    const c = colors(recipe);
    const radius = motifRadius(recipe);
    for (let ring = 0; ring < 3; ring += 1) {
        const tilt = ring * Math.PI / 3 + recipe.tilt;
        const flat = ring === 1 ? 0.36 : 0.53;
        curve(context, 165, (unit) => {
            const theta = unit * TAU;
            const x = Math.cos(theta) * radius;
            const y = Math.sin(theta) * radius * flat;
            return {
                x: 80 + x * Math.cos(tilt) - y * Math.sin(tilt),
                y: 80 + x * Math.sin(tilt) + y * Math.cos(tilt)
            };
        }, c[ring % 2 + 1], 0.68 + ring * 0.1, ring === 1 ? 2 : 1, recipe.traceStyle === 'dashes');
        const satellite = angle * turns(recipe) * (ring % 2 ? -1 : 1) + ring * TAU / 3;
        const x = Math.cos(satellite) * radius;
        const y = Math.sin(satellite) * radius * flat;
        mark(context, 80 + x * Math.cos(tilt) - y * Math.sin(tilt), 80 + x * Math.sin(tilt) + y * Math.cos(tilt), 3, c[0], 1, 'diamond');
    }
    polygon(context, 6, 10 + 2 * Math.sin(angle), -angle, c[2], 0.9, 2);
    mark(context, 80, 80, 3, c[0], 1, 'spark');
};

const drawSpiral = (context, recipe, angle) => {
    const c = colors(recipe);
    const arms = clamp(Math.round(points(recipe) / 2), 3, 6);
    const radius = motifRadius(recipe);
    for (let arm = 0; arm < arms; arm += 1) {
        for (let trace = 0; trace < 2; trace += 1) {
            curve(context, 95, (unit) => {
                const theta = angle * turns(recipe) + arm * TAU / arms + unit * TAU * 1.55 + trace * 0.16;
                return polar(theta + recipe.tilt, 5 + unit * radius * (trace ? 0.87 : 1));
            }, c[(arm + trace + 1) % c.length], (trace ? 0.45 : 0.82) * (0.68 + 0.32 * pulse(recipe, angle)), trace ? 1 : 2);
        }
    }
    mark(context, 80, 80, 4, c[0], 1, 'diamond');
};

const rotateProject = (point, angle, tilt, radius) => {
    const cy = Math.cos(angle);
    const sy = Math.sin(angle);
    const x = point[0] * cy + point[2] * sy;
    const z = -point[0] * sy + point[2] * cy;
    const y = point[1] * Math.cos(tilt) - z * Math.sin(tilt);
    return { x: 80 + x * radius, y: 80 + y * radius };
};

const drawPrism = (context, recipe, angle) => {
    const c = colors(recipe);
    const cube = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => [x, y, z])));
    const radius = motifRadius(recipe) * 0.54;
    const projected = cube.map((point) => rotateProject(point, angle * turns(recipe) + recipe.tilt, 0.48 + 0.12 * Math.sin(angle), radius));
    for (let first = 0; first < cube.length; first += 1) {
        for (let second = first + 1; second < cube.length; second += 1) {
            const differing = cube[first].filter((coordinate, index) => coordinate !== cube[second][index]).length;
            if (differing !== 1) continue;
            line(context, projected[first].x, projected[first].y, projected[second].x, projected[second].y,
                c[(first + second) % 2 + 1], 0.9, 2, recipe.traceStyle === 'dashes');
        }
        mark(context, projected[first].x, projected[first].y, 2, c[0], 0.95, 'diamond');
    }
    const innerRadius = radius * 0.45;
    const inner = cube.map((point) => rotateProject(point, -angle * turns(recipe), 0.6, innerRadius));
    for (let first = 0; first < cube.length; first += 1) {
        for (let second = first + 1; second < cube.length; second += 1) {
            if (cube[first].filter((coordinate, index) => coordinate !== cube[second][index]).length === 1) {
                line(context, inner[first].x, inner[first].y, inner[second].x, inner[second].y, c[0], 0.48, 1);
            }
        }
    }
};

const drawLightning = (context, recipe, angle) => {
    const c = colors(recipe);
    const branches = clamp(Math.round(points(recipe) / 2) + 2, 5, 7);
    const radius = motifRadius(recipe);
    for (let branch = 0; branch < branches; branch += 1) {
        const base = branch * TAU / branches + recipe.tilt;
        let previous = polar(base, 5);
        for (let segment = 1; segment <= 13; segment += 1) {
            const distance = segment / 13 * radius;
            const sideways = Math.sin(segment * 2.7 + branch * 7 + angle * 2) * (2 + segment * 0.34);
            const next = polar(base + sideways / Math.max(8, distance), distance);
            line(context, previous.x, previous.y, next.x, next.y, c[segment % 3], 0.75 + 0.22 * pulse(recipe, angle + branch), 2);
            if (segment === 7 || segment === 10) {
                const fork = polar(base + (branch % 2 ? -1 : 1) * 0.42 + Math.sin(angle + segment) * 0.12, distance + 12);
                line(context, next.x, next.y, fork.x, fork.y, c[1], 0.78, 2);
            }
            previous = next;
        }
        mark(context, previous.x, previous.y, 2, c[0], 0.9, 'spark');
    }
    mark(context, 80, 80, 4, c[0], 1, 'spark');
};

const drawWaves = (context, recipe, angle) => {
    const c = colors(recipe);
    const petals = points(recipe);
    const radius = motifRadius(recipe);
    for (let ring = 0; ring < 3; ring += 1) {
        curve(context, 230, (unit) => {
            const theta = unit * TAU + recipe.tilt;
            const ripple = Math.sin(theta * petals + angle * turns(recipe) + ring * 0.8);
            const distance = radius * (0.52 + ring * 0.18) + ripple * (6 + ring * 2);
            return polar(theta, distance);
        }, c[(ring + 1) % c.length], 0.58 + ring * 0.12, ring === 2 ? 2 : 1);
    }
    polygon(context, petals, radius * 0.22, angle * turns(recipe), c[0], 0.75, 2);
};

const drawPlasma = (context, recipe, angle) => {
    const c = colors(recipe);
    const radius = motifRadius(recipe);
    const random = randomFromSeed(recipe.seed ^ 0xb4ea98f2);
    for (let index = 0; index < 220; index += 1) {
        const theta = random() * TAU;
        const base = Math.sqrt(random());
        const warp = Math.sin(theta * 5 + angle * turns(recipe)) * 4 + Math.cos(theta * 9 - angle * 2) * 3;
        const distance = 12 + base * (radius - 12) + warp;
        const point = polar(theta + angle * turns(recipe) * (index % 2 ? 1 : -1), distance);
        const flicker = 0.5 + 0.5 * Math.sin(angle * (index % 3 + 1) + index * 1.7);
        dot(context, point.x, point.y, index % 7 === 0 ? 3 : 2, c[index % 3], 0.34 + 0.6 * flicker);
    }
    curve(context, 180, (unit) => {
        const theta = unit * TAU;
        return polar(theta, 13 + Math.sin(theta * 6 + angle) * 2);
    }, c[3], 0.75, 2);
};

const drawMotes = (context, model, angle) => {
    const { recipe, motes } = model;
    const c = colors(recipe);
    for (const mote of motes) {
        const motion = angle * mote.speed * turns(recipe) + mote.phase;
        const radius = mote.radius + Math.sin(angle * 2 + mote.phase) * mote.wobble;
        let x = 80 + Math.cos(motion) * radius;
        let y = 80 + Math.sin(motion) * radius;
        if (recipe.motif === 'waves') y = 80 + (y - 80) * 0.65;
        if (recipe.motif === 'prism') {
            x = 80 + (x - 80) * 0.87;
            y = 80 + (y - 80) * 0.87;
        }
        const shimmer = 0.48 + 0.44 * Math.sin(angle * (mote.speed + 1) + mote.phase);
        mark(context, x, y, mote.size, c[mote.color], shimmer * pulse(recipe, angle), mote.shape);
    }
};

export const createLoopArtModel = (recipe) => {
    const random = randomFromSeed(recipe.seed ^ 0x715a47c3);
    const count = Math.round(clamp(36 * (recipe.density || 1), 30, 75));
    const motes = Array.from({ length: count }, (_, index) => ({
        phase: random() * TAU,
        radius: 19 + random() * 43,
        wobble: 1 + random() * 5,
        speed: index % 3 === 0 ? -1 : 1,
        size: random() > 0.82 ? 2 : 1,
        color: Math.floor(random() * Math.min(4, recipe.palette.length)),
        shape: recipe.particleShapes?.[index % recipe.particleShapes.length] || 'square'
    }));
    return { recipe, motes };
};

export const drawLoopArt = (context, model, time) => {
    const { recipe } = model;
    const phase = ((time / recipe.duration) % 1 + 1) % 1;
    const angle = phase * TAU;
    const motif = LOOP_MOTIFS[recipe.motif] ? recipe.motif : 'mandala';
    if (motif === 'mandala') drawMandala(context, recipe, angle);
    else if (motif === 'sigil') drawSigil(context, recipe, angle);
    else if (motif === 'orbit') drawOrbit(context, recipe, angle);
    else if (motif === 'spiral') drawSpiral(context, recipe, angle);
    else if (motif === 'prism') drawPrism(context, recipe, angle);
    else if (motif === 'lightning') drawLightning(context, recipe, angle);
    else if (motif === 'waves') drawWaves(context, recipe, angle);
    else drawPlasma(context, recipe, angle);
    drawMotes(context, model, angle);
    context.globalAlpha = 1;
};
