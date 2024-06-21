// const INFINITY: f32 = bitcast<f32>(0x7F800000u);
const INFINITY: f32 = 3.402823466e+38;

struct Ray {
    pos: vec3<f32>, //origin
    min: f32, //distance at which intersection testing begins
    dir: vec3<f32>, //direction (normalized)
    max: f32, //distance at which intersection testing ends
};


@group(0) @binding(0) var color_buffer: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(1) var<uniform> camera_to_world_matrix: mat4x4<f32>;


@compute @workgroup_size(1,1,1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {

  let screen_size: vec2<u32> = textureDimensions(color_buffer);  
  let screen_pos: vec2<u32> = vec2<u32>(u32(global_id.x), u32(global_id.y));
  let uv: vec2<f32> = vec2<f32>(f32(screen_pos.x) / f32(screen_size.x), 1.0 - (f32(screen_pos.y) / f32(screen_size.y)));


  var ray: Ray;
  ray.pos = vec3<f32>(0.0, 0.0, 0.0);
  ray.dir = vec3<f32>(uv.x * 2.0 - 1.0, uv.y * 2.0 - 1.0, -1.0);
  ray.dir = normalize(ray.dir);
  ray.min = 0.0;
  ray.max = INFINITY;


  var pixel_color: vec3<f32> = vec3<f32>(ray.dir.xyz);

  textureStore(color_buffer, screen_pos, vec4<f32>(ray.dir.xy, 0.0, 1.0));
}