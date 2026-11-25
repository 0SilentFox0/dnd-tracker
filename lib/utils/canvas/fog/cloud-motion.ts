import { DEFAULT_FOG_PALETTE, type FogPalette } from './cloud-texture';

const VERTEX = `#version 300 es
in vec2 position;
out vec2 uv;
void main() {
    uv = vec2(position.x, -position.y) * .5 + .5;
    gl_Position = vec4(position, 0., 1.);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
in vec2 uv;
uniform float time;
uniform vec3 uShadow;
uniform vec3 uLight;
uniform float uMoon;
out vec4 color;

float hash(vec2 p) {
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 34.34);
    return fract(p.x * p.y);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 s = f * f * (3. - 2. * f);
    return mix(mix(hash(i), hash(i + vec2(1., 0.)), s.x),
               mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), s.x), s.y);
}

float clouds(vec2 p) {
    float result = 0.;
    float weight = .52;
    for (int i = 0; i < 5; i++) {
        result += weight * noise(p);
        p = mat2(1.78, 1.04, -1.04, 1.78) * p + vec2(5.3, 11.7);
        weight *= .49;
    }
    return result;
}

void main() {
    vec2 p = uv * vec2(1.48, 1.);
    vec2 warp = vec2(
        clouds(p * 2.36 + vec2(time * .105, 3.1)),
        clouds(p * 2.65 + vec2(-4., -time * .09))
    );
    float banks = clouds(p * 4.1 + warp * .82 + vec2(-time * .29, time * .093));
    float wisps = clouds(p * 7.9 - warp * 1.05 + vec2(time * .17, -time * .21));
    float shade = smoothstep(.25, .75, banks * .78 + wisps * .22);
    float reflection = smoothstep(.49, .85, wisps) * smoothstep(.35, .7, banks);
    float moon = (1. - smoothstep(.12, 1., uv.x * .73 + uv.y * .56)) * uMoon;
    vec3 shadow = uShadow + moon * vec3(.09, .10, .15);
    vec3 light = uLight + moon * vec3(.08, .07, .08);
    color = vec4(mix(shadow, light, shade) + reflection * .1, 1.);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);

    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;

    gl.deleteShader(shader);

    return null;
}

interface SharedContext {
    canvas: HTMLCanvasElement;
    render: (seconds: number, palette: FogPalette) => boolean;
    destroy: () => void;
    refs: number;
}

let shared: SharedContext | null = null;

function createShared(): SharedContext | null {
    try {
        return buildShared();
    } catch {
        return null;
    }
}

function buildShared(): SharedContext | null {
    const canvas = document.createElement('canvas');

    canvas.width = 256;
    canvas.height = 160;

    const gl = canvas.getContext('webgl2', {
        alpha: false,
        antialias: false,
        preserveDrawingBuffer: true,
    });

    if (!gl) return null;

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);

    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);

    const program = vertex && fragment ? gl.createProgram() : null;

    if (program && vertex && fragment) {
        gl.attachShader(program, vertex);
        gl.attachShader(program, fragment);
        gl.linkProgram(program);
    }

    gl.deleteShader(vertex);
    gl.deleteShader(fragment);

    const buffer =
        program && gl.getProgramParameter(program, gl.LINK_STATUS)
            ? gl.createBuffer()
            : null;

    if (!program || !buffer) {
        gl.deleteProgram(program);

        return null;
    }

    gl.useProgram(program);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        gl.STATIC_DRAW
    );

    const position = gl.getAttribLocation(program, 'position');

    const time = gl.getUniformLocation(program, 'time');

    const shadow = gl.getUniformLocation(program, 'uShadow');

    const light = gl.getUniformLocation(program, 'uLight');

    const moon = gl.getUniformLocation(program, 'uMoon');

    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    return {
        canvas,
        refs: 0,
        render(seconds, palette) {
            if (gl.isContextLost()) return false;

            gl.uniform1f(time, seconds);
            gl.uniform3f(
                shadow,
                palette.shadow[0] / 255,
                palette.shadow[1] / 255,
                palette.shadow[2] / 255
            );
            gl.uniform3f(
                light,
                palette.light[0] / 255,
                palette.light[1] / 255,
                palette.light[2] / 255
            );
            gl.uniform1f(moon, palette.moon);
            gl.drawArrays(gl.TRIANGLES, 0, 3);

            return true;
        },
        destroy() {
            gl.deleteBuffer(buffer);
            gl.deleteProgram(program);
            gl.getExtension('WEBGL_lose_context')?.loseContext();
        },
    };
}

export interface CloudMotion {
    canvas: HTMLCanvasElement;
    render: (seconds: number, palette?: FogPalette) => boolean;
    release: () => void;
}

/** Refcounted: the one WebGL context lives until the last user releases it; consume `canvas` right after `render`. */
export function acquireCloudMotion(): CloudMotion | null {
    shared ??= createShared();

    const context = shared;

    if (!context) return null;

    context.refs += 1;

    let released = false;

    return {
        canvas: context.canvas,
        render: (seconds, palette = DEFAULT_FOG_PALETTE) =>
            !released && context.render(seconds, palette),
        release() {
            if (released) return;

            released = true;
            context.refs -= 1;

            if (context.refs > 0) return;

            context.destroy();

            if (shared === context) shared = null;
        },
    };
}
