import { useEffect, useRef } from 'react'
import fragmentShader from './mesh-drift.frag.glsl?raw'

const vertexShader = `
attribute vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export function MeshDriftBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas?.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' })
    if (!canvas || !gl) return

    const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShader)
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader)
    if (!vertex || !fragment) return

    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return

    const buffer = gl.createBuffer()
    if (!buffer) return
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    gl.useProgram(program)
    const position = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    const colors = gl.getUniformLocation(program, 'u_colors[0]')
    const scene = gl.getUniformLocation(program, 'u_scene')
    const shape = gl.getUniformLocation(program, 'u_shape')
    const surface = gl.getUniformLocation(program, 'u_surface')
    const finish = gl.getUniformLocation(program, 'u_finish')
    const transform = gl.getUniformLocation(program, 'u_transform')
    const space = gl.getUniformLocation(program, 'u_space')
    const cursor = gl.getUniformLocation(program, 'u_cursor')

    gl.uniform3fv(colors, new Float32Array([
      1, 1, 1,
      0.961, 0.961, 0.961,
      0.106, 0.416, 0.655,
      0.341, 0.824, 0.957,
      1, 1, 1,
      1, 1, 1,
      1, 1, 1,
      1, 1, 1,
    ]))
    gl.uniform4f(shape, 1.3, 0.56, 0.67, 0.19)
    gl.uniform4f(surface, 2.02, 1.17, 0, 1)
    gl.uniform4f(finish, 0, 0.15, 0.007, 0.1)
    gl.uniform4f(transform, 5069, 2.72, 0.15, 0)
    gl.uniform4f(space, 0.09, 0.15, 0, 0)
    gl.uniform4f(cursor, 0, 2, 0.65, 0.46)

    let frame = 0
    let start = 0
    let stopped = false
    const draw = (now: number) => {
      if (stopped || document.hidden) return
      if (!start) start = now
      gl.uniform4f(scene, canvas.width, canvas.height, ((now - start) / 1000) * -1.37, 4)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      frame = window.requestAnimationFrame(draw)
    }
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
      }
      if (!document.hidden && !frame) frame = window.requestAnimationFrame(draw)
    }
    const visibility = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(frame)
        frame = 0
      } else if (!frame) {
        frame = window.requestAnimationFrame(draw)
      }
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    document.addEventListener('visibilitychange', visibility)
    resize()

    return () => {
      stopped = true
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      document.removeEventListener('visibilitychange', visibility)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)
    }
  }, [])

  return <canvas ref={canvasRef} className="mesh-drift-canvas" aria-hidden="true" />
}
