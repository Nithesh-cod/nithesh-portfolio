'use client';

import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  Box3,
  DoubleSide,
  Group,
  Mesh,
  ShaderMaterial,
  Vector3,
  type IUniform,
} from 'three';

/* V11.0 — 3D portrait bust loaded from /portait.glb (user-provided
 * spelling preserved). Every mesh in the glb is re-skinned with a
 * holographic shader: fresnel edge glow + scrolling scanline + soft
 * green emissive — matches the reference image's wireframe-glow bust
 * sitting inside the capsule. */

const HOLO_VERT = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vWorldPos;
void main() {
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const HOLO_FRAG = /* glsl */ `
precision highp float;
varying vec3 vNormalW;
varying vec3 vWorldPos;
uniform float uTime;
uniform vec3 uCamPos;

void main() {
  // Fresnel — sharper than V11.0 so the silhouette pops.
  vec3 viewDir = normalize(uCamPos - vWorldPos);
  float fres = pow(1.0 - clamp(dot(normalize(vNormalW), viewDir), 0.0, 1.0), 2.0);

  // Fine, dense vertical scan lines (~80 cycles per world unit).
  float scan = sin(vWorldPos.y * 80.0 + uTime * 2.0) * 0.5 + 0.5;
  scan = pow(scan, 6.0); // sharp lines, not a smooth gradient

  // Slow vertical data-flow sweep band.
  float sweep = abs(fract(vWorldPos.y * 0.30 - uTime * 0.15) - 0.5);
  sweep = 1.0 - smoothstep(0.0, 0.05, sweep);

  // V11.1 palette: primary #00FF9D, edge tint slightly cyan.
  vec3 baseColor = vec3(0.00, 1.00, 0.62);
  vec3 edgeColor = vec3(0.60, 1.00, 0.85);
  vec3 col = mix(baseColor, edgeColor, fres);
  col += scan  * vec3(0.20, 0.40, 0.30);
  col += sweep * vec3(0.30, 0.50, 0.40);

  // Semi-transparent interior; opaque at silhouette edge.
  float alpha = 0.45 + fres * 0.55 + scan * 0.10;
  alpha = clamp(alpha, 0.0, 1.0);

  gl_FragColor = vec4(col, alpha);
}
`;

type Props = {
  /** World position of the bust's group. Defaults to capsule centre. */
  position?: [number, number, number];
  /** Target world-space height for the bust (uniform scale fit). */
  targetHeight?: number;
};

export function PortraitBust3D({
  position = [0, 1.0, 0],
  targetHeight = 2.4,
}: Props) {
  const { scene } = useGLTF('/portait.glb');
  const groupRef = useRef<Group | null>(null);
  const innerRef = useRef<Group | null>(null);

  // One shared holographic shader instance for every mesh.
  const uniforms = useMemo<{
    uTime: IUniform<number>;
    uCamPos: IUniform<Vector3>;
  }>(
    () => ({
      uTime: { value: 0 },
      uCamPos: { value: new Vector3() },
    }),
    [],
  );
  const holoMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: HOLO_VERT,
        fragmentShader: HOLO_FRAG,
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
      }),
    [uniforms],
  );

  // Apply the holo shader to every mesh in the glb + compute autoscale.
  useEffect(() => {
    if (!scene) return;
    scene.traverse((obj) => {
      const m = obj as Mesh;
      if ((m as Mesh).isMesh) {
        m.material = holoMat;
        m.castShadow = false;
        m.receiveShadow = false;
        m.frustumCulled = false;
      }
    });

    // Fit-scale + recentre so the bust matches `targetHeight`.
    if (innerRef.current) {
      const box = new Box3().setFromObject(scene);
      const size = new Vector3();
      const centre = new Vector3();
      box.getSize(size);
      box.getCenter(centre);
      const tallest = Math.max(size.y, 0.0001);
      const scale = targetHeight / tallest;
      innerRef.current.scale.setScalar(scale);
      // Recentre: shift inner group so bust sits with feet at y=0, x/z=0.
      innerRef.current.position.set(
        -centre.x * scale,
        -box.min.y * scale,
        -centre.z * scale,
      );
    }
  }, [scene, holoMat, targetHeight]);

  // Slow Y rotation + subtle X-tilt sway + Y bob.
  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    uniforms.uTime.value = t;
    uniforms.uCamPos.value.copy(state.camera.position);
    if (groupRef.current) {
      groupRef.current.rotation.y += dt * 0.20;
      // Slight back-and-forth tilt around X (±0.05 rad, 8s period).
      groupRef.current.rotation.x = Math.sin(t * (Math.PI * 2 / 8)) * 0.05;
      // Subtle vertical bob.
      groupRef.current.position.y = position[1] + Math.sin(t * 0.6) * 0.04;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <group ref={innerRef}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

// Pre-fetch on initial bundle load.
useGLTF.preload('/portait.glb');
