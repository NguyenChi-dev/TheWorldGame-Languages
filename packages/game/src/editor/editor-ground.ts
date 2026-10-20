import { Color3, MeshBuilder, ShaderMaterial, type Scene } from "@babylonjs/core";

/** Keep cells readable at the camera target without changing the actual snap distance. */
export function gridStepForView(radius: number, fov: number, viewportHeight: number): number {
  const metresPerPixel = (2 * radius * Math.tan(fov / 2)) / Math.max(1, viewportHeight);
  const wanted = Math.max(1, metresPerPixel * 28);
  const decade = 10 ** Math.floor(Math.log10(wanted));
  return ([1, 2, 5, 10].find((step) => step * decade >= wanted) ?? 10) * decade;
}

/** One opaque ground draw call: no line meshes, z-fighting, textures, or lighting blowout. */
export function createEditorGround(scene: Scene) {
  const mesh = MeshBuilder.CreateGround("editor-ground", { width: 1, height: 1 }, scene);
  const material = new ShaderMaterial(
    "editor-ground-material",
    scene,
    {
      vertexSource: `
        precision highp float;
        attribute vec3 position;
        uniform mat4 world;
        uniform mat4 worldViewProjection;
        varying vec2 groundPosition;
        void main() {
          groundPosition = (world * vec4(position, 1.0)).xz;
          gl_Position = worldViewProjection * vec4(position, 1.0);
        }
      `,
      fragmentSource: `
        #extension GL_OES_standard_derivatives : enable
        precision highp float;
        varying vec2 groundPosition;
        uniform vec3 groundColor;
        uniform float gridStep;
        uniform float gridVisible;

        float gridLine(vec2 point, float spacing) {
          vec2 cell = point / spacing;
          vec2 footprint = max(fwidth(cell), vec2(0.0001));
          vec2 distanceToLine = abs(fract(cell + 0.5) - 0.5) / footprint;
          vec2 line = 1.0 - smoothstep(vec2(0.45), vec2(1.25), distanceToLine);
          // Suppress subpixel cells at shallow angles instead of producing moire.
          line *= 1.0 - smoothstep(vec2(0.12), vec2(0.5), footprint);
          return max(line.x, line.y);
        }
        void main() {
          vec3 base = groundColor * 0.72;
          float minor = gridLine(groundPosition, gridStep) * 0.13;
          float major = gridLine(groundPosition, gridStep * 5.0) * 0.24;
          vec3 color = mix(base, vec3(0.77, 0.84, 0.87), max(minor, major) * gridVisible);
          vec2 axis = 1.0 - smoothstep(vec2(0.5), vec2(1.4),
            abs(groundPosition) / max(fwidth(groundPosition), vec2(0.0001)));
          color = mix(color, vec3(0.76, 0.35, 0.40), axis.y * 0.65 * gridVisible);
          color = mix(color, vec3(0.34, 0.54, 0.79), axis.x * 0.65 * gridVisible);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    },
    {
      attributes: ["position"],
      uniforms: ["world", "worldViewProjection", "groundColor", "gridStep", "gridVisible"],
    },
  );
  material.setColor3("groundColor", Color3.FromHexString("#7f9c83"));
  material.setFloat("gridStep", 1);
  material.setFloat("gridVisible", 1);
  mesh.material = material;
  mesh.metadata = { editorGround: true };
  return {
    mesh,
    setColor: (color: string) => material.setColor3("groundColor", Color3.FromHexString(color)),
    setStep: (step: number) => material.setFloat("gridStep", step),
    setGrid: (visible: boolean) => material.setFloat("gridVisible", visible ? 1 : 0),
  };
}
