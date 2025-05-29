precision highp float;

void main() {
  vec2 coord = gl_PointCoord - 0.5;
  float dist = length(coord);
  if (dist > 0.5) discard;

  gl_FragColor = vec4(1.0, 0.6, 0.8, 1.0);
}
