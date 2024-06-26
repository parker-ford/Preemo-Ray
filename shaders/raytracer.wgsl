const INFINITY: f32 = 3.402823466e+38;
const PI: f32 = 3.14159265359;

const MATERIAL_LAMBERTIAN: u32 = 0u;
const MATERIAL_METAL: u32 = 1u;

struct Ray {
    pos: vec3<f32>, //origin
    min: f32, //distance at which intersection testing begins
    dir: vec3<f32>, //direction (normalized)
    max: f32, //distance at which intersection testing ends
};

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
    attenuation: vec3<f32>,
    metalic_fuzz: f32,
    material_flag: u32,
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

struct ScatterInfo {
    ray: Ray,
    attenuation: vec3<f32>,
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


@group(0) @binding(0) var<storage, read_write> image_buffer: array<vec3f>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(0) @binding(2) var<uniform> time: Time;
@group(0) @binding(3) var<uniform> scene: Scene;
@group(0) @binding(4) var<storage, read> sphere_data: SphereData;
@group(0) @binding(5) var<storage, read> material_data: MaterialData;

fn hit_sphere(sphere: Sphere, ray: Ray) -> HitInfo {
    var oc: vec3<f32> = sphere.pos - ray.pos;
    var a: f32 = dot(ray.dir, ray.dir);
    var h: f32 = dot(ray.dir, oc);
    var c: f32 = length(oc) * length(oc) - sphere.radius * sphere.radius;
    var discriminant: f32 = h * h - a * c;

    var hit_info: HitInfo;

    if(discriminant < 0.0){
        hit_info.hit = false;
        return hit_info;
    }

    var sqrtd = sqrt(discriminant);

    var root = (h - sqrtd) / a;
    if(root <= ray.min || root >= ray.max){
        root = (h + sqrtd) / a;
        if(root <= ray.min || root >= ray.max){
            hit_info.hit = false;
            return hit_info;
        }
    }

    hit_info.hit = true;
    hit_info.t = root;
    hit_info.p = ray.pos + hit_info.t * ray.dir;

    var outward_normal: vec3<f32> = (hit_info.p - sphere.pos) / sphere.radius;
    var front_face: bool = dot(ray.dir, outward_normal) < 0.0;
    if(front_face){
        hit_info.normal = outward_normal;
    } else {
        hit_info.normal = -outward_normal;
    }
    
    hit_info.material = material_data.materials[sphere.material_index];

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

fn environment_light(ray: Ray) -> vec3<f32> {

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

fn scatter(ray: Ray, hit_info: HitInfo, state_ptr: ptr<function, u32>) -> ScatterInfo{

    var scatter_info: ScatterInfo;

    var scatter_direction: vec3<f32> = hit_info.normal;

    switch hit_info.material.material_flag {
        case MATERIAL_LAMBERTIAN: {
            scatter_direction = normalize(hit_info.normal + random_direction(state_ptr));
            break;
        }
        case MATERIAL_METAL: {
            var reflected_direction: vec3<f32> = reflect(ray.dir, hit_info.normal);
            scatter_direction = normalize(reflected_direction + (hit_info.material.metalic_fuzz * random_direction(state_ptr)));
            break;
        }
        default: {
          break;
        }
    }

    //Catch near zero scatter direction
    if(length(scatter_direction) < 1e-8){
        scatter_direction = hit_info.normal;
    }

    //Setup Scattered Ray
    scatter_info.ray = ray;
    scatter_info.ray.pos = hit_info.p;
    scatter_info.ray.dir = scatter_direction;
    scatter_info.attenuation = hit_info.material.attenuation;

    return scatter_info;
}

fn trace_ray(ray: Ray, state_ptr: ptr<function, u32>) -> vec3<f32> {

    var current_ray: Ray = ray;
    let max_bounces: u32 = 10u;
    var ray_color: vec3<f32> = vec3<f32>(1.0, 1.0, 1.0);
    var incoming_light: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);

    for(var i: u32 = 0u; i <= max_bounces; i = i + 1u){
        var hit_info: HitInfo = intersect_ray(current_ray);

        if(hit_info.hit){ 
            var scatter_info: ScatterInfo = scatter(current_ray, hit_info, state_ptr);
            current_ray = scatter_info.ray;
            ray_color *= scatter_info.attenuation;

        } else {
            var a = 0.5 * (current_ray.dir.y + 1.0);
            ray_color *= (1.0-a)*vec3<f32>(1.0, 1.0, 1.0) + a*vec3<f32>(0.5, 0.7, 1.0);
            break;
        }
    }

    return ray_color;
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

    //Retrieve Stored Pixel Value
    var pixel: vec3<f32> = image_buffer[pixel_index];

    //Clear Pixel on Frame Reset
    if(time.frame_number == 0u){
        pixel = vec3<f32>(0.0, 0.0, 0.0);
    } 

    //Accumulate New Pixel Value
    pixel += pixel_color;
    image_buffer[pixel_index] = pixel;



}