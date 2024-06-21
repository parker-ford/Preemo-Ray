// const INFINITY: f32 = bitcast<f32>(0x7F800000u);
const INFINITY: f32 = 3.402823466e+38;
const PI: f32 = 3.14159265359;

struct Ray {
    pos: vec3<f32>, //origin
    min: f32, //distance at which intersection testing begins
    dir: vec3<f32>, //direction (normalized)
    max: f32, //distance at which intersection testing ends
};

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
    image_plane_distance: f32, //distance from camera to image plane
}

struct Sphere {
    pos: vec3<f32>,
    radius: f32,
};


//Hardcoded subpixel offsets for super sampling according to DirectX MSAA for 1,2,4,8,16 samples
//TODO: Look into 2,3 Halton sequence for desired number of sample offsets
const s1: array<vec2<f32>, 1> = array<vec2<f32>, 1>(vec2<f32>(0.5, 0.5));
const s2: array<vec2<f32>, 2> = array<vec2<f32>, 2>(vec2<f32>(0.25, 0.25), vec2<f32>(0.75, 0.75));
const s4: array<vec2<f32>, 4> = array<vec2<f32>, 4>(vec2<f32>(0.375, 0.125), vec2<f32>(0.875, 0.375), 
                                                    vec2<f32>(0.625, 0.875), vec2<f32>(0.125, 0.625));
const s8: array<vec2<f32>, 8> = array<vec2<f32>, 8>(vec2<f32>(0.5625, 0.6875), vec2<f32>(0.4375, 0.3125), 
                                                    vec2<f32>(0.8125, 0.4375), vec2<f32>(0.3125, 0.8125),
                                                    vec2<f32>(0.1875, 0.1875), vec2<f32>(0.0625, 0.5625),
                                                    vec2<f32>(0.6875, 0.0625), vec2<f32>(0.9375, 0.9375));
const s16: array<vec2<f32>, 16> = array<vec2<f32>, 16>(vec2<f32>(0.5625, 0.4375), vec2<f32>(0.4375, 0.6875),
                                                    vec2<f32>(0.3125, 0.375), vec2<f32>(0.75, 0.5625),
                                                    vec2<f32>(0.1875, 0.625), vec2<f32>(0.625, 0.1875),
                                                    vec2<f32>(0.1875, 0.3125), vec2<f32>(0.6875, 0.8125),
                                                    vec2<f32>(0.375, 0.125), vec2<f32>(0.5, 0.9375),
                                                    vec2<f32>(0.25, 0.875), vec2<f32>(0.125, 0.25),
                                                    vec2<f32>(0.0, 0.5), vec2<f32>(0.9375, 0.75),
                                                    vec2<f32>(0.875, 0.0625), vec2<f32>(0.0625, 0.0));


@group(0) @binding(0) var color_buffer: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(0) @binding(2) var<uniform> time: f32;

fn pcg_hash(input: u32) -> u32{
    var state: u32 = input;
    var word: u32 = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

fn normalize_u32(input: u32) -> f32 {
    return f32(input) / 4294967295.0;
}

fn pos_to_seed(pos: vec2<u32>) -> u32 {
    let seed1: u32 = pos.x * 2654435761u;
    let seed2: u32 = pos.y * 2246822519u;
    return (seed1 + seed2);
    //return (seed1 ^ (seed2 << 16u)) | (seed2 >> 16u);
}

fn random_uniform(screen_pos: vec2<u32>, offset: u32) -> f32{
    let seed: u32 = pos_to_seed(screen_pos);
    return normalize_u32(pcg_hash(seed + offset));
}


fn generatePinholeRay(pixel: vec2<f32>) -> Ray {
    var tan_half_angle: f32 = tan(camera.fov_angle / 2.0);
    var aspect_scale: f32;
    if (camera.fov_direction == 0u) {
        aspect_scale = camera.image_size.x;
    } else {
        aspect_scale = camera.image_size.y;
    }
    // var direction: vec3<f32> = normalize(vec3<f32>( vec2<f32>(pixel.x, -pixel.y), -1.0));
    var direction: vec3<f32> = normalize(vec3<f32>( vec2<f32>(pixel.x, -pixel.y) * tan_half_angle / aspect_scale, -1.0));
    
    var ray: Ray;
    ray.pos = vec3<f32>(0.0, 0.0, 0.0);
    ray.dir = direction;
    ray.min = 0.0;
    ray.max = INFINITY;
    return ray;
}

fn generateLensOffset(pos: vec2<u32>) -> vec2<f32> {
    var u: f32 = random_uniform(pos, 0 + u32(time * 1000.0));
    var v: f32 = random_uniform(pos, 1234 + u32(time * 1000.0));
    return vec2<f32>(u, v);

    // let aperture_diameter = camera.lens_focal_length / camera.fstop;
    // let aperture_radius = aperture_diameter / 2.0;

    // var r: f32 = sqrt(u) * aperture_radius; // Scale by aperture radius
    // var theta: f32 = v * 2.0 * PI;

    // var x: f32 = r * cos(theta);
    // var y: f32 = r * sin(theta);

    // return vec2<f32>(x, y);
}


fn generateThinLensRay(pixel: vec2<f32>, lens_offset: vec2<f32>) -> Ray {
    var pinhole_ray: Ray = generatePinholeRay(pixel);

    var theta: f32 = lens_offset.x * 2.0 * PI;
    var radius: f32 = lens_offset.y;

    var u: f32 = cos(theta) * sqrt(radius);
    var v: f32 = sin(theta) * sqrt(radius);

    var focal_plane: f32 = (camera.image_plane_distance * camera.lens_focal_length) / (camera.image_plane_distance - camera.lens_focal_length);
    var focal_point: vec3<f32> = pinhole_ray.dir * (focal_plane / dot(pinhole_ray.dir, vec3<f32>(0.0, 0.0, -1.0)));

    //lens focal length vs focal length?
    var circle_of_confusion_radius: f32 = camera.lens_focal_length / (2.0 * camera.fstop);


    var origin: vec3<f32> = vec3<f32>(1.0, 0.0, 0.0) * (u * circle_of_confusion_radius) + vec3<f32>(0.0, 1.0, 0.0) * (v * circle_of_confusion_radius);

    var direction: vec3<f32> = normalize(focal_point - origin);

    var ray: Ray;
    ray.pos = origin;
    ray.dir = direction;
    // ray.min = 0.0;
    ray.min = 0;
    ray.max = INFINITY;
    return ray;
}




@compute @workgroup_size(1,1,1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {

    let screen_pos: vec2<u32> = vec2<u32>(u32(global_id.x), u32(global_id.y));
    let pixel: vec2<f32> = vec2<f32>(f32(screen_pos.x), f32(screen_pos.y)) * 2.0 - camera.image_size;
    // let uv: vec2<f32> = vec2<f32>(f32(screen_pos.x) / f32(camera.image_size.x), 1.0 - (f32(screen_pos.y) / f32(camera.image_size.y)));
    let uv: vec2<f32> = vec2<f32>(f32(screen_pos.x) / f32(camera.image_size.x), (f32(screen_pos.y) / f32(camera.image_size.y)));

    // var ray: Ray = generatePinholeRay(pixel);

    var lens_offset: vec2<f32> = generateLensOffset(screen_pos);
    var ray: Ray = generateThinLensRay(pixel, lens_offset);

    ray.pos = (camera.camera_to_world_matrix * vec4<f32>(ray.pos, 1.0)).xyz;
    ray.dir = (camera.camera_to_world_matrix * vec4<f32>(ray.dir, 0.0)).xyz;

    
    //DEBUG Direction
    // var pixel_color: vec3<f32> = vec3<f32>(ray.min);



    var sphere: Sphere;
    sphere.pos = vec3<f32>(0.0, 0.0, 5.0);
    sphere.radius = 1.0;

    var pixel_color: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);

    var ray_to_sphere: vec3<f32> = sphere.pos - ray.pos;
    var t: f32 = dot(ray_to_sphere, ray.dir);
    if(length(ray.pos + t * ray.dir - sphere.pos) < sphere.radius){
        pixel_color = vec3<f32>(1.0, 0.0, 0.0);
    }



    textureStore(color_buffer, screen_pos, vec4<f32>(pixel_color, 1.0));
}