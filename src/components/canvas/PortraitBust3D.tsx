'use client';

import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import {
  Box3,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
  Vector3,
} from 'three';

/* V12.7 — render /portait.glb AS-IS.
 *
 *   The GLB ships with its own textured suited bust + a tiered black
 *   pedestal. Earlier rounds overrode the model's PBR materials with a
 *   hologram shader and that's why the avatar kept disappearing. We
 *   no longer touch the materials — we just tweak envMapIntensity so
 *   the suit + skin catch the scene's <Environment> IBL, and we
 *   auto-fit the model to a target world-space height.
 *
 *   The "hologram" effect now lives AROUND the avatar (scanner cage +
 *   floor halos + sparkles + scanner rings) in HoloCapsule. The bust
 *   itself is just a normal PBR mesh. */

type Props = {
  position?: [number, number, number];
  targetHeight?: number;
};

export function PortraitBust3D({
  position = [0, 0, 0],
  targetHeight = 2.8,
}: Props) {
  const gltf = useGLTF('/portait.glb');
  const scene = gltf?.scene;
  const groupRef = useRef<Group | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!scene) return;

    // Log diagnostic — confirm load + dimensions.
    // eslint-disable-next-line no-console
    console.log('[GLB] portait.glb loaded.');
    const box = new Box3().setFromObject(scene);
    const size = new Vector3();
    const centre = new Vector3();
    box.getSize(size);
    box.getCenter(centre);
    // eslint-disable-next-line no-console
    console.log('[GLB] size:', size.toArray(), 'min:', box.min.toArray(), 'max:', box.max.toArray());

    // Keep the model's textures. Just bump envMapIntensity so the suit
    // + skin catch the scene's Environment preset properly, and enable
    // shadows.
    scene.traverse((obj) => {
      const m = obj as Mesh;
      if (m.isMesh) {
        const mat = m.material as MeshStandardMaterial | MeshStandardMaterial[] | undefined;
        if (Array.isArray(mat)) {
          mat.forEach((mm) => {
            if (mm && 'envMapIntensity' in mm) mm.envMapIntensity = 1.2;
            if (mm) mm.needsUpdate = true;
          });
        } else if (mat) {
          if ('envMapIntensity' in mat) mat.envMapIntensity = 1.2;
          mat.needsUpdate = true;
        }
        m.castShadow = true;
        m.receiveShadow = true;
        m.frustumCulled = false;
      }
    });

    // Auto-scale so the model's overall height matches targetHeight.
    const tallest = Math.max(size.y, 0.0001);
    if (!Number.isFinite(tallest) || tallest < 0.001) {
      // eslint-disable-next-line no-console
      console.warn('[GLB] degenerate size; skipping scale');
      setLoaded(true);
      return;
    }
    const scale = targetHeight / tallest;
    scene.scale.setScalar(scale);

    // Recentre: x/z to origin, y so the pedestal bottom sits at world y=0.
    scene.position.x = -centre.x * scale;
    scene.position.z = -centre.z * scale;
    scene.position.y = -box.min.y * scale;

    setLoaded(true);
  }, [scene, targetHeight]);

  // Subtle idle motion — gentle Y bob (breathing) + slow sway.
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.position.y = position[1] + Math.sin(t * 0.5) * 0.015;
    groupRef.current.rotation.y = Math.sin(t * 0.30) * 0.04;
  });

  return (
    <group ref={groupRef} position={position}>
      {scene && loaded ? (
        <primitive object={scene} />
      ) : (
        <FallbackBust />
      )}
    </group>
  );
}

/* Wireframe humanoid placeholder while the glb fetches (or if it fails
 * outright). Visible enough that the capsule isn't ever empty. */
function FallbackBust() {
  return (
    <group>
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.36, 18, 14]} />
        <meshStandardMaterial color="#2EFFB0" emissive="#2EFFB0" emissiveIntensity={1.6} wireframe toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <capsuleGeometry args={[0.40, 0.85, 4, 16]} />
        <meshStandardMaterial color="#2EFFB0" emissive="#2EFFB0" emissiveIntensity={1.4} wireframe toneMapped={false} />
      </mesh>
    </group>
  );
}

useGLTF.preload('/portait.glb');
