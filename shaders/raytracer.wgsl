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
    image_plane_distance: f32, //distance from camera to image plane,
    clip_near: f32, //near clipping plane
    clip_far: f32, //far clipping plane
}

struct Time {
    elapsed_time: f32,
    frame_number: u32
}

struct Sphere {
    pos: vec3<f32>,
    radius: f32,
    material_index: u32,
};

struct Triangle {
    a: vec3<f32>,
    b: vec3<f32>,
    c: vec3<f32>,
    normal_a: vec3<f32>,
    normal_b: vec3<f32>,
    normal_c: vec3<f32>,
    material_index: u32,
};

struct Scene {
    sphere_count: u32,
};

struct SphereData {
    spheres: array<Sphere>
}

struct Material {
    color: vec3<f32>,
    emissive_strength: f32,
    emissive_color: vec3<f32>,
}

struct MaterialData {
    materials: array<Material>
}

struct HitInfo {
    hit: bool,
    t: f32,
    p: vec3<f32>,
    normal: vec3<f32>,
    color: vec3<f32>,
    material: Material,
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


@group(0) @binding(0) var<storage, read_write> image_buffer: array<vec3f>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(0) @binding(2) var<uniform> time: Time;
@group(0) @binding(3) var<uniform> scene: Scene;
@group(0) @binding(4) var<storage, read> sphere_data: SphereData;
@group(0) @binding(5) var<storage, read> material_data: MaterialData;

fn pcg_hash(state_ptr: ptr<function, u32>) -> u32{
    *state_ptr = (*state_ptr) * 747796405u + 2891336453u;
    var word: u32 = (((*state_ptr) >> (((*state_ptr) >> 28u) + 4u)) ^ (*state_ptr)) * 277803737u;
    return (word >> 22u) ^ word;
}

fn normalize_u32(input: u32) -> f32 {
    return f32(input) / 4294967295.0;
}

//Returns a random float between 0 and 1 based on the current state of the seed
fn next_random(state_ptr: ptr<function, u32>) -> f32 {
    return normalize_u32(pcg_hash(state_ptr));
}

fn random_normal_distribution(state_ptr: ptr<function, u32>) -> f32 {
    let theta: f32 = 2.0 * PI * next_random(state_ptr);
    let rho: f32 = sqrt(-2.0 * log(next_random(state_ptr)));
    return rho * cos(theta);
}

fn random_point_in_circle(state_ptr: ptr<function, u32>) -> vec2<f32> {
    var theta: f32 = next_random(state_ptr) * 2.0 * PI;
    var p: vec2<f32> = vec2<f32>(cos(theta), sin(theta));
    return p * sqrt(next_random(state_ptr));
}

fn random_vec3(state_ptr: ptr<function, u32>) -> vec3<f32> {
    var x: f32 = random_normal_distribution(state_ptr);
    var y: f32 = random_normal_distribution(state_ptr);
    var z: f32 = random_normal_distribution(state_ptr);
    return vec3<f32>(x, y, z);
}

fn random_direction(state_ptr: ptr<function, u32>) -> vec3<f32> {
    return normalize(random_vec3(state_ptr) * 2.0 - 1.0);
}

fn generatePinholeRay(pixel: vec2<f32>, offset: vec2<f32>) -> Ray {

    //Random Offset
    var offset_pixel: vec2<f32> = pixel + (offset * 2.0 - 1.0);

    var tan_half_angle: f32 = tan(camera.fov_angle / 2.0);
    var aspect_scale: f32;
    if (camera.fov_direction == 0u) {
        aspect_scale = camera.image_size.x;
    } else {
        aspect_scale = camera.image_size.y;
    }
    var direction: vec3<f32> = normalize(vec3<f32>(vec2<f32>(offset_pixel.x, -offset_pixel.y) * tan_half_angle / aspect_scale, -1.0));
    
    //Create new ray at camera origin
    var ray: Ray;
    ray.pos = vec3<f32>(0.0, 0.0, 0.0);
    ray.dir = direction;
    ray.min = camera.clip_near;
    ray.max = camera.clip_far;
    return ray;
}

fn hit_sphere(sphere: Sphere, ray: Ray) -> HitInfo {
    // var oc: vec3<f32> = sphere.pos - ray.pos;
    // var a: f32 = dot(ray.dir, ray.dir);
    // var h: f32 = dot(ray.dir, oc);
    // var c: f32 = length(oc) * length(oc) - sphere.radius * sphere.radius;
    // var discriminant: f32 = h * h - a * c;

    // var hit_info: HitInfo;

    // if(discriminant < 0.0){
    //     hit_info.hit = false;
    //     return hit_info;
    // }

    // var sqrtd = sqrt(discriminant);

    // var root = (h - sqrtd) / a;
    // if(root <= ray.min || root >= ray.max){
    //     root = (h + sqrtd) / a;
    //     if(root <= ray.min || root >= ray.max){
    //         hit_info.hit = false;
    //         return hit_info;
    //     }
    // }

    // hit_info.hit = true;
    // hit_info.t = root;
    // hit_info.p = ray.pos + hit_info.t * ray.dir;


    // var outward_normal: vec3<f32> = (hit_info.p - sphere.pos) / sphere.radius;
    // var front_face: bool = dot(ray.dir, outward_normal) < 0.0;
    // if(front_face){
    //     hit_info.normal = outward_normal;
    // } else {
    //     hit_info.normal = -outward_normal;
    // }
    
    // hit_info.material = material_data.materials[sphere.material_index];

    // return hit_info;

    var oc: vec3<f32> = ray.pos - sphere.pos;
    var a: f32 = dot(ray.dir, ray.dir);
    var b: f32 = 2.0 * dot(oc, ray.dir);
    var c: f32 = dot(oc, oc) - sphere.radius * sphere.radius;
    var discriminant: f32 = b * b - 4.0 * a * c;

    var hit_info: HitInfo;

    if(discriminant >= 0.0){
        var dist: f32 = (-b - sqrt(discriminant)) / (2.0 * a);

        if(dist >= ray.min && dist <= ray.max){
            hit_info.hit = true;
            hit_info.t = dist;
            hit_info.p = ray.pos + dist * ray.dir;
            hit_info.normal = (hit_info.p - sphere.pos) / sphere.radius;
            hit_info.material = material_data.materials[sphere.material_index];
        }
    }

    return hit_info;
}

fn hit_triangle(triangle: Triangle, ray: Ray) -> HitInfo {
    let edge_ab: vec3<f32> = triangle.b - triangle.a;
    let edge_ac: vec3<f32> = triangle.c - triangle.a;
    let normal: vec3<f32> = cross(edge_ab, edge_ac);
    let ao: vec3<f32> = ray.pos - triangle.a;
    let dao: vec3<f32> = cross(ray.dir, ao);

    let det: f32 = -dot(dao, normal);
    let inv_det: f32 = 1.0 / det;

    let dist: f32 = dot(ao, normal) * inv_det;
    let u: f32 = dot(edge_ac, dao) * inv_det;
    let v: f32 = -dot(edge_ab, dao) * inv_det;
    let w: f32 = 1.0 - u - v;

    var hit_info: HitInfo;
    if(det > 0.0001 && dist >= ray.min && u >= 0.0 && v >= 0.0 && w >= 0.0){
        hit_info.hit = true;
    }
    hit_info.t = dist;
    hit_info.p = ray.pos + dist * ray.dir;
    hit_info.normal = normalize(triangle.normal_a * w + triangle.normal_b * u + triangle.normal_c * v);
    hit_info.material = material_data.materials[triangle.material_index];

    return hit_info;
}

fn environment_light(ray: Ray) -> vec3<f32>
{

    let use_environment_light: u32 = 0u;

    if(use_environment_light == 0){
        return vec3<f32>(0.0, 0.0, 0.0);
    }

    let sky_horizon_color: vec3<f32> = vec3<f32>(0.8, 0.8, 0.9);
    let sky_zenith_color: vec3<f32> = vec3<f32>(0.3, 0.5, 0.8);
    let ground_color: vec3<f32> = vec3<f32>(0.7, 0.7, 0.7);

    let sun_focus: f32 = 1000.0;
    let sun_intensity: f32 = 1.0;
    let sun_position: vec3<f32> = vec3<f32>(1.0, 0.0, 0.0);

    let sky_gradient_t: f32 = pow(smoothstep(0, 0.4, ray.dir.y), 0.35);
    let ground_to_sky_t: f32 = smoothstep(-0.01, 0.0, ray.dir.y);
    let sky_gradient: vec3<f32> = mix(sky_horizon_color, sky_zenith_color, sky_gradient_t);
    let sun: f32 = pow(max(.0, dot(ray.dir, sun_position)), sun_focus) * sun_intensity;
    // Combine ground, sky, and sun
    let composite: vec3<f32> = mix(ground_color, sky_gradient, ground_to_sky_t) + sun * f32(ground_to_sky_t >= 1);
    return composite;
}

fn intersect_ray(ray: Ray) -> HitInfo{
    var closest_hit: HitInfo;
    closest_hit.hit = false;
    closest_hit.t = INFINITY;

    for(var i: u32 = 0u; i < scene.sphere_count; i = i + 1u){
        var sphere: Sphere = sphere_data.spheres[i];
        var hit_info: HitInfo = hit_sphere(sphere, ray);
        if(hit_info.hit && hit_info.t < closest_hit.t){
            closest_hit = hit_info;
        }
    }

    return closest_hit;
}

fn trace_ray(ray: Ray, state_ptr: ptr<function, u32>) -> vec3<f32> {

    var current_ray: Ray = ray;
    let max_bounces: u32 = 10u;
    var ray_color: vec3<f32> = vec3<f32>(1.0, 1.0, 1.0);
    var incoming_light: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);

    for(var i: u32 = 0u; i <= max_bounces; i = i + 1u){
        var hit_info: HitInfo = intersect_ray(current_ray);

        if(hit_info.hit){
            //Find new ray position and direction
            current_ray.pos = hit_info.p;
            current_ray.dir = normalize(hit_info.normal + random_direction(state_ptr));

            //Calculate incoming light
            var emittedLight: vec3<f32> = hit_info.material.emissive_color * hit_info.material.emissive_strength;
            incoming_light += emittedLight * ray_color;
            ray_color *= hit_info.material.color;

        } else {
           // var a = 0.5 * (current_ray.dir.y + 1.0);
            //ray_color *= (1.0-a)*vec3<f32>(1.0, 1.0, 1.0) + a*vec3<f32>(0.5, 0.7, 1.0);
            // incoming_light += ray_color;
            incoming_light += environment_light(current_ray) * ray_color;
            break;
        }
    }

    return incoming_light;

}

@compute @workgroup_size(1,1,1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {

    //Determine Screen Position and Pixel Seed
    let screen_pos: vec2<u32> = vec2<u32>(u32(global_id.x), u32(global_id.y));
    let pixel_pos: vec2<f32> = vec2<f32>(f32(screen_pos.x), f32(screen_pos.y)) * 2.0 - camera.image_size;
    let pixel_index: u32 = screen_pos.y * u32(camera.image_size.x) + screen_pos.x;
    var<function> pixel_seed: u32 = pixel_index + time.frame_number * 902347u;

    //Generate Ray and Transform to World Space
    var ray: Ray = generatePinholeRay(pixel_pos, random_point_in_circle(&pixel_seed));
    ray.pos = (camera.camera_to_world_matrix * vec4<f32>(ray.pos, 1.0)).xyz;
    ray.dir = (camera.camera_to_world_matrix * vec4<f32>(ray.dir, 0.0)).xyz;

    //Calculate Pixel Color
    let rays_per_pixel: u32 = 1u;
    var pixel_color: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
    for(var i: u32 = 0u; i < rays_per_pixel; i = i + 1u){
        pixel_color += trace_ray(ray, &pixel_seed);
    }
    pixel_color /= f32(rays_per_pixel);


    //Store Pixel Color
    var pixel: vec3<f32> = image_buffer[pixel_index];

    if(time.frame_number == 0u){
        pixel = vec3<f32>(0.0, 0.0, 0.0);
    } 

    pixel += pixel_color;
    image_buffer[pixel_index] = pixel;


    //Combine with previous frames
    // if(time.frame_number != 1u){
    //     let frame_f32: f32 = f32(time.frame_number);
    //     let weight: f32 = 1.0 / (frame_f32 + 1.0);
    //     let old_pixel_color: vec4<f32> = textureLoad(color_buffer_read, screen_pos);
    //     pixel_color = saturate(pixel_color * weight + old_pixel_color.xyz * (1.0 - weight));
    // }

    // //Store Pixel Color
    // // if(time.frame_number < 1000u){
    //     textureStore(color_buffer, screen_pos, vec4<f32>(pixel_color, 1.0));
    // // }
}