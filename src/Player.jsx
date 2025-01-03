import { useFrame, extend } from "@react-three/fiber"
import { RigidBody, useRapier } from "@react-three/rapier"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { useKeyboardControls, shaderMaterial } from "@react-three/drei"
import * as THREE from "three"
import useGame from "./stores/useGame"
import wobbleVertexShader from "./shaders/wobble/vertex.glsl"
import wobbleFragmentShader from "./shaders/wobble/fragment.glsl"
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js"
import CustomShaderMaterial from "three-custom-shader-material"
const debugObject = {}
debugObject.colorA = "#0000ff"
debugObject.colorB = "#ff0000"

const Player = ({ position = [0, 1, 0], size = 0.3 }) => {
  const start = useGame((state) => state.start)
  const end = useGame((state) => state.end)
  const restart = useGame((state) => state.restart)
  const blocksCount = useGame((state) => state.blocksCount)

  const body = useRef()
  const [subscribeKeys, getKeys] = useKeyboardControls()
  const { rapier, world } = useRapier()
  const [smoothedCameraPosition] = useState(() => new THREE.Vector3(10, 10, 10))
  const [smoothedCameraTarget] = useState(() => new THREE.Vector3())

  const uniforms = useMemo(() => {
    return {
      uTime: { value: 0 },
      uPositionFrequency: { value: 0.5 },
      uTimeFrequency: { value: 0.4 },
      uStrength: { value: 0.1 },
      uWarpPositionFrequency: { value: 0.38 },
      uWarpTimeFrequency: { value: 0.12 },
      uWarpStrength: { value: 1.7 },
      uColorA: { value: new THREE.Color(debugObject.colorA) },
      uColorB: { value: new THREE.Color(debugObject.colorB) },
    }
  }, [])

  useEffect(() => {
    useGame.subscribe(
      (state) => state.phase,
      (phase) => {
        if (phase === "ready") {
          body.current?.setTranslation({ x: 0, y: 1, z: 0 })
          body.current?.setLinvel({ x: 0, y: 0, z: 0 })
          body.current?.setAngvel({ x: 0, y: 0, z: 0 })
        }
      }
    )

    const unsubscribeJump = subscribeKeys(
      (state) => state.jump,
      (value) => {
        if (value) jump()
      }
    )
    const unsubscribeAny = subscribeKeys((state) => {
      if (state.forward || state.backward || state.left || state.right) start()
    })

    const unsubscribeRestart = subscribeKeys(
      (state) => state.restart,
      (value) => {
        if (value) restart()
      }
    )

    return () => {
      unsubscribeJump()
      unsubscribeAny()
      unsubscribeRestart()
    }
  }, [subscribeKeys])

  useFrame((state, delta) => {
    // Movement
    if (!body.current) return
    const { forward, backward, left, right } = getKeys()

    const impulse = { x: 0, y: 0, z: 0 }
    const torque = { x: 0, y: 0, z: 0 }

    const impulseStrength = 0.6 * delta
    const torqueStrength = 0.2 * delta
    if (forward) {
      impulse.z -= impulseStrength
      torque.x -= torqueStrength
    }

    if (right) {
      impulse.x += impulseStrength
      torque.z -= torqueStrength
    }

    if (backward) {
      impulse.z += impulseStrength
      torque.x += torqueStrength
    }

    if (left) {
      impulse.x -= impulseStrength
      torque.z += torqueStrength
    }

    body.current.applyImpulse(impulse)
    body.current.applyTorqueImpulse(torque)

    // Camera follow
    const bodyPosition = body.current.translation()

    const cameraPosition = new THREE.Vector3()
    cameraPosition.copy(bodyPosition)
    cameraPosition.z += 2.25
    cameraPosition.y += 0.65
    const cameraTarget = new THREE.Vector3()
    cameraTarget.copy(bodyPosition)
    cameraTarget.y += 0.25

    smoothedCameraPosition.lerp(cameraPosition, 5 * delta)
    smoothedCameraTarget.lerp(cameraTarget, 5 * delta)
    state.camera.position.copy(smoothedCameraPosition)
    state.camera.lookAt(smoothedCameraTarget)

    // Phases
    if (bodyPosition.z < -(blocksCount * 4 + 2)) {
      end()
    }
    if (bodyPosition.y < -2) {
      restart()
    }

    // Update shader
    uniforms.uTime.value += delta
  })

  const jump = () => {
    if (!body.current) return
    const origin = body.current.translation()
    origin.y -= size + 0.01
    const direction = { x: 0, y: -1, z: 0 }
    const ray = new rapier.Ray(origin, direction)
    const hit = world.castRay(ray, 10, true)

    if (hit && hit.timeOfImpact < 0.15) {
      body.current.applyImpulse({ x: 0, y: 0.5, z: 0 })
    }
  }

  let geometry = useMemo(() => {
    let geometry = new THREE.IcosahedronGeometry(size, 50)
    geometry = mergeVertices(geometry)
    geometry.computeTangents()
    return geometry
  })

  return (
    <RigidBody
      ref={body}
      type="dynamic"
      canSleep={false}
      colliders="ball"
      restitution={0.2}
      friction={1}
      linearDamping={0.5}
      angularDamping={0.5}
      position={position}
    >
      <mesh castShadow receiveShadow geometry={geometry}>
        <CustomShaderMaterial
          baseMaterial={THREE.MeshStandardMaterial}
          uniforms={uniforms}
          vertexShader={wobbleVertexShader}
          fragmentShader={wobbleFragmentShader}
        />
        <CustomShaderMaterial
          baseMaterial={THREE.MeshDistanceMaterial}
          attach="customDistanceMaterial"
          uniforms={uniforms}
          vertexShader={wobbleVertexShader}
          fragmentShader={wobbleFragmentShader}
        />
        <CustomShaderMaterial
          baseMaterial={THREE.MeshDepthMaterial}
          attach="customDepthMaterial"
          uniforms={uniforms}
          vertexShader={wobbleVertexShader}
          fragmentShader={wobbleFragmentShader}
        />
      </mesh>
    </RigidBody>
  )
}

export default Player
