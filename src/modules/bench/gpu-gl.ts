// Phần WebGL2 dùng chung cho worker GPU và phương án dự phòng chạy trên main thread.
// Công thức trong shader port từ kernel gpu.js của mprep.info/gpu: mỗi texel chạy một chuỗi
// phép tính phụ thuộc nhau (cộng -> chia -> exp -> 6 lần căn bậc hai), nên vòng lặp không thể
// bị trình biên dịch tối ưu thành vòng lặp rỗng.

const VERT_SRC = `#version 300 es
layout(location = 0) in vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG_SRC = `#version 300 es
precision highp float;
uniform int uLoop;
uniform float uSize;
out vec4 outColor;

void main() {
  float tid = floor(gl_FragCoord.x) + floor(gl_FragCoord.y) * uSize;
  float t = 0.0;
  for (int i = 0; i < uLoop; i++) {
    t += mod(tid, 5466587.0) * mod(tid, 6847648.0) - mod(tid, 51374684.0);
    t = t / max(mod(tid, 9769864.0), 1.0) * 6541.0;
    t = exp(t);
    t = sqrt(sqrt(sqrt(sqrt(sqrt(sqrt(t))))));
  }
  outColor = vec4(t, 0.0, 0.0, 1.0);
}
`;

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Không tạo được shader WebGL2');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? 'không rõ nguyên nhân';
    gl.deleteShader(shader);
    throw new Error(`Shader WebGL2 không biên dịch được: ${log}`);
  }
  return shader;
}

/**
 * Một "máy tính" GPU nhỏ: vẽ tam giác phủ kín vùng vẽ rồi đọc lại một pixel để buộc GPU
 * hoàn tất việc tính trước khi đo thời gian.
 */
export class GpuRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject | null;
  private readonly uLoop: WebGLUniformLocation | null;
  private readonly pixel = new Uint8Array(4);

  constructor(
    gl: WebGL2RenderingContext,
    /** Cạnh của vùng vẽ (px). Diện tích = size² texel. */
    readonly size: number,
  ) {
    this.gl = gl;
    const vertex = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    const program = gl.createProgram();
    if (!program) throw new Error('Không tạo được chương trình WebGL2');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program) ?? 'không rõ nguyên nhân';
      gl.deleteProgram(program);
      throw new Error(`Chương trình WebGL2 không liên kết được: ${log}`);
    }
    this.program = program;

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // Tam giác phủ toàn khung (diễn tích = 2, vẫn phủ trọn khung nhờ rasterizer cắt theo viewport).
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    gl.useProgram(program);
    this.uLoop = gl.getUniformLocation(program, 'uLoop');
    gl.uniform1f(gl.getUniformLocation(program, 'uSize'), size);
    gl.viewport(0, 0, size, size);
  }

  /** Số vòng lặp toán học chạy cho mỗi texel trong một khung hình. */
  setLoop(loop: number): void {
    this.gl.useProgram(this.program);
    this.gl.uniform1i(this.uLoop, loop);
  }

  /** Vẽ một khung hình rồi đồng bộ: đọc 1 pixel để chắc chắn GPU đã tính xong. */
  runFrame(): void {
    const gl = this.gl;
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.pixel);
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteProgram(this.program);
    if (this.vao) gl.deleteVertexArray(this.vao);
  }
}
