import * as THREE from 'three';
import vertexShader from '../shaders/cloth_vert.glsl';
import fragmentShader from '../shaders/cloth_frag.glsl';
import { useMemo, useEffect } from 'react';

interface Props {
  clothSize: number;
  positionTexture: THREE.Texture;
}

export default function ClothMesh({ clothSize, positionTexture }: Props) {
  const geometry = useMemo(() => {
    const geom = new THREE.PlaneGeometry(2, 2, clothSize - 1, clothSize - 1);
    
    const uvs = geom.attributes.uv;
    const positions = geom.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      uvs.setXY(i, (x + 1) * 0.5, (y + 1) * 0.5);
    }
    uvs.needsUpdate = true;
    
    return geom;
  }, [clothSize]);

  useEffect(() => {
    console.log('ClothMesh mounted');
    console.log('Position texture:', positionTexture);
    console.log('Cloth size:', clothSize);
  }, [positionTexture, clothSize]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uCurrent: { value: positionTexture },
          uResolution: { value: new THREE.Vector2(clothSize, clothSize) },
        }}
        side={THREE.DoubleSide}
        transparent={true}
      />
    </mesh>
  );
}
