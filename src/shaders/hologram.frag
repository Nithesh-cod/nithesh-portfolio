// V7.0 — Clean portrait shader. No overlays on subject pixels.
// Survives: HSV blue mask, ACES tonemap, warm push, luma cap, frame fresnel.
// REMOVED: scanlines, RGB ghost, jitter, boot reveal sweep, panel haze.
precision highp float;

uniform sampler2D uMap;
uniform vec2 uTexelSize;
uniform float uTime;
uniform float uBoot;          // legacy uniform, ignored
uniform vec3 uGlowColor;      // champagne-gold — frame fresnel only
uniform vec3 uBgTint;         // legacy uniform, ignored

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / (q.x + 1e-10), q.x);
}

float blueScore(vec3 rgb) {
  vec3 hsv = rgb2hsv(rgb);
  float hueLow  = smoothstep(0.48, 0.50, hsv.x);
  float hueHigh = 1.0 - smoothstep(0.611, 0.63, hsv.x);
  float satIn   = smoothstep(0.35, 0.45, hsv.y);
  return hueLow * hueHigh * satIn;
}

float subjectMaskDilated(vec2 uv) {
  vec2 t = uTexelSize * 1.5;
  float s = 1.0 - blueScore(texture2D(uMap, uv).rgb);
  s = max(s, 1.0 - blueScore(texture2D(uMap, uv + vec2( t.x, 0.0)).rgb));
  s = max(s, 1.0 - blueScore(texture2D(uMap, uv + vec2(-t.x, 0.0)).rgb));
  s = max(s, 1.0 - blueScore(texture2D(uMap, uv + vec2(0.0,  t.y)).rgb));
  s = max(s, 1.0 - blueScore(texture2D(uMap, uv + vec2(0.0, -t.y)).rgb));
  return s;
}

vec3 aces(vec3 x) {
  float a = 2.51;
  float b = 0.03;
  float c = 2.43;
  float d = 0.59;
  float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
  vec2 uv = vUv;
  vec3 src = texture2D(uMap, uv).rgb;
  float subjectMask = subjectMaskDilated(uv);

  // Subject path — ACES + warm push + luma cap. No overlays.
  vec3 subject = aces(src);

  // Background path — transparent. Bezel beneath shows through.
  vec3 col = subject * subjectMask;

  if (subjectMask > 0.5) {
    col *= vec3(1.04, 1.00, 0.96);
    float outLuma = dot(col, vec3(0.2126, 0.7152, 0.0722));
    if (outLuma > 0.82) {
      col *= 0.82 / outLuma;
    }
  }

  // Fresnel + outer-frame brighten — gated to non-subject pixels.
  float frameMask = 1.0 - subjectMask;
  float fres = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 2.5);
  col += uGlowColor * min(fres * 1.4, 0.4) * frameMask;
  float border = step(0.96, max(vUv.x, max(1.0 - vUv.x, max(vUv.y, 1.0 - vUv.y))));
  col += uGlowColor * border * 0.6;

  float alpha = max(subjectMask, border * 0.85);
  gl_FragColor = vec4(col, alpha);
}
