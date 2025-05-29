uniform sampler2D uPosition;
uniform vec2 uResolution;

void main() {
  float index = float(gl_VertexID);
  float size = uResolution.x;

  float x = mod(index, size);
  float y = floor(index / size);
  vec2 uv = (vec2(x, y) + 0.5) / uResolution;


  vec4 pos = texture2D(uPosition, uv);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos.xy, 0.0, 1.0);
  gl_PointSize = 5.;
}
