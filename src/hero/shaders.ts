export const VERTEX = /* glsl */ `
attribute vec3 aP0;
attribute vec3 aP1;
attribute vec3 aP2;
attribute vec3 aP3;
attribute vec3 aColor;
attribute float aRand;
attribute float aSize;

uniform float uW0, uW1, uW2, uW3;
uniform float uS0, uS1, uS3;
uniform vec2 uOff0, uOff1, uOff2, uOff3;
uniform vec2 uRot;
uniform float uTime, uDpr, uSize, uReduced;
uniform vec3 uMouse, uAccent, uGold;

varying vec3 vCol;
varying float vAlpha;

void main() {
  // Portrait: scale, parallax about its own centre, then offset to the image's position.
  vec3 p0 = aP0 * uS0;
  float cy = cos(uRot.x), sy = sin(uRot.x);
  float cx = cos(uRot.y), sx = sin(uRot.y);
  p0 = vec3(p0.x * cy + p0.z * sy, p0.y, -p0.x * sy + p0.z * cy);
  p0 = vec3(p0.x, p0.y * cx - p0.z * sx, p0.y * sx + p0.z * cx);
  p0.xy += uOff0;

  vec3 p1 = aP1 * uS1; p1.xy += uOff1;
  vec3 p2 = aP2;       p2.xy += uOff2;
  vec3 p3 = aP3 * uS3; p3.xy += uOff3;

  vec3 p = p0 * uW0 + p1 * uW1 + p2 * uW2 + p3 * uW3;

  float disp = 1.0 - uW0;
  if (uReduced < 0.5) {
    float ph = aRand * 6.2831;
    p.x += sin(uTime * 0.42 + ph) * 0.030 * (0.12 + disp);
    p.y += cos(uTime * 0.37 + ph * 1.7) * 0.030 * (0.12 + disp);
    p.z += sin(uTime * 0.30 + ph * 2.3) * 0.040 * (0.12 + disp);
  }

  // The cursor never deforms the portrait. Repulsion fades in exactly as the face dissolves.
  vec2 d = p.xy - uMouse.xy;
  float l = length(d);
  float force = 1.0 - uW0;
  if (l < 1.05 && force > 0.001) { p.xy += normalize(d) * (1.05 - l) * 0.5 * force; }

  // Over the portrait the cursor carries a soft light instead.
  float glow = (1.0 - smoothstep(0.0, 1.5, l)) * uW0;

  // Elliptical fade at the shoulders, matching the CSS mask on the static image.
  float ed = length((aP0.xy - vec2(0.0, 0.14)) / vec2(0.51, 0.74));
  vAlpha = 1.0 - smoothstep(0.46, 0.96, ed) * uW0;

  vec3 c = mix(aColor, uAccent, clamp(uW1 * 0.9 + uW2 * 0.55 + uW3 * 0.9, 0.0, 1.0));
  vCol = mix(c, uGold, uW2 * 0.35) * (1.0 + glow * 0.75);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = aSize * uSize * uDpr * (8.2 / -mv.z) * (1.0 + glow * 0.35);
  gl_Position = projectionMatrix * mv;
}
`;

export const FRAGMENT = /* glsl */ `
varying vec3 vCol;
varying float vAlpha;

void main() {
  vec2 u = gl_PointCoord - 0.5;
  float r = dot(u, u);
  if (r > 0.25) discard;
  // Tight falloff. A soft blobby edge destroys facial detail.
  gl_FragColor = vec4(vCol, smoothstep(0.25, 0.13, r) * vAlpha);
}
`;
