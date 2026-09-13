import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, OrbitControls, Html, RoundedBox, ContactShadows } from '@react-three/drei'
import { useReducedMotion } from 'framer-motion'
import ScreenDashboard from './ScreenDashboard.jsx'

/**
 * Stylised-but-real laptop built from primitives — no external model asset.
 *
 * Coordinate convention: the top face of the base sits at y = 0, the hinge runs
 * along z = -1.15, and the lid tilts back from there. Everything else is placed
 * relative to those two landmarks.
 *
 * Colour split: hardware is graphite/navy-black with restrained purple rim light
 * (brand). The dashboard *content* on the screen uses green for live/positive
 * values only — that's product data, not branding.
 */

const BASE_W = 3.4
const BASE_D = 2.3
const BASE_H = 0.14
const HINGE_Z = -BASE_D / 2
const SCREEN_TILT = -0.3 // radians back from vertical — resting "open" angle
const LID_CLOSED_TILT = Math.PI / 2 - 0.04 // folded flat onto the keyboard, just clear of it
const BASE_Y_ROTATION = 0.24 // resting yaw
const LID_H = 2.15

// Click-to-spin sequence: close the lid, spin the whole laptop a full turn,
// then reopen the lid once it's back at its resting yaw.
const CLOSE_DURATION = 0.5
const TURN_DURATION = 1.3
const OPEN_DURATION = 0.55

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

const DISPLAY_W = 3.04
const DISPLAY_H = 1.9
// drei maps DOM pixels to world units through distanceFactor, not a raw ratio —
// this value is calibrated so the 600px-wide dashboard fills the display plane.
const HTML_DISTANCE = 2.05

function Keyboard() {
  const keyGeometry = useMemo(() => new THREE.BoxGeometry(0.165, 0.028, 0.145), [])
  const keyMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#0C0C11', roughness: 0.85, metalness: 0.15 }),
    []
  )

  const keys = useMemo(() => {
    const positions = []
    const cols = 14
    const rows = 5
    const pitchX = 0.193
    const pitchZ = 0.175
    const startX = -((cols - 1) * pitchX) / 2
    const startZ = -0.78
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        // Leave a gap in the bottom row for the spacebar
        if (r === rows - 1 && c > 3 && c < 10) continue
        positions.push([startX + c * pitchX, 0.022, startZ + r * pitchZ])
      }
    }
    return positions
  }, [])

  return (
    <group>
      {/* Recessed deck the keys sit in */}
      <RoundedBox args={[2.86, 0.02, 1.0]} radius={0.02} position={[0, 0.004, -0.42]}>
        <meshStandardMaterial color="#0A0A0F" roughness={0.9} metalness={0.1} />
      </RoundedBox>

      {keys.map((position) => (
        <mesh
          key={`${position[0]}-${position[2]}`}
          geometry={keyGeometry}
          material={keyMaterial}
          position={position}
        />
      ))}

      {/* Spacebar */}
      <mesh position={[0, 0.022, -0.78 + 4 * 0.175]}>
        <boxGeometry args={[1.1, 0.028, 0.145]} />
        <meshStandardMaterial color="#0C0C11" roughness={0.85} metalness={0.15} />
      </mesh>

      {/* Trackpad */}
      <RoundedBox args={[1.15, 0.012, 0.72]} radius={0.02} position={[0, 0.008, 0.62]}>
        <meshStandardMaterial color="#13131A" roughness={0.55} metalness={0.35} />
      </RoundedBox>
    </group>
  )
}

function Laptop({ reduceMotion }) {
  const groupRef = useRef(null)
  const lidRef = useRef(null)
  const phaseRef = useRef('idle') // 'idle' | 'closing' | 'turning' | 'opening'
  const phaseStartRef = useRef(0)
  const pointerDownRef = useRef(null)
  // Screen content is DOM-rendered (Html), so it doesn't get occluded by the
  // lid geometry as it folds shut — hide it explicitly for the closed/turning
  // stretch of the sequence and bring it back once the lid is open again.
  const [screenVisible, setScreenVisible] = useState(true)

  const handlePointerDown = (event) => {
    pointerDownRef.current = { x: event.clientX, y: event.clientY }
  }

  const handlePointerUp = (event) => {
    const down = pointerDownRef.current
    pointerDownRef.current = null
    if (!down || phaseRef.current !== 'idle') return
    // Only treat this as a click, not the tail end of an orbit-drag.
    const moved = Math.hypot(event.clientX - down.x, event.clientY - down.y)
    if (moved > 6) return

    if (reduceMotion) return

    phaseRef.current = 'closing'
    phaseStartRef.current = 0 // initialized on the next frame, against the render clock
    setScreenVisible(false)
  }

  // Auto-play the same close/spin/open sequence once whenever this mounts —
  // i.e. every time the landing page is loaded or navigated to — so the
  // laptop demonstrates itself instead of relying on a visitor finding the
  // click-to-spin interaction. Timed just after the hero's own fade-in
  // (LandingPage's right-column motion.div: 0.7s duration + 0.15s delay)
  // finishes, so it reads as the next beat, not a jump-cut.
  useEffect(() => {
    if (reduceMotion) return undefined
    const id = setTimeout(() => {
      if (phaseRef.current !== 'idle') return
      phaseRef.current = 'closing'
      phaseStartRef.current = 0
      setScreenVisible(false)
    }, 1000)
    return () => clearTimeout(id)
  }, [reduceMotion])

  useFrame((state) => {
    const lid = lidRef.current
    const group = groupRef.current
    if (!lid || !group) return

    const t = state.clock.elapsedTime
    const phase = phaseRef.current

    if (phase === 'idle') {
      lid.rotation.x = SCREEN_TILT
      group.rotation.y = BASE_Y_ROTATION
      return
    }

    if (phaseStartRef.current === 0) phaseStartRef.current = t
    const elapsed = t - phaseStartRef.current

    if (phase === 'closing') {
      const p = Math.min(elapsed / CLOSE_DURATION, 1)
      lid.rotation.x = THREE.MathUtils.lerp(SCREEN_TILT, LID_CLOSED_TILT, easeInOutCubic(p))
      if (p >= 1) {
        phaseRef.current = 'turning'
        phaseStartRef.current = t
      }
    } else if (phase === 'turning') {
      const p = Math.min(elapsed / TURN_DURATION, 1)
      group.rotation.y = BASE_Y_ROTATION + easeInOutCubic(p) * Math.PI * 2
      if (p >= 1) {
        phaseRef.current = 'opening'
        phaseStartRef.current = t
      }
    } else if (phase === 'opening') {
      const p = Math.min(elapsed / OPEN_DURATION, 1)
      group.rotation.y = BASE_Y_ROTATION
      lid.rotation.x = THREE.MathUtils.lerp(LID_CLOSED_TILT, SCREEN_TILT, easeInOutCubic(p))
      if (p >= 1) {
        phaseRef.current = 'idle'
        phaseStartRef.current = 0
        setScreenVisible(true)
      }
    }
  })

  return (
    <group
      ref={groupRef}
      rotation={[0, BASE_Y_ROTATION, 0]}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      {/* ── Base ───────────────────────────────────────────────────────────── */}
      <RoundedBox args={[BASE_W, BASE_H, BASE_D]} radius={0.05} smoothness={4} position={[0, -BASE_H / 2, 0]}>
        <meshStandardMaterial color="#1A1A22" roughness={0.42} metalness={0.72} />
      </RoundedBox>

      <Keyboard />

      {/* Front-edge purple rim light — thin and restrained */}
      <mesh position={[0, -BASE_H / 2, BASE_D / 2 + 0.005]}>
        <boxGeometry args={[BASE_W - 0.5, 0.012, 0.012]} />
        <meshStandardMaterial
          color="#794BD4"
          emissive="#CE63E9"
          emissiveIntensity={0.9}
          toneMapped={false}
        />
      </mesh>

      {/* Shallow notch in the front lip (where you'd open the lid) */}
      <mesh position={[0, -0.04, BASE_D / 2 - 0.01]}>
        <boxGeometry args={[0.5, 0.05, 0.04]} />
        <meshStandardMaterial color="#0A0A0F" roughness={0.9} />
      </mesh>

      {/* ── Hinge ──────────────────────────────────────────────────────────── */}
      <mesh position={[0, 0.01, HINGE_Z + 0.04]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.055, 0.055, BASE_W - 0.5, 24]} />
        <meshStandardMaterial color="#101017" roughness={0.5} metalness={0.8} />
      </mesh>

      {/* ── Lid ────────────────────────────────────────────────────────────── */}
      <group ref={lidRef} position={[0, 0.01, HINGE_Z + 0.04]} rotation={[SCREEN_TILT, 0, 0]}>
        {/* Outer shell */}
        <RoundedBox
          args={[BASE_W, LID_H, 0.09]}
          radius={0.05}
          smoothness={4}
          position={[0, LID_H / 2, -0.045]}
        >
          <meshStandardMaterial color="#1A1A22" roughness={0.4} metalness={0.75} />
        </RoundedBox>

        {/* Black bezel face */}
        <RoundedBox
          args={[BASE_W - 0.08, LID_H - 0.08, 0.02]}
          radius={0.03}
          smoothness={4}
          position={[0, LID_H / 2, 0.006]}
        >
          <meshStandardMaterial color="#08080C" roughness={0.6} metalness={0.2} />
        </RoundedBox>

        {/* Webcam notch */}
        <mesh position={[0, LID_H - 0.105, 0.018]}>
          <boxGeometry args={[0.42, 0.055, 0.006]} />
          <meshStandardMaterial color="#050507" roughness={0.7} />
        </mesh>
        <mesh position={[0, LID_H - 0.105, 0.022]}>
          <circleGeometry args={[0.013, 16]} />
          <meshStandardMaterial color="#23232E" roughness={0.3} metalness={0.6} />
        </mesh>

        {/* Display panel */}
        <mesh position={[0, LID_H / 2 - 0.03, 0.019]}>
          <planeGeometry args={[DISPLAY_W, DISPLAY_H]} />
          <meshBasicMaterial color="#09090D" />
        </mesh>

        {/* Dashboard UI and the floating opportunity card are DOM overlays —
            pull them out entirely while the lid is closed/turning so they
            can't float in front of the laptop mid-spin. */}
        {screenVisible && (
          <>
            {/* Dashboard UI, mapped 1:1 onto the display plane */}
            <Html
              transform
              distanceFactor={HTML_DISTANCE}
              position={[0, LID_H / 2 - 0.03, 0.021]}
              style={{ pointerEvents: 'none' }}
              zIndexRange={[10, 0]}
            >
              <ScreenDashboard />
            </Html>

            {/* Layered opportunity card floating just in front of the screen.
                Rotation is nearly parallel to the lid (a small offset, not
                the ~16° twist this used to have) so it reads as a card
                popped slightly off the glass, not one floating askew in
                space at a mismatched angle. Sizes are custom small pixel
                values for the same reason as ScreenDashboard: the app's
                text-xs/text-sm/etc. utilities are sized for the real UI, far
                too large for a 250px-wide miniature. */}
            <Html
              transform
              distanceFactor={HTML_DISTANCE}
              position={[1.18, 0.32, 0.16]}
              rotation={[0.015, -0.06, 0]}
              style={{ pointerEvents: 'none' }}
              zIndexRange={[30, 20]}
            >
              <div
                className="rounded-xl border border-vantage-border bg-vantage-surfaceAlt p-3.5"
                style={{ width: 200, fontSize: 10, boxShadow: '0 30px 60px -15px rgba(0,0,0,0.85)' }}
                aria-hidden="true"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[9px] uppercase tracking-wide text-vantage-textDim">
                    Kalshi · NYY @ BOS
                  </span>
                  <span className="flex flex-shrink-0 items-center gap-1 text-[8px] font-semibold text-vantage-positive">
                    <span className="h-1 w-1 rounded-full bg-vantage-positive" />
                    LIVE
                  </span>
                </div>

                <div className="mt-1.5 text-[10px] font-semibold leading-tight text-vantage-text">
                  Aaron Judge — Over 1.5 TB
                </div>

                <div className="mt-2.5 flex items-end justify-between">
                  <div>
                    <div className="text-[8px] text-vantage-textDim">Market price</div>
                    <div className="text-[13px] font-bold leading-tight text-vantage-text">42¢</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[8px] text-vantage-textDim">Price advantage</div>
                    <div className="text-[13px] font-bold leading-tight text-vantage-positive">+5¢</div>
                  </div>
                </div>

                <div className="mt-2 h-1 overflow-hidden rounded-full bg-vantage-raised">
                  <div className="h-full w-[68%] rounded-full bg-vantage-accent" />
                </div>

                <div className="mt-2 inline-block rounded-full px-2 py-0.5 text-[8px] text-vantage-positive">
                  Confidence: High
                </div>
              </div>
            </Html>
          </>
        )}

        {/* Screen-edge rim light */}
        <mesh position={[0, 0.045, 0.02]}>
          <boxGeometry args={[BASE_W - 0.6, 0.008, 0.008]} />
          <meshStandardMaterial
            color="#794BD4"
            emissive="#DF78FF"
            emissiveIntensity={0.7}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  )
}

export default function LaptopScene() {
  const reduceMotion = useReducedMotion()

  return (
    // Generous canvas so the whole laptop sits inside it with margin — nothing
    // is cropped, masked, or framed. Transparent background, no parent surface.
    <div className="h-[24rem] w-full cursor-grab active:cursor-grabbing sm:h-[32rem] lg:h-[40rem]">
      <Canvas
        camera={{ position: [1.85, 2.15, 6.7], fov: 30 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.45} />
        {/* Key light, cool white — gives the metal its form */}
        <directionalLight position={[3, 6, 5]} intensity={2.1} color="#EDE8F5" />
        {/* Purple accent rims */}
        <pointLight position={[5, 1.5, 3]} intensity={45} color="#CE63E9" />
        <pointLight position={[-5, 0.5, 2]} intensity={30} color="#794BD4" />
        <pointLight position={[0, 3.5, -4]} intensity={22} color="#DF78FF" />

        <Suspense fallback={null}>
          <Float
            speed={reduceMotion ? 0 : 1.1}
            rotationIntensity={reduceMotion ? 0 : 0.14}
            floatIntensity={reduceMotion ? 0 : 0.45}
          >
            <Laptop reduceMotion={reduceMotion} />
          </Float>

          {/* Soft, diffuse ground shadow — no hard rectangular edge */}
          <ContactShadows
            position={[0, -0.16, 0]}
            opacity={0.62}
            scale={9}
            blur={3}
            far={3}
            resolution={512}
            color="#000000"
          />
        </Suspense>

        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom={false}
          target={[0, 0.78, 0]}
          rotateSpeed={0.7}
          enableDamping
          dampingFactor={0.12}
          minPolarAngle={Math.PI / 3.4}
          maxPolarAngle={Math.PI / 2.05}
          minAzimuthAngle={-Math.PI / 5}
          maxAzimuthAngle={Math.PI / 5}
        />
      </Canvas>
    </div>
  )
}
