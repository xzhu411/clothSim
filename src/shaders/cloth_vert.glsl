precision highp float;

uniform sampler2D uCurrent;
uniform vec2 uResolution;

varying vec2 vUv;
varying vec3 vDebug;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vUv = uv;
  
  vec4 posData = texture2D(uCurrent, uv);
  
  vDebug = vec3(
    posData.x,  // x position
    posData.y,  // y position
    length(posData.xy)  // distance from center
  );
  
  vec3 pos = vec3(posData.xy, 0.0);
  
  
  float texelSize = 1.0 / float(uResolution.x);
  vec2 uvRight = vec2(uv.x + texelSize, uv.y);
  vec2 uvUp = vec2(uv.x, uv.y + texelSize);
  
  // get neighboring positions
  vec3 posRight = vec3(texture2D(uCurrent, uvRight).xy, 0.0);
  vec3 posUp = vec3(texture2D(uCurrent, uvUp).xy, 0.0);
  
  // get tangent vectors
  vec3 tangentX = posRight - pos;
  vec3 tangentY = posUp - pos;
  
  // get normal vector
  vNormal = normalize(cross(tangentX, tangentY));
  
  // send the normal to the fragment shader
  vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
  vPosition = worldPosition.xyz;
  
  // final position
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
