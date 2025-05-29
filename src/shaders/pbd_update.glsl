precision highp float;

uniform sampler2D uCurrent;
uniform sampler2D uPrevious;
uniform vec2 uResolution;
uniform float uTime;
uniform float uDeltaTime;
uniform vec2 uMousePos;
uniform bool uIsDragging;
uniform vec2 uSelectedPoint;

const float GRAVITY = -9.8;
const int CONSTRAINT_ITERATIONS = 4;  // for stability
const float DAMPING = 0.88;  // damping factor
const float MOUSE_INFLUENCE = 20.0;  // mouse influence factor
const float MOUSE_RADIUS = 0.9; // mouse influence radius

void main() {
  vec2 texel = 1.0 / uResolution;
  vec2 uv = gl_FragCoord.xy / uResolution;

  vec4 curr = texture2D(uCurrent, uv);
  vec4 prev = texture2D(uPrevious, uv);

//   calculate velocity and pos
  vec2 velocity = (curr.xy - prev.xy) * DAMPING;
  vec2 gravity = vec2(0.0, GRAVITY * uDeltaTime);
  vec2 pos = curr.xy + velocity + gravity;

  // mouse influence
  if (uIsDragging) {
    vec2 mouseDelta = uMousePos - pos;
    float dist = length(mouseDelta);
    
    // debugging 
    if (uv.x > 0.99 && uv.y > 0.99) {
      gl_FragColor = vec4(
        float(uIsDragging),  
        dist / MOUSE_RADIUS, 
        length(mouseDelta), 
        1.0
      );
      return;
    }
    
    if (dist < MOUSE_RADIUS) {
      float influence = pow(1.0 - smoothstep(0.0, MOUSE_RADIUS, dist), 2.0);
      pos += mouseDelta * influence * MOUSE_INFLUENCE;
      
      // if close enough to the mouse, follow
      if (dist < MOUSE_RADIUS * 0.3) {
        pos = uMousePos;
      }
    }
  }

  // get the rest length
  float spacing = 2.0 / uResolution.x;
  float rest = spacing;
  float diagonalRest = spacing * sqrt(2.0);  

  for(int i = 0; i < CONSTRAINT_ITERATIONS; i++) {
    // horizontal constraint
    if (gl_FragCoord.x > 0.5) {
      vec2 neighbor = texture2D(uCurrent, vec2(uv.x - texel.x, uv.y)).xy;
      vec2 delta = pos - neighbor;
      float len = length(delta);
      if (len > 0.0001) {
        pos -= 0.5 * (len - rest) * delta / len;
      }
    }
    if (gl_FragCoord.x < uResolution.x - 0.5) {
      vec2 neighbor = texture2D(uCurrent, vec2(uv.x + texel.x, uv.y)).xy;
      vec2 delta = pos - neighbor;
      float len = length(delta);
      if (len > 0.0001) {
        pos -= 0.5 * (len - rest) * delta / len;
      }
    }

    // ver
    if (gl_FragCoord.y > 0.5) {
      vec2 neighbor = texture2D(uCurrent, vec2(uv.x, uv.y - texel.y)).xy;
      vec2 delta = pos - neighbor;
      float len = length(delta);
      if (len > 0.0001) {
        pos -= 0.5 * (len - rest) * delta / len;
      }
    }
    if (gl_FragCoord.y < uResolution.y - 0.5) {
      vec2 neighbor = texture2D(uCurrent, vec2(uv.x, uv.y + texel.y)).xy;
      vec2 delta = pos - neighbor;
      float len = length(delta);
      if (len > 0.0001) {
        pos -= 0.5 * (len - rest) * delta / len;
      }
    }

    // diagonal constraint left top
    if (gl_FragCoord.x > 0.5 && gl_FragCoord.y > 0.5) {
      vec2 neighbor = texture2D(uCurrent, vec2(uv.x - texel.x, uv.y - texel.y)).xy;
      vec2 delta = pos - neighbor;
      float len = length(delta);
      if (len > diagonalRest) {
        pos -= 0.5 * (len - diagonalRest) * delta / len;
      }
    }

    // diagonal constraint right top
    if (gl_FragCoord.x < uResolution.x - 0.5 && gl_FragCoord.y > 0.5) {
      vec2 neighbor = texture2D(uCurrent, vec2(uv.x + texel.x, uv.y - texel.y)).xy;
      vec2 delta = pos - neighbor;
      float len = length(delta);
      if (len > diagonalRest) {
        pos -= 0.5 * (len - diagonalRest) * delta / len;
      }
    }

    // diagonal constraint left bottom
    if (gl_FragCoord.x > 0.5 && gl_FragCoord.y < uResolution.y - 0.5) {
      vec2 neighbor = texture2D(uCurrent, vec2(uv.x - texel.x, uv.y + texel.y)).xy;
      vec2 delta = pos - neighbor;
      float len = length(delta);
      if (len > diagonalRest) {
        pos -= 0.5 * (len - diagonalRest) * delta / len;
      }
    }

    // diagonal constraint right bottom
    if (gl_FragCoord.x < uResolution.x - 0.5 && gl_FragCoord.y < uResolution.y - 0.5) {
      vec2 neighbor = texture2D(uCurrent, vec2(uv.x + texel.x, uv.y + texel.y)).xy;
      vec2 delta = pos - neighbor;
      float len = length(delta);
      if (len > diagonalRest) {
        pos -= 0.5 * (len - diagonalRest) * delta / len;
      }
    }
  }

  // fix the top boundary
  if (uv.y > 0.95) {
    pos = curr.xy;
  }

  gl_FragColor = vec4(pos, 0.0, 1.0);
}
