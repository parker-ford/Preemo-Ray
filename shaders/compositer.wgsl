struct Camera {
    camera_to_world_matrix: mat4x4<f32>, //camera to world matrix
    fov_angle: f32, //edge to eedge field of view angle in radians
    fov_direction: u32, //0 = horizontal, 1 = vertical 2 = diagonal
    image_size: vec2<f32>, //stored as float to avoid conversions
    panini_distance: f32, //center of projection from cylinder to plane
    panini_vertical_compression: f32, //0-1 value to force straightening of horizontal lines. 0 = no straightening 1 = full straightening
    camera_fov_distance: f32, //scalar field of view in m, used for orthographic projection
    lens_focal_length: f32, //lens focal length in m
    fstop: f32, //ratio of focal legnth to apeture diameter,
    image_plane_distance: f32, //distance from camera to image plane,
    clip_near: f32, //near clipping plane
    clip_far: f32, //far clipping plane
}

struct Time {
    elapsed_time: f32,
    frame_number: u32
}

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