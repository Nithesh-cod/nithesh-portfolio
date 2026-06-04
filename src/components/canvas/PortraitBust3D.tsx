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
  // Fresnel — bright at grazing angles.
  vec3 viewDir = normalize(uCamPos - vWorldPos);
  float fres = pow(1.0 - clamp(dot(normalize(vNormalW), viewDir), 0.0, 1.0), 2.5);

  // Scrolling scanlines (vertical).
  float scan = sin(vWorldPos.y * 38.0 - uTime * 3.0) * 0.5 + 0.5;
  scan = pow(scan, 4.0);

  // Base hologram tint — saturated mint-green.
  vec3 base = vec3(0.00, 1.00, 0.55);
  vec3 col = base + scan * vec3(0.20, 0.30, 0.40);
  // Edge glow.
  col += fres * vec3(0.30, 1.00, 0.70) * 1.4;

  // Alpha — semi-transparent, brighter at edges + on scanline crests.
  float alpha = 0.55 + fres * 0.45 + scan * 0.15;
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
  position = [0, 1.4, 0],
  targetHeight = 1.6,
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

  // Slow Y rotation + subtle bob.
  useFrame((state, dt) => {
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uCamPos.value.copy(state.camera.position);
    if (groupRef.current) {
      groupRef.current.rotation.y += dt * 0.15;
      groupRef.current.position.y =
        position[1] + Math.sin(state.clock.elapsedTime * 0.6) * 0.05;
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
