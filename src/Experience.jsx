import Lights from "./Lights.jsx"
import Level from "./Level.jsx"
import { Physics } from "@react-three/rapier"
import Player from "./Player.jsx"
import useGame from "./stores/useGame.js"
import { Float, Text } from "@react-three/drei"
import { MeshBasicMaterial } from "three"

export default function Experience() {
  const blocksCount = useGame((state) => state.blocksCount)
  const blockSeed = useGame((state) => state.blockSeed)
  return (
    <>
      <color attach="background" args={["#bdedfc"]} />
      <Float floatIntensity={0.25} rotationIntensity={0.25}>
        <Text
          scale={0.5}
          font="/bebas-neue-v9-latin-regular.woff"
          maxWidth={0.25}
          lineHeight={0.75}
          textAlign="right"
          position={[0.75, 0.65, 0]}
          rotation-y={-0.25}
        >
          Start Race
          <meshBasicMaterial toneMapped={false} />
        </Text>
      </Float>
      <Physics>
        <Lights />

        <Level count={blocksCount} seed={blockSeed} />
        <Player position={[0, 1, 0]} />
      </Physics>
    </>
  )
}
