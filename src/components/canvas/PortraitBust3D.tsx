'use client';

import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import {
  Box3,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
  Vector3,
} from 'three';

/* Avatar centrepiece. The model is meshopt-compressed with WebP textures
 * (built from the original 68 MB scan with gltf-transform; ~3 MB). The
 * parent wraps this in its own <Suspense> so the room renders while the
 * model downloads, then the avatar fades in. */

export const AVATAR_URL = '/models/avatar-v2.glb';

const FADE_SECONDS = 0.8;

type Props = {
  position?: [number, number, number];
  targetHeight?: number;
};

export function PortraitBust3D({
  position = [0, 0, 0],
  targetHeight = 3.3,
}: Props) {
  const { scene } = useGLTF(AVATAR_URL);
  const groupRef = useRef<Group | null>(null);
  const materials = useRef<MeshStandardMaterial[]>([]);
  const fade = useRef(1);

  useLayoutEffect(() => {
    const box = new Box3().setFromObject(scene);
    const size = new Vector3();
    const centre = new Vector3();
    box.getSize(size);
    box.getCenter(centre);

    const tallest = size.y;
    if (!Number.isFinite(tallest) || tallest < 0.001) return;

    const scale = targetHeight / tallest;
    scene.scale.setScalar(scale);
    scene.position.x = -centre.x * scale;
    scene.position.z = -centre.z * scale;
    scene.position.y = -box.min.y * scale; // pedestal bottom flush to y=0

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    fade.current = reduceMotion ? 1 : 0;
    materials.current = [];

    // Keep the scan's PBR textures but soften reflectivity so the suit and
    // skin don't blow out under the scene's lighting.
    scene.traverse((obj) => {
      const m = obj as Mesh;
      if (!m.isMesh) return;
      const mats = (Array.isArray(m.material) ? m.material : [m.material]) as MeshStandardMaterial[];
      for (const mm of mats) {
        if (!mm) continue;
        mm.envMapIntensity = 0.6;
        mm.roughness = Math.max(mm.roughness ?? 0, 0.40);
        mm.transparent = fade.current < 1;
        mm.opacity = fade.current;
        mm.needsUpdate = true;
        materials.current.push(mm);
      }
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
    });
  }, [scene, targetHeight]);

  useFrame((state, dt) => {
    if (fade.current < 1) {
      fade.current = Math.min(1, fade.current + dt / FADE_SECONDS);
      for (const mm of materials.current) {
        mm.opacity = fade.current;
        if (fade.current >= 1) {
          // Back to opaque so the avatar sorts and shades like before.
          mm.transparent = false;
          mm.needsUpdate = true;
        }
      }
    }

    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.position.y = position[1] + Math.sin(t * 0.5) * 0.020;
    groupRef.current.rotation.y = Math.sin(t * 0.25) * 0.05;
  });

  return (
    <group ref={groupRef} position={position}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(AVATAR_URL);
