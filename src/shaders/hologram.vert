// Hologram panel — vertex.
// Passes uv, world-space normal, and view direction to the fragment for fresnel.
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);

  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vViewDir = normalize(-mvPos.xyz);

  gl_Position = projectionMatrix * mvPos;
}
