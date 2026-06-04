'use client';

import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box3,
  DoubleSide,
  type Group,
  type Mesh,
  NormalBlending,
  ShaderMaterial,
  Vector3,
  type IUniform,
} from 'three';

/* V12.0 — 3D portrait bust loaded from /portait.glb. Hardened:
 *   • Holo shader uses NormalBlending (was Additive) — earlier additive
 *     blend made the bust invisible against the bright capsule plasma.
 *   • Alpha floor raised so the interior reads as solid hologram.
 *   • Inner pointLight added (Scene.tsx) so even when the camera is
 *     facing the back, the silhouette still picks up emissive bounce.
 *   • If the glb load returns zero meshes (corrupted file / 404), a
 *     wireframe-humanoid PLACEHOLDER renders so the capsule is never
 *     empty.
 */

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
  vec3 viewDir = normalize(uCamPos - vWorldPos);
  float fres = pow(1.0 - clamp(dot(normalize(vNormalW), viewDir), 0.0, 1.0), 1.8);

  // Fine vertical scan lines.
  float scan = sin(vWorldPos.y * 64.0 + uTime * 2.4) * 0.5 + 0.5;
  scan = pow(scan, 5.0);

  // Vertical data sweep band.
  float sweep = abs(fract(vWorldPos.y * 0.30 - uTime * 0.15) - 0.5);
  sweep = 1.0 - smoothstep(0.0, 0.05, sweep);

  // V11.2 palette: #2EFFB0 cyan-shifted.
  vec3 baseColor = vec3(0.18, 1.00, 0.70);
  vec3 edgeColor = vec3(0.50, 1.00, 0.88);
  vec3 col = mix(baseColor, edgeColor, fres);
  col += scan  * vec3(0.20, 0.40, 0.30);
  col += sweep * vec3(0.25, 0.45, 0.35);
  col += fres * vec3(0.10, 0.05, 0.00);

  // V12.0 — alpha floor raised so the silhouette is visibly solid.
  float alpha = 0.70 + fres * 0.30 + scan * 0.08;
  alpha = clamp(alpha, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}
`;

type Props = {
  position?: [number, number, number];
  targetHeight?: number;
};

export function PortraitBust3D({
  position = [0, 1.0, 0],
  targetHeight = 2.4,
}: Props) {
  const gltf = useGLTF('/portait.glb');
  const scene = gltf?.scene;
  const groupRef = useRef<Group | null>(null);
  const innerRef = useRef<Group | null>(null);
  const [meshCount, setMeshCount] = useState(0);

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
        // V12.0 — NormalBlending. Additive was washing the bust into the
        // capsule's bright plasma cylinder, making it invisible.
        blending: NormalBlending,
        side: DoubleSide,
      }),
    [uniforms],
  );

  useEffect(() => {
    if (!scene) return;
    let count = 0;
    scene.traverse((obj) => {
      const m = obj as Mesh;
      if (m.isMesh) {
        m.material = holoMat;
        m.castShadow = false;
        m.receiveShadow = false;
        m.frustumCulled = false;
        count++;
      }
    });
    setMeshCount(count);

    if (innerRef.current) {
      const box = new Box3().setFromObject(scene);
      const size = new Vector3();
      const centre = new Vector3();
      box.getSize(size);
      box.getCenter(centre);
      const tallest = Math.max(size.y, 0.0001);
      // Guard against degenerate / zero-size models.
      if (!Number.isFinite(tallest) || tallest < 0.001 || count === 0) {
        // eslint-disable-next-line no-console
        console.warn('[PortraitBust3D] glb has no meshes or zero size — using fallback');
        return;
      }
      const scale = targetHeight / tallest;
      innerRef.current.scale.setScalar(scale);
      innerRef.current.position.set(
        -centre.x * scale,
        -box.min.y * scale,
        -centre.z * scale,
      );
    }
  }, [scene, holoMat, targetHeight]);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    uniforms.uTime.value = t;
    uniforms.uCamPos.value.copy(state.camera.position);
    if (groupRef.current) {
      groupRef.current.rotation.y += dt * 0.20;
      groupRef.current.rotation.x = Math.sin(t * (Math.PI * 2 / 8)) * 0.04;
      groupRef.current.position.y = position[1] + Math.sin(t * 0.6) * 0.04;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <group ref={innerRef}>
        {scene && meshCount > 0 ? (
          <primitive object={scene} />
        ) : (
          <FallbackBust holoMat={holoMat} targetHeight={targetHeight} />
        )}
      </group>
    </group>
  );
}

/* V12.0 — wireframe-humanoid placeholder used when /portait.glb fails to
 * load or has no meshes. Geometric bust: sphere head + capsule chest +
 * shoulder spheres. Same holo material so the colour grade matches. */
function FallbackBust({
  holoMat,
  targetHeight,
}: {
  holoMat: ShaderMaterial;
  targetHeight: number;
}) {
  // Geometry is sized for a 2-unit-tall bust; we scale to caller's
  // targetHeight.
  const s = targetHeight / 2;
  return (
    <group scale={s}>
      {/* Head. */}
      <mesh material={holoMat} position={[0, 1.55, 0]}>
        <sphereGeometry args={[0.32, 24, 18]} />
      </mesh>
      {/* Neck. */}
      <mesh material={holoMat} position={[0, 1.18, 0]}>
        <cylinderGeometry args={[0.10, 0.13, 0.20, 16]} />
      </mesh>
      {/* Shoulders + chest (capsule-shaped torso). */}
      <mesh material={holoMat} position={[0, 0.78, 0]}>
        <sphereGeometry args={[0.55, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <mesh material={holoMat} position={[0, 0.30, 0]}>
        <cylinderGeometry args={[0.55, 0.45, 0.40, 24, 1, true]} />
      </mesh>
      {/* Wireframe overlay sphere for that "hologram" feel. */}
      <mesh position={[0, 1.05, 0]}>
        <sphereGeometry args={[0.90, 14, 10]} />
        <meshBasicMaterial
          color="#2EFFB0"
          wireframe
          transparent
          opacity={0.18}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

useGLTF.preload('/portait.glb');
