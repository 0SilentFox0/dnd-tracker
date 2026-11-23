const TEXTURE_WIDTH = 224;

const TEXTURE_HEIGHT = 144;

let texture: HTMLCanvasElement | null = null;

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function ease(value: number) {
    return value * value * (3 - 2 * value);
}

function smoothStep(from: number, to: number, value: number) {
    return ease(Math.min(1, Math.max(0, (value - from) / (to - from))));
}

function grain(x: number, y: number, seed: number) {
    const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;

    return value - Math.floor(value);
}

function noise(x: number, y: number, seed: number) {
    const ix = Math.floor(x);

    const iy = Math.floor(y);

    const u = ease(x - ix);

    const v = ease(y - iy);

    return mix(
        mix(grain(ix, iy, seed), grain(ix + 1, iy, seed), u),
        mix(grain(ix, iy + 1, seed), grain(ix + 1, iy + 1, seed), u),
        v
    );
}

export function worldCloudTexture() {
    if (texture) return texture;

    const canvas = document.createElement('canvas');

    canvas.width = TEXTURE_WIDTH;
    canvas.height = TEXTURE_HEIGHT;

    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    const image = ctx.createImageData(canvas.width, canvas.height);

    for (let y = 0; y < canvas.height; y++) {
        const v = y / canvas.height;

        for (let x = 0; x < canvas.width; x++) {
            const u = x / canvas.width;

            const warp = (noise(u * 2.2, v * 2.2, 5) - 0.5) * 0.3;

            const px = u + warp;

            const py = v - warp * 0.72;

            const cloud =
                noise(px * 3.5, py * 3.5, 19) * 0.46 +
                noise(px * 6.8, py * 6.8, 23) * 0.29 +
                noise(px * 13, py * 13, 31) * 0.17 +
                noise(px * 24, py * 24, 47) * 0.08;

            const shade = smoothStep(0.25, 0.71, cloud);

            const moon = 1 - smoothStep(0.05, 1, u * 0.68 + v * 0.58);

            const depth = smoothStep(0.36, 0.96, v);

            const i = (y * canvas.width + x) * 4;

            image.data[i] = 68 + shade * 116 + moon * 24 - depth * 17;
            image.data[i + 1] = 75 + shade * 118 + moon * 25 - depth * 14;
            image.data[i + 2] = 99 + shade * 123 + moon * 34 - depth * 11;
            image.data[i + 3] = 255;
        }
    }

    ctx.putImageData(image, 0, 0);
    texture = canvas;

    return texture;
}

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
    float moon = 1. - smoothstep(.12, 1., uv.x * .73 + uv.y * .56);
    vec3 shadow = vec3(.17, .20, .28) + moon * vec3(.09, .10, .15);
    vec3 light = vec3(.66, .70, .81) + moon * vec3(.08, .07, .08);
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

export function createWorldCloudMotion() {
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

    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    return {
        canvas,
        render(seconds: number) {
            if (gl.isContextLost()) return false;

            gl.uniform1f(time, seconds);
            gl.drawArrays(gl.TRIANGLES, 0, 3);

            return true;
        },
        dispose() {
            gl.deleteBuffer(buffer);
            gl.deleteProgram(program);
        },
    };
}
