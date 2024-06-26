
@group(0) @binding(0) var<storage, read_write> image_buffer: array<vec3f>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(0) @binding(2) var<uniform> time: Time;

struct VertexOutput{
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
}

@vertex
fn vert_main(@builtin(vertex_index) vertex_index: u32) -> VertexOutput {
    let positions = array<vec2<f32>, 6>(
        vec2<f32>(1.0, 1.0),
        vec2<f32>(1.0, -1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(1.0, 1.0),
        vec2<f32>(-1.0, -1.0),
        vec2<f32>(-1.0, 1.0)
    );

    let uvs = array<vec2<f32>, 6>(
        vec2<f32>(1.0, 0.0),
        vec2<f32>(1.0, 1.0),
        vec2<f32>(0.0, 1.0),
        vec2<f32>(1.0, 0.0),
        vec2<f32>(0.0, 1.0),
        vec2<f32>(0.0, 0.0)
    );

    var output: VertexOutput;
    output.position = vec4<f32>(positions[vertex_index], 0.0, 1.0);
    output.uv = uvs[vertex_index];
    return output;
}

@fragment
fn fragment_main(frag_data: VertexOutput) -> @location(0) vec4<f32>{
    // var sample: vec4<f32> = textureSample(color_buffer, screen_sampler, fragData.uv);

    let x: u32 = u32(frag_data.uv.x * f32(camera.image_size.x));
    let y: u32 = u32(frag_data.uv.y * f32(camera.image_size.y));
    let index: u32 = x + y * u32(camera.image_size.x);
    let sample: vec3<f32> = image_buffer[index];
    let color: vec3<f32> = sample / f32(time.frame_number + 1);

    //Gamma Correction
    return vec4<f32>(sqrt(color), 1.0); 
}