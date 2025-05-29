precision highp float;
varying vec2 vUv;
varying vec3 vDebug;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 baseColor = vec3(1.0, 0.6, 0.8);
  
  vec3 lightPos = vec3(2.0, 2.0, 4.0);
  vec3 viewPos = vec3(0.0, -1.0, 3.0);
  
  vec3 lightDir = normalize(lightPos - vPosition);
  vec3 viewDir = normalize(viewPos - vPosition);
  vec3 normal = normalize(vNormal);
  
  float ambientStrength = 0.3;
  vec3 ambient = ambientStrength * baseColor;
  
  float diff = max(dot(normal, lightDir), 0.0);
  vec3 diffuse = diff * baseColor;
  
  vec3 reflectDir = reflect(-lightDir, normal);
  float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
  float specularStrength = 0.5;
  vec3 specular = specularStrength * spec * vec3(1.0);
  
  float gradient = smoothstep(0.0, 1.0, vUv.y);
  vec3 gradientColor = mix(baseColor * 0.8, baseColor, gradient);
  
  vec3 color = ambient + diffuse + specular;
  color = mix(color, gradientColor, 0.3);
  
  gl_FragColor = vec4(color, 1.0);
}
