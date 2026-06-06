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

/* V12.8 — render /portait.glb AS-IS, no fallback, no gate.
 *
 * Earlier rounds tried to gate rendering on a `loaded` boolean which
 * left a FallbackBust wireframe humanoid visible during the first
 * render pass. That wireframe was what users were seeing instead of
 * the actual avatar. We now:
 *
 *   • Render <primitive object={gltf.scene} /> unconditionally.
 *   • Apply scale + recentre via useLayoutEffect so the transform
 *     lands before paint.
 *   • Log size + bounds for diagnosis. */

type Props = {
  position?: [number, number, number];
  targetHeight?: number;
};

export function PortraitBust3D({
  position = [0, 0, 0],
  targetHeight = 3.3,
}: Props) {
  const gltf = useGLTF('/portait.glb');
  const scene = gltf.scene;
  const groupRef = useRef<Group | null>(null);

  useLayoutEffect(() => {
    if (!scene) {
      // eslint-disable-next-line no-console
      console.error('[V12.8] portait.glb NOT loaded');
      return;
    }

    // eslint-disable-next-line no-console
    console.log('[V12.8] portait.glb loaded successfully');

    const box = new Box3().setFromObject(scene);
    const size = new Vector3();
    const centre = new Vector3();
    box.getSize(size);
    box.getCenter(centre);
    // eslint-disable-next-line no-console
    console.log('[V12.8] GLB raw size:', size.toArray());
    // eslint-disable-next-line no-console
    console.log('[V12.8] GLB raw bounds: min', box.min.toArray(), 'max', box.max.toArray());

    const tallest = Math.max(size.y, 0.0001);
    if (!Number.isFinite(tallest) || tallest < 0.001) {
      // eslint-disable-next-line no-console
      console.warn('[V12.8] GLB has degenerate size; skipping transform');
      return;
    }

    const scale = targetHeight / tallest;
    scene.scale.setScalar(scale);
    scene.position.x = -centre.x * scale;
    scene.position.z = -centre.z * scale;
    scene.position.y = -box.min.y * scale; // pedestal bottom flush to y=0

    // V12.10 — preserve original PBR textures but soften reflectivity
    // so the suit + skin don't blow out under the scene's lighting.
    //   envMapIntensity 1.5 → 0.6  (softer IBL reflections)
    //   roughness floor 0.4         (less specular highlights)
    scene.traverse((obj) => {
      const m = obj as Mesh;
      if (m.isMesh) {
        const mat = m.material as MeshStandardMaterial | MeshStandardMaterial[] | undefined;
        const adjust = (mm: MeshStandardMaterial | undefined) => {
          if (!mm) return;
          if ('envMapIntensity' in mm) mm.envMapIntensity = 0.6;
          if ('roughness' in mm) mm.roughness = Math.max(mm.roughness ?? 0, 0.40);
          mm.needsUpdate = true;
        };
        if (Array.isArray(mat)) {
          mat.forEach(adjust);
        } else {
          adjust(mat);
        }
        m.castShadow = true;
        m.receiveShadow = true;
        m.frustumCulled = false;
      }
    });
  }, [scene, targetHeight]);

  // Subtle idle motion.
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.position.y = position[1] + Math.sin(t * 0.5) * 0.020;
    groupRef.current.rotation.y = Math.sin(t * 0.25) * 0.05;
  });

  return (
    <group ref={groupRef} position={position}>
      {scene ? <primitive object={scene} /> : null}
    </group>
  );
}

useGLTF.preload('/portait.glb');
