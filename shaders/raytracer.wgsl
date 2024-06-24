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

struct Time {
    elapsed_time: f32,
    frame_number: u32
}

struct Sphere {
    pos: vec3<f32>,
    radius: f32,
    color: vec3<f32>,
};

struct Scene {
    sphere_count: u32,
};

struct SphereData {
    spheres: array<Sphere>
}


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


// @group(0) @binding(0) var color_buffer: texture_storage_2d<rgba8unorm, read>;
@group(0) @binding(0) var color_buffer: texture_storage_2d<rgba8unorm, write>;
@group(0) @binding(1) var color_buffer_read: texture_storage_2d<rgba8unorm, read>;
@group(0) @binding(2) var<uniform> camera: Camera;
@group(0) @binding(3) var<uniform> time: Time;
@group(0) @binding(4) var<uniform> scene: Scene;
@group(0) @binding(5) var<storage, read> sphere_data: SphereData;

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

fn generateLensOffset(pos: vec2<u32>) -> vec2<f32> {
    var u: f32 = random_uniform(pos, 0 + u32(time.elapsed_time * 1000.0));
    var v: f32 = random_uniform(pos, 1234 + u32(time.elapsed_time * 1000.0));
    return vec2<f32>(u, v);
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
    ray.min = 0;
    ray.max = INFINITY;
    return ray;
}

fn hit_sphere(sphere: Sphere, ray: Ray) -> f32 {
    var oc: vec3<f32> = sphere.pos - ray.pos;
    var a: f32 = 1.0;
    var h: f32 = dot(ray.dir, oc);
    var c: f32 = length(oc) * length(oc) - sphere.radius * sphere.radius;
    var discriminant: f32 = h * h - a * c;

    if(discriminant < 0.0){
        return -1.0;
    }
    else{
        return (h - sqrt(discriminant)) / a;
    }
}

fn ray_color(ray: Ray) -> vec3<f32> {
    var a = 0.5 * (ray.dir.y + 1.0);
    return (1.0-a)*vec3<f32>(1.0, 1.0, 1.0) + a*vec3<f32>(0.5, 0.7, 1.0);
}

@compute @workgroup_size(1,1,1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {

    let screen_pos: vec2<u32> = vec2<u32>(u32(global_id.x), u32(global_id.y));
    let pixel: vec2<f32> = vec2<f32>(f32(screen_pos.x), f32(screen_pos.y)) * 2.0 - camera.image_size;
    let uv: vec2<f32> = vec2<f32>(f32(screen_pos.x) / f32(camera.image_size.x), (f32(screen_pos.y) / f32(camera.image_size.y)));

    var ray: Ray = generatePinholeRay(pixel);

    ray.pos = (camera.camera_to_world_matrix * vec4<f32>(ray.pos, 1.0)).xyz;
    ray.dir = (camera.camera_to_world_matrix * vec4<f32>(ray.dir, 0.0)).xyz;

    var sphere: Sphere = sphere_data.spheres[0];
    // sphere.pos = vec3<f32>(0.0, 0.0, 5.0);
    // sphere.radius = 1.0;

    // var pixel_color: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
    var pixel_color: vec3<f32> = ray_color(ray);
    var t: f32 = hit_sphere(sphere, ray);
    if(t > 0.0){
        var p: vec3<f32> = ray.pos + t * ray.dir;
        var normal: vec3<f32> = normalize(p - sphere.pos);
        pixel_color = 0.5 * vec3<f32>(normal.x + 1.0, normal.y + 1.0, (1.0 - normal.z) + 1.0);
    }

    // var ray_to_sphere: vec3<f32> = sphere.pos - ray.pos;
    // var t: f32 = dot(ray_to_sphere, ray.dir);
    // if(length(ray.pos + t * ray.dir - sphere.pos) < sphere.radius){
    //     pixel_color = vec3<f32>(1.0, 0.0, 0.0);
    // }

    if(time.frame_number != 0u){
        let frame_f32: f32 = f32(time.frame_number);
        let weight: f32 = 1.0 / frame_f32;
        let old_pixel_color: vec4<f32> = textureLoad(color_buffer_read, screen_pos);
        pixel_color = pixel_color * weight + old_pixel_color.xyz * (1.0 - weight);
    }


    textureStore(color_buffer, screen_pos, vec4<f32>(pixel_color, 1.0));
}