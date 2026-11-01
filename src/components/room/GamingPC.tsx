'use client';

import { Html } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, Color, CylinderGeometry, RingGeometry, TorusGeometry, type BufferGeometry, type Group, type MeshBasicMaterial } from 'three';
import { seeded, useCanvasTexture } from '@/components/room/canvasTex';
import { PC, type Vec3 } from '@/components/room/layout';
import { led, MAT } from '@/components/room/materials';
import { LedBar } from '@/components/room/RoomShell';
import { useRoom } from '@/components/room/roomStore';
import { cube, painted, solid, tube, Unmirrored, useGeometries } from '@/components/room/shapes';
import { useGlowTexture } from '@/components/room/Workstation';

/* Glass-panel tower: a side stack of three intake fans facing the glass, a top
 * radiator with its hoses, finned VRM and GPU coolers, RGB RAM and sleeved cable
 * runs, all unbranded and lit from inside. The internals merge into one mesh and
 * skip the floor mirror. Clicking it boots JARVIS. */

const W = 0.5; // length along x
const H = 0.58;
const D = 0.26; // glass faces +z (towards the camera)

const BACK = -D / 2;
const FAN_X = W / 2 - 0.075;
const FAN_R = 0.056;
const FAN_Y = [0.168, 0.019, -0.13] as const;
const PUMP: Vec3 = [-0.085, 0.115, BACK + 0.045];

const STEEL = '#7c8b90';
const BLACK = '#0c1012';
const COAL = '#182024';
const SLEEVE = '#1fa877';

type Handlers = {
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  onPointerOver: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut: (e: ThreeEvent<PointerEvent>) => void;
};

/** A row of thin cooling fins along x. */
function fins(count: number, x0: number, x1: number, y: number, z: number, h: number, d: number, hex = STEEL) {
  return Array.from({ length: count }, (_, i) => cube(0.0018, h, d, x0 + ((x1 - x0) * i) / (count - 1), y, z, hex));
}

function buildPC() {
  const chassis = [
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => cube(0.014, H, 0.014, (sx * W) / 2, 0, (sz * D) / 2, COAL))),
    cube(W, 0.012, D, 0, -H / 2, 0, COAL),
    cube(W, H, 0.008, 0, 0, BACK, BLACK),
    cube(0.008, H, D, -W / 2, 0, 0, BLACK),
    cube(0.008, H, D, W / 2, 0, 0, BLACK),
    // Slotted top panel.
    ...Array.from({ length: 8 }, (_, i) => cube(W - 0.02, 0.006, 0.02, 0, H / 2, BACK + 0.02 + i * 0.031, COAL)),
  ];

  // PSU shroud with louvres down its front, and the top radiator.
  const shroud = [
    cube(W - 0.02, 0.09, D - 0.02, 0, -H / 2 + 0.05, 0, COAL),
    ...Array.from({ length: 16 }, (_, i) => cube(0.012, 0.05, 0.002, -0.2 + i * 0.0267, -H / 2 + 0.05, (D - 0.02) / 2 + 0.001, BLACK)),
  ];
  const radiator = [
    cube(W - 0.08, 0.03, 0.124, 0, 0.25, -0.01, BLACK),
    ...fins(84, -0.205, 0.205, 0.25, -0.01, 0.024, 0.128),
    ...[-0.222, 0.222].map((x) => cube(0.024, 0.042, 0.132, x, 0.25, -0.01, COAL)),
  ];

  // VRM heatsinks hugging the socket, then the pump and its two hoses.
  const vrm = [
    cube(0.05, 0.13, 0.014, -0.205, 0.115, BACK + 0.024, COAL),
    ...fins(12, -0.226, -0.184, 0.115, BACK + 0.04, 0.128, 0.02),
    cube(0.13, 0.034, 0.014, -0.11, 0.2, BACK + 0.024, COAL),
    ...fins(22, -0.17, -0.05, 0.2, BACK + 0.04, 0.032, 0.02),
  ];
  const [px, py, pz] = PUMP;
  const pump = [
    painted(new CylinderGeometry(0.041, 0.043, 0.032, 36).rotateX(Math.PI / 2).translate(px, py, pz), COAL),
    painted(new CylinderGeometry(0.036, 0.036, 0.006, 36).rotateX(Math.PI / 2).translate(px, py, pz + 0.018), '#0a1a15'),
  ];
  const hoses = [-1, 1].map((s) =>
    tube(
      [
        [px + 0.03, py + s * 0.018, pz + 0.008],
        [px + 0.1, py + 0.05 + s * 0.016, pz + 0.05],
        [px + 0.16, 0.214, -0.02 + s * 0.022],
        [px + 0.2, 0.226, -0.01 + s * 0.022],
      ],
      0.0078,
      BLACK,
      { sides: 8, segments: 20 },
    ),
  );

  // RAM with ribbed spreaders.
  const ram = [0, 1, 2, 3].flatMap((i) => {
    const x = 0.012 + i * 0.016;
    return [cube(0.008, 0.112, 0.04, x, 0.1, BACK + 0.04, COAL), ...[-1, 1].map((s) => cube(0.0014, 0.09, 0.036, x + s * 0.0046, 0.098, BACK + 0.04, STEEL))];
  });

  // GPU: shroud, exposed fin stack towards the glass, backplate and bracket.
  const gx = -0.09;
  const gy = -0.078;
  const gpu = [
    cube(0.3, 0.058, 0.13, gx, gy, -0.03, COAL),
    cube(0.3, 0.005, 0.135, gx, gy + 0.032, -0.03, '#2d383c'),
    cube(0.3, 0.008, 0.016, gx, gy + 0.024, 0.043, BLACK),
    cube(0.3, 0.008, 0.016, gx, gy - 0.024, 0.043, BLACK),
    ...fins(74, gx - 0.142, gx + 0.142, gy, 0.043, 0.04, 0.012),
    cube(0.008, 0.085, 0.148, gx - 0.158, gy, -0.03, STEEL),
    ...[0, 1].map((i) => cube(0.02, 0.012, 0.016, gx + 0.09 + i * 0.026, gy + 0.038, 0.005, BLACK)),
  ];

  // Sleeved cable runs: a 24-pin ribbon, GPU power and the CPU feed.
  const ribbon = Array.from({ length: 9 }, (_, i) => {
    const z = BACK + 0.022 + i * 0.0086;
    return tube(
      [
        [0.09, -0.2, z],
        [0.1, -0.13, z + 0.012],
        [0.098, -0.03, z + 0.008],
        [0.086, 0.012, z],
        [0.066, 0.024, BACK + 0.024 + i * 0.0035],
      ],
      0.0036,
      i % 3 === 1 ? SLEEVE : BLACK,
      { sides: 6, segments: 24 },
    );
  });
  const power = [0, 1, 2, 3].map((i) => {
    const z = -0.026 + i * 0.0078;
    return tube(
      [
        [0.092, -0.2, z],
        [0.094, -0.11, z],
        [0.082, -0.03, z],
        [0.052, -0.014, z],
        [gx + 0.1, gy + 0.046, z - 0.022],
      ],
      0.0034,
      i % 2 ? SLEEVE : BLACK,
      { sides: 6, segments: 22 },
    );
  });
  const cpuFeed = [0, 1].map((i) =>
    tube(
      [
        [-0.236, 0.15 + i * 0.008, BACK + 0.014],
        [-0.232, 0.216, BACK + 0.03],
        [-0.2, 0.226, BACK + 0.034],
        [-0.17, 0.224, BACK + 0.028 + i * 0.006],
      ],
      0.0032,
      BLACK,
      { sides: 6, segments: 16 },
    ),
  );

  // A square frame round each intake fan, and the stator spokes behind the blades.
  const fanFrames = FAN_Y.flatMap((y) => [
    ...[-1, 1].flatMap((s) => [cube(0.126, 0.006, 0.022, FAN_X, y + s * 0.066, -0.02, COAL), cube(0.006, 0.126, 0.022, FAN_X + s * 0.066, y, -0.02, COAL)]),
    ...[0.785, 2.356].map((a) => cube(0.112, 0.004, 0.004, FAN_X, y, -0.031, COAL, a)),
    painted(new CylinderGeometry(FAN_R, FAN_R, 0.002, 28).rotateX(Math.PI / 2).translate(FAN_X, y, -0.034), BLACK),
  ]);

  const leds: BufferGeometry[] = [
    ...FAN_Y.map((y) => new TorusGeometry(FAN_R + 0.002, 0.0036, 8, 48).translate(FAN_X, y, -0.012)),
    new RingGeometry(0.024, 0.034, 40).translate(px, py, pz + 0.0215),
    cube(0.28, 0.005, 0.004, gx, gy + 0.034, 0.038),
    cube(W, 0.008, 0.008, 0, -H / 2 - 0.006, D / 2),
  ];

  // One seven-blade rotor, shared by all three fans.
  const blades = Array.from({ length: 7 }, (_, b) =>
    painted(new CylinderGeometry(0.0001, 0.015, FAN_R - 0.012, 3, 1).scale(1, 1, 0.14).rotateY(0.55).translate(0, FAN_R / 2 + 0.004, 0).rotateZ((b * Math.PI * 2) / 7), '#28343a'),
  );
  const hub = painted(new CylinderGeometry(0.0165, 0.0165, 0.012, 22).rotateX(Math.PI / 2), COAL);

  return {
    interior: solid([...chassis, ...shroud, ...radiator, ...vrm, ...pump, ...hoses, ...ram, ...gpu, ...ribbon, ...power, ...cpuFeed, ...fanFrames]),
    leds: solid(leds, { colour: false }),
    rotor: solid([...blades, hub]),
  };
}

export function GamingPC({ handlers, still }: { handlers: Handlers; still: boolean }) {
  const hover = useRoom((s) => s.hover);
  const fans = useRef<Group[]>([]);
  const ram = useRef<MeshBasicMaterial[]>([]);
  const glow = useRef(1);
  const tmp = useRef(new Color());
  // Own LED material so hovering brightens the PC, not every strip in the room.
  const pcLed = useMemo(() => led(), []);
  const { interior, leds, rotor } = useGeometries(buildPC);
  const backlight = useGlowTexture();

  // Unbranded circuit board: traces, chips and the socket outline.
  const pcb = useCanvasTexture(
    256,
    320,
    (ctx, w, h) => {
      const rnd = seeded(17);
      ctx.fillStyle = '#0a211b';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(70,190,150,0.42)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 90; i++) {
        const x = rnd() * w;
        const y = rnd() * h;
        const run = 12 + rnd() * 60;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(rnd() > 0.5 ? x + run : x, rnd() > 0.5 ? y : y + run);
        ctx.stroke();
      }
      ctx.fillStyle = '#10161a';
      for (let i = 0; i < 12; i++) ctx.fillRect(rnd() * (w - 30), h * 0.45 + rnd() * h * 0.5, 14 + rnd() * 18, 8 + rnd() * 14);
      ctx.strokeStyle = '#57d9ad';
      ctx.lineWidth = 2;
      ctx.strokeRect(w * 0.3, h * 0.2, w * 0.36, w * 0.36);
    },
    [],
  );

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (!still) fans.current.forEach((f) => f && (f.rotation.z -= dt * 9));
    glow.current += ((hover ? 1.6 : 1) - glow.current) * Math.min(1, dt * 6);
    ram.current.forEach((m, i) => {
      if (!m) return;
      const hue = (0.42 + Math.sin(t * 0.8 + i * 0.6) * 0.06 + 1) % 1;
      m.color.copy(tmp.current.setHSL(hue, 1, 0.55).multiplyScalar(2.6 * glow.current));
    });
    pcLed.color.setRGB(0.18 * 3.2 * glow.current, 3.2 * glow.current, 0.69 * 3.2 * glow.current);
  });

  return (
    <group position={PC}>
      {/* A plain box takes the clicks, so fins and cables stay out of every mouse-move raycast. */}
      <mesh {...handlers}>
        <boxGeometry args={[W, H, D]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      <mesh geometry={leds} material={pcLed} />
      <Unmirrored>
        <mesh geometry={interior} material={MAT.painted} />
        <mesh position={[-0.085, 0.045, BACK + 0.007]}>
          <planeGeometry args={[0.3, 0.36]} />
          <meshStandardMaterial map={pcb} roughness={0.55} metalness={0.35} />
        </mesh>
        {/* A lit backplate, so hoses and cables stand out in silhouette. */}
        <mesh position={[-0.03, 0.04, BACK + 0.0085]}>
          <planeGeometry args={[0.5, 0.54]} />
          <meshBasicMaterial map={backlight} transparent opacity={0.9} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
        </mesh>
        {/* Tempered glass. */}
        <mesh position={[0, 0, D / 2]} material={MAT.glass}>
          <boxGeometry args={[W - 0.01, H - 0.01, 0.004]} />
        </mesh>
        {/* RAM light bars. */}
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[0.012 + i * 0.016, 0.16, BACK + 0.04]}>
            <boxGeometry args={[0.009, 0.008, 0.04]} />
            <meshBasicMaterial
              ref={(m) => {
                if (m) ram.current[i] = m;
              }}
              toneMapped={false}
            />
          </mesh>
        ))}
        {FAN_Y.map((y, i) => (
          <group
            key={y}
            position={[FAN_X, y, -0.022]}
            ref={(g) => {
              if (g) fans.current[i] = g;
            }}
          >
            <mesh geometry={rotor} material={MAT.painted} />
          </group>
        ))}
      </Unmirrored>
      <LedBar from={[-W / 2 + 0.02, H / 2 - 0.02, D / 2 - 0.01]} to={[W / 2 - 0.02, H / 2 - 0.02, D / 2 - 0.01]} thick={0.005} mat={pcLed} />

      {hover && (
        <Html position={[0, H / 2 + 0.12, 0.1]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="room-tip">⏻ Boot JARVIS</div>
        </Html>
      )}
    </group>
  );
}
