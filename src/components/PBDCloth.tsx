import { useEffect, useMemo, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import ClothMesh from './ClothMesh';
import pbdShader from '../shaders/pbd_update.glsl';

const CLOTH_SIZE = 100;

export default function XPBDCloth() {
  const { gl, camera, scene } = useThree();
  const clothSize = CLOTH_SIZE;
  const [mousePos, setMousePos] = useState<THREE.Vector2>(new THREE.Vector2());
  const [isDragging, setIsDragging] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<THREE.Vector2 | null>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  // setup camera and lights
  useEffect(() => {
    // camara
    camera.position.set(0, 0, 3);  // center
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    // shadow map
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;

    // add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // add main light
    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(2, 2, 4);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 500;
    scene.add(mainLight);

    //  add ground
    const groundGeometry = new THREE.PlaneGeometry(10, 10);
    const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    ground.receiveShadow = true;
    scene.add(ground);
  }, [camera, gl, scene]);

  // Create initial data texture
  const data = useMemo(() => {
    const arr = new Float32Array(clothSize * clothSize * 4);
    for (let y = 0; y < clothSize; y++) {
      for (let x = 0; x < clothSize; x++) {
        const i = (y * clothSize + x) * 4;
        // fix the top edge
        const xPos = ((x / (clothSize - 1)) * 2.0 - 1.0) * 0.6;  // x范围：[-0.6, 0.6]
        const yPos = y === 0 
          ? 0.6  // top edge 0.6
          : 0.4;  // others set to 0.4
        arr[i + 0] = xPos;
        arr[i + 1] = yPos;
        arr[i + 2] = 0;
        arr[i + 3] = 1;
      }
    }
    return arr;
  }, [clothSize]);

  // textureA
  const textureA = useMemo(() => {
    const tex = new THREE.DataTexture(
      data,
      clothSize,
      clothSize,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    tex.needsUpdate = true;
    return tex;
  }, [data, clothSize]);

  // render targets
  const [rt0, rt1, displayTarget] = useMemo(() => {
    const rtSettings = {
      type: THREE.FloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: false,
      stencilBuffer: false,
      generateMipmaps: false,
    };
    return [
      new THREE.WebGLRenderTarget(clothSize, clothSize, rtSettings),
      new THREE.WebGLRenderTarget(clothSize, clothSize, rtSettings),
      new THREE.WebGLRenderTarget(clothSize, clothSize, rtSettings),
    ];
  }, [clothSize]);

  const visibleTexture = useRef<THREE.Texture | null>(null);
  const bufferIndex = useRef(0);
  const lastUpdateTime = useRef(0);
  const isInitialized = useRef(false);

  // material scene
  const [simScene, simCamera, simMesh] = useMemo(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const material = new THREE.ShaderMaterial({
      vertexShader: `void main() { gl_Position = vec4(position, 1.0); }`,
      fragmentShader: pbdShader,
      uniforms: {
        uCurrent: { value: null },
        uPrevious: { value: null },
        uResolution: { value: new THREE.Vector2(clothSize, clothSize) },
        uTime: { value: 0 },
        uDeltaTime: { value: 0 },
        uMousePos: { value: new THREE.Vector2() },
        uIsDragging: { value: false },
        uSelectedPoint: { value: new THREE.Vector2() },
      },
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(mesh);

    return [scene, camera, mesh];
  }, [clothSize]);

  // initialize render targets
  useEffect(() => {
    if (isInitialized.current) return;
    
    console.log('Initializing render targets...');
    const initMat = new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`,
      fragmentShader: `
        uniform sampler2D initTexture;
        varying vec2 vUv;
        void main() {
          vec4 data = texture2D(initTexture, vUv);
          gl_FragColor = data;
        }
      `,
      uniforms: { initTexture: { value: textureA } },
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), initMat);
    const scene = new THREE.Scene();
    scene.add(quad);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // 
    [rt0, rt1, displayTarget].forEach((rt) => {
      gl.setRenderTarget(rt);
      gl.render(scene, cam);
      gl.setRenderTarget(null);
    });

    visibleTexture.current = displayTarget.texture;
    isInitialized.current = true;
    console.log('Render targets initialized with data:', data);
    console.log('Initial texture:', visibleTexture.current);
  }, [gl, textureA, rt0, rt1, displayTarget, data]);

  // add mouse event listeners
  const handleMouseMove = (event: MouseEvent) => {
    const rect = gl.domElement.getBoundingClientRect();
    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // update raycaster
    raycaster.current.setFromCamera(mouse.current, camera);
    
    // calculate intersection with the plane
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersection = new THREE.Vector3();
    raycaster.current.ray.intersectPlane(plane, intersection);
    
    // convert to cloth space
    const clothX = intersection.x * 0.6;
    const clothY = intersection.y * 0.6 + 0.3;
    
    setMousePos(new THREE.Vector2(clothX, clothY));
    
    if (isDragging) {
      console.log('Mouse move - Screen:', { x: mouse.current.x, y: mouse.current.y });
      console.log('Mouse move - World:', { x: intersection.x, y: intersection.y });
      console.log('Mouse move - Cloth:', { x: clothX, y: clothY });
    }
  };

  // handle mouse down
  const handleMouseDown = (event: MouseEvent) => {
    setIsDragging(true);
    const rect = gl.domElement.getBoundingClientRect();
    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.current.setFromCamera(mouse.current, camera);
    
    // calculate intersection
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersection = new THREE.Vector3();
    raycaster.current.ray.intersectPlane(plane, intersection);
    
    // 转换到布料空间
    const clothX = intersection.x * 0.6;
    const clothY = intersection.y * 0.6 + 0.3;
    
    setSelectedPoint(new THREE.Vector2(clothX, clothY));
    console.log('Mouse down - Screen:', { x: mouse.current.x, y: mouse.current.y });
    console.log('Mouse down - World:', { x: intersection.x, y: intersection.y });
    console.log('Mouse down - Cloth:', { x: clothX, y: clothY });
  };

  // release mouse
  const handleMouseUp = () => {
    setIsDragging(false);
    setSelectedPoint(null);
    console.log('Mouse up');
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [gl, camera, isDragging]);

  useFrame((_, delta) => {
    if (!isInitialized.current || !visibleTexture.current) {
      console.warn('Not initialized yet or texture missing');
      return;
    }

    const currentTime = performance.now();
    const deltaTime = (currentTime - lastUpdateTime.current) / 1000.0;
    lastUpdateTime.current = currentTime;

    const i = bufferIndex.current;
    const read = i % 2 === 0 ? rt0 : rt1;
    const write = i % 2 === 0 ? rt1 : rt0;

    // 更新模拟
    const mat = simMesh.material as THREE.ShaderMaterial;
    mat.uniforms.uCurrent.value = read.texture;
    mat.uniforms.uPrevious.value = visibleTexture.current;
    mat.uniforms.uTime.value += deltaTime;
    mat.uniforms.uDeltaTime.value = deltaTime;
    mat.uniforms.uMousePos.value = mousePos;
    mat.uniforms.uIsDragging.value = isDragging;
    mat.uniforms.uSelectedPoint.value = selectedPoint || new THREE.Vector2();

    // 每60帧输出一次调试信息
    if (bufferIndex.current % 60 === 0) {
      console.log('Frame:', bufferIndex.current);
      console.log('Mouse state:', {
        isDragging,
        mousePos: { x: mousePos.x, y: mousePos.y },
        selectedPoint: selectedPoint ? { x: selectedPoint.x, y: selectedPoint.y } : null,
        screenPos: { x: mouse.current.x, y: mouse.current.y }
      });
      console.log('Uniforms:', {
        uMousePos: mat.uniforms.uMousePos.value,
        uIsDragging: mat.uniforms.uIsDragging.value,
        uSelectedPoint: mat.uniforms.uSelectedPoint.value
      });
    }

    // render to write target
    gl.setRenderTarget(write);
    gl.render(simScene, simCamera);
    gl.setRenderTarget(null);

    // copy to display target
    const copyMat = new THREE.ShaderMaterial({
      vertexShader: `void main() { gl_Position = vec4(position, 1.0); }`,
      fragmentShader: `
        uniform sampler2D tex;
        uniform vec2 resolution;
        void main() {
          vec2 uv = gl_FragCoord.xy / resolution;
          gl_FragColor = texture2D(tex, uv);
        }
      `,
      uniforms: {
        tex: { value: write.texture },
        resolution: { value: new THREE.Vector2(clothSize, clothSize) },
      }
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), copyMat);
    const copyScene = new THREE.Scene();
    copyScene.add(quad);
    
    gl.setRenderTarget(displayTarget);
    gl.clear();
    gl.render(copyScene, simCamera);
    gl.setRenderTarget(null);

    visibleTexture.current = displayTarget.texture;
    bufferIndex.current++;

    // debug use
    if (bufferIndex.current % 60 === 0) {
      console.log('Frame:', bufferIndex.current);
      console.log('Delta time:', deltaTime);
      console.log('Texture status:', {
        isInitialized: isInitialized.current,
        hasVisibleTexture: !!visibleTexture.current,
        readTexture: read.texture,
        writeTexture: write.texture,
        displayTexture: visibleTexture.current
      });
      
      // sample texture data
      gl.setRenderTarget(write);
      const buffer = new Float32Array(clothSize * clothSize * 4);
      gl.readRenderTargetPixels(write, 0, 0, clothSize, clothSize, buffer);
      
      const samplePoints = [
        { x: 0, y: 0 },
        { x: clothSize-1, y: 0 },
        { x: 0, y: clothSize-1 },
        { x: clothSize-1, y: clothSize-1 }
      ];
      
      console.log('Sampled positions:');
      samplePoints.forEach((point, idx) => {
        const pixelIndex = (point.y * clothSize + point.x) * 4;
        console.log(`Point (${point.x}, ${point.y}):`, {
          x: buffer[pixelIndex],
          y: buffer[pixelIndex + 1],
          z: buffer[pixelIndex + 2],
          w: buffer[pixelIndex + 3]
        });
      });
      gl.setRenderTarget(null);
    }
  });

  return (
    <group>
      {visibleTexture.current && (
        <ClothMesh clothSize={clothSize} positionTexture={visibleTexture.current} />
      )}
    </group>
  );
}
