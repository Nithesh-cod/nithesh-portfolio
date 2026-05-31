// Hologram panel — fragment.
// Pipeline: HSV-based blue mask (dilated) -> subject preserved AS IS (no green
// multiply) with a tiny warm push + ACES tonemap -> emerald background haze
// where the mask says "not subject" -> scanlines + RGB ghosting + fresnel rim
// -> jitter -> boot-up reveal sweep.
//
// uBoot drives a horizontal scanline sweep from bottom to top.
//
// Crucial design rule: emerald only touches the BACKGROUND and FRAME of the
// panel. Subject pixels (skin, suit, pocket square) keep their real colour
// so the portrait reads as a person, not a glowing ghost.
precision highp float;

uniform sampler2D uMap;
uniform vec2 uTexelSize;
uniform float uTime;
uniform float uBoot;
uniform vec3 uGlowColor;       // emerald-hot — frame, scanlines, fresnel
uniform vec3 uBgTint;          // emerald-mid — subtle haze behind subject

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

float hash(float n) { return fract(sin(n) * 43758.5453123); }

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

// Cheap ACES Filmic tonemap (Krzysztof Narkowicz approximation).
vec3 aces(vec3 x) {
  float a = 2.51;
  float b = 0.03;
  float c = 2.43;
  float d = 0.59;
  float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

void main() {
  // Vertical jitter — at 0.00063 (M3.6's 0.0009 × 0.7) so even residual scanline
  // displacement doesn't read on the brighter parts of the face (forehead, nose).
  float jitter = sin(uTime * 14.0 + vUv.y * 90.0) * 0.00063;
  vec2 uv = vec2(vUv.x + jitter, vUv.y);

  vec3 src = texture2D(uMap, uv).rgb;
  float subjectMask = subjectMaskDilated(uv);

  // Subject path: real colours, ACES tonemap. The warm push moves to the
  // bottom of the shader (right before the luma cap) so it acts on the
  // FULLY ACCUMULATED subject colour, not just the raw texture sample.
  vec3 subject = aces(src);

  // Background path: barely-there emerald haze.
  vec3 background = uBgTint * 0.12;

  vec3 col = mix(background, subject, subjectMask);

  // Highlight-protection mask. Threshold lowered to 0.75 (from 0.85) so the
  // protect band catches forehead specular highlights and pupil catchlights,
  // not only the brightest 1% of pixels.
  float subjLuma = dot(subject, vec3(0.2126, 0.7152, 0.0722));
  float bright = smoothstep(0.75, 0.95, subjLuma);
  float protect = 1.0 - bright;

  // Scanline overlay — softer modulation [0.85, 1.05] (was [0.72, 1.00]),
  // scaled by protect so bright subject pixels stay alone.
  float scan = mix(0.85, 1.05, 0.5 + 0.5 * sin(uv.y * 220.0 + uTime * 5.0));
  col *= mix(1.0, scan, protect);

  // RGB ghosting — also gated by protect; only adds to mid-tones.
  float ghost = sin(uTime * 1.5 + uv.y * 6.0) * 0.0015;
  col.r += texture2D(uMap, uv + vec2(ghost, 0.0)).r * 0.06 * subjectMask * protect;
  col.b += texture2D(uMap, uv - vec2(ghost, 0.0)).b * 0.04 * subjectMask * protect;

  // Fresnel edge glow — emerald-hot, additive.
  float fres = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 2.5);
  col += uGlowColor * fres * 1.4;

  // Boot-up reveal sweep: a moving horizontal threshold.
  float revealLine = 1.0 - vUv.y;
  float reveal = smoothstep(uBoot - 0.05, uBoot + 0.02, 1.0 - revealLine);
  float sweepLine = exp(-pow((revealLine - (1.0 - uBoot)) * 60.0, 2.0));
  col += uGlowColor * sweepLine * 1.5;

  // Outer panel frame brighten.
  float border = step(0.96, max(vUv.x, max(1.0 - vUv.x, max(vUv.y, 1.0 - vUv.y))));
  col += uGlowColor * border * 0.6;

  // Alpha = haze base + subject mask * reveal sweep.
  // Low haze (0.06) means the panel barely tints the bezel where there's no subject.
  float panelHaze = 0.06;
  float alpha = max(panelHaze, subjectMask) * clamp(reveal, panelHaze, 1.0);

  // Soft random scanline dropouts for organic feel.
  float drop = step(0.997, hash(floor(uv.y * 200.0) + floor(uTime * 30.0)));
  col *= 1.0 - drop * 0.3;

  // ── Warm push on SUBJECT pixels (just before the cap) ───────────
  // Applied to the accumulated col so skin reads as skin against the
  // emerald frame / scanlines. (1.04, 1.00, 0.96) is a gentle K-shift
  // toward 3200K — visible but not orange.
  if (subjectMask > 0.5) {
    col *= vec3(1.04, 1.00, 0.96);
  }

  // ── Hard luma ceiling on SUBJECT pixels ──────────────────────────
  // Uniform scale `col *= 0.82 / outLuma` preserves the colour ratio —
  // it does NOT clamp per-channel, so skin tone never shifts hue when
  // a pixel clips. 0.82 leaves headroom under Bloom's 0.95 threshold
  // and stays comfortably below the 0.90 display-luma acceptance after
  // the downstream ACES + LUT S-curve.
  //
  // Gated by subjectMask so the FRAME, FRESNEL EDGE GLOW, and SCANLINE
  // SWEEP can still cross threshold and bloom — they're supposed to.
  if (subjectMask > 0.5) {
    float outLuma = dot(col, vec3(0.2126, 0.7152, 0.0722));
    if (outLuma > 0.82) {
      col *= 0.82 / outLuma;
    }
  }

  gl_FragColor = vec4(col, alpha);
}
