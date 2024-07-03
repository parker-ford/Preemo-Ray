const INFINITY: f32 = 3.402823466e+38;
const PI: f32 = 3.14159265359;

const MATERIAL_LAMBERTIAN: u32 = 0u;
const MATERIAL_METAL: u32 = 1u;
const MATERIAL_DIELECTRIC: u32 = 2u;

struct Ray {
    pos: vec3<f32>, //origin
    min: f32, //distance at which intersection testing begins
    dir: vec3<f32>, //direction (normalized)
    max: f32, //distance at which intersection testing ends
};

struct Sphere {
    pos: vec3<f32>, //Position in world space
    radius: f32, //Radius in meters
    material_index: u32, //Index into material array
};

struct Triangle {
    pos_a: vec3<f32>,
    pos_b: vec3<f32>,
    pos_c: vec3<f32>,
    normal_a: vec3<f32>,
    normal_b: vec3<f32>,
    normal_c: vec3<f32>,
    material_index: u32,
    uv_a: vec2<f32>,
    uv_b: vec2<f32>,
    uv_c: vec2<f32>,
};

struct Scene {
    sphere_count: u32,
    triangle_count: u32,
};

struct SphereData {
    spheres: array<Sphere>
}

struct Material {
    attenuation: vec3<f32>,
    metalic_fuzz: f32,
    material_flag: u32,
    refractive_index: f32,
}

struct MaterialData {
    materials: array<Material>
}

struct TriangleData {
    triangles: array<Triangle>
}

struct HitInfo {
    hit: bool,
    t: f32,
    p: vec3<f32>,
    normal: vec3<f32>,
    color: vec3<f32>,
    material: Material,
    front_face: bool,
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
@group(0) @binding(6) var<storage, read> triangle_data: TriangleData;

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
    hit_info.front_face = dot(ray.dir, outward_normal) < 0.0;
    if(hit_info.front_face){
        hit_info.normal = outward_normal;
    } else {
        hit_info.normal = -outward_normal;
    }
    
    hit_info.material = material_data.materials[sphere.material_index];

    return hit_info;

}

fn hit_triangle(triangle: Triangle, ray: Ray) -> HitInfo {

    var hit_info: HitInfo;
    let edge_ab: vec3<f32> = triangle.pos_b - triangle.pos_a;
    let edge_ac: vec3<f32> = triangle.pos_c - triangle.pos_a;
    let cross_ac: vec3<f32> = cross(ray.dir, edge_ac);
    let det: f32 = dot(edge_ab, cross_ac);

    //Check if parallel
    if(det > -0.0001 && det < 0.0001){
        hit_info.hit = false;
        return hit_info;
    }
    
    let inv_det: f32 = 1.0 / det;
    let s: vec3<f32> = ray.pos - triangle.pos_a;
    let u: f32 = dot(s, cross_ac) * inv_det;

    if(u < 0.0 || u > 1.0){
        hit_info.hit = false;
        return hit_info;
    }

    let cross_ab: vec3<f32> = cross(s, edge_ab);
    let v: f32 = dot(ray.dir, cross_ab) * inv_det;

    if(v < 0.0 || u + v > 1.0){
        hit_info.hit = false;
        return hit_info;
    }

    let t: f32 = dot(edge_ac, cross_ab) * inv_det;

    if(t > ray.min && t < ray.max){
        hit_info.hit = true;
    } else {
        hit_info.hit = false;
        return hit_info;
    }

    let w: f32 = 1.0 - u - v;

    hit_info.t = t;
    hit_info.p = ray.pos + t * ray.dir;
    hit_info.normal = normalize(triangle.normal_a * w + triangle.normal_b * u + triangle.normal_c * v);
    hit_info.material = material_data.materials[triangle.material_index];

    //Only Show Front Face. TODO: Make this an option
    if(dot(ray.dir, hit_info.normal) < 0.0){
        hit_info.front_face = true;
    } else {
        hit_info.front_face = false;
        hit_info.hit = false;
    }

    return hit_info;
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

    for(var i: u32 = 0u; i < scene.triangle_count; i = i + 1u){
        var triangle: Triangle = triangle_data.triangles[i];
        var hit_info: HitInfo = hit_triangle(triangle, ray);
        if(hit_info.hit && hit_info.t < closest_hit.t){
            closest_hit = hit_info;
        }
    }

    return closest_hit;
}

fn reflectance(cosine: f32, refractive_index: f32) -> f32 {
    // Use Schlick's approximation for reflectance.
    var r0: f32 = (1.0 - refractive_index) / (1.0 + refractive_index);
    r0 = r0 * r0;
    return r0 + (1.0 - r0) * pow((1.0 - cosine), 5.0);
}

fn scatter(ray: Ray, hit_info: HitInfo, state_ptr: ptr<function, u32>) -> ScatterInfo{

    var scatter_info: ScatterInfo;

    var scatter_direction: vec3<f32> = hit_info.normal;

    switch hit_info.material.material_flag {
        case MATERIAL_LAMBERTIAN: {
            scatter_direction = hit_info.normal + random_direction(state_ptr);
            break;
        }
        case MATERIAL_METAL: {
            var reflected_direction: vec3<f32> = reflect(ray.dir, hit_info.normal);
            scatter_direction = reflected_direction + (hit_info.material.metalic_fuzz * random_direction(state_ptr));
            break;
        }
        case MATERIAL_DIELECTRIC: {


            var ri: f32 = 0;
            if(hit_info.front_face){
                ri = 1.0 / hit_info.material.refractive_index;
            } else {
                ri = hit_info.material.refractive_index;
            }
            let cos_theta: f32 = min(dot(-ray.dir, hit_info.normal), 1.0);
            let sin_theta: f32 = sqrt(1.0 - cos_theta * cos_theta);

            if(ri * sin_theta > 1.0 || reflectance(cos_theta, ri) > next_random(state_ptr)){
                //Must Reflect
                scatter_direction = reflect(ray.dir, hit_info.normal);
            }
            else{
                //Can Refract
                scatter_direction = refract(ray.dir, hit_info.normal, ri);
            }
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
    let max_bounces: u32 = 5u;
    var ray_color: vec3<f32> = vec3<f32>(1.0, 1.0, 1.0);
    var incoming_light: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);

    for(var i: u32 = 0u; i <= max_bounces; i = i + 1u){
        var hit_info: HitInfo = intersect_ray(current_ray);

        if(hit_info.hit){ 
            var scatter_info: ScatterInfo = scatter(current_ray, hit_info, state_ptr);
            current_ray = scatter_info.ray;
            ray_color *= scatter_info.attenuation;

        } else {
            //var a = 0.5 * (current_ray.dir.y + 1.0);
            //ray_color *= (1.0-a)*vec3<f32>(1.0, 1.0, 1.0) + a*vec3<f32>(0.5, 0.7, 1.0);
            // ray_color *= vec3<f32>(0.0, 0.0, 0.0);
            ray_color *= camera.background_color;
            break;
        }
    }

    return ray_color;
}

fn generatePinholeRay(pixel: vec2<f32>, state_ptr: ptr<function, u32>) -> Ray {

    //Random Offset
    // let offset: vec2<f32> = random_point_in_circle(state_ptr);
    let offset: vec2<f32> = random_vec2(state_ptr);
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

fn generateThinLensRay(pixel: vec2<f32>, state_ptr: ptr<function, u32>) -> Ray{
    var pinhole_ray: Ray = generatePinholeRay(pixel, state_ptr);

    // let lens_offset: vec2<f32> = random_point_in_circle(state_ptr) * (camera.lens_focal_length / (2.0 * camera.fstop));
    let lens_offset: vec2<f32> = random_vec2(state_ptr);

    let theta: f32 = lens_offset.x * 2.0 * PI;
    let radius: f32 = lens_offset.y; 

    let u: f32 = cos(theta) * sqrt(radius);
    let v: f32 = sin(theta) * sqrt(radius);  

    let focus_plane: f32 = (camera.image_plane_distance * camera.lens_focal_length) / (camera.image_plane_distance - camera.lens_focal_length);
    let focus_point: vec3<f32> = pinhole_ray.dir * (focus_plane / dot(pinhole_ray.dir, vec3<f32>(0.0, 0.0, -1.0)));

    let circle_of_confusion_radius = camera.focal_length / (2.0 * camera.fstop);

    let origin: vec3<f32> = vec3<f32>(1.0, 0.0, 0.0) * (u * circle_of_confusion_radius) + vec3<f32>(0.0, 1.0, 0.0) * (v * circle_of_confusion_radius);

    var ray: Ray;
    ray.pos = origin;
    ray.dir = normalize(focus_point - origin);
    ray.min = camera.clip_near;
    ray.max = camera.clip_far;
    return ray;
}



@compute @workgroup_size(1,1,1)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {



    //Determine Screen Position and Pixel Seed
    let screen_pos: vec2<u32> = vec2<u32>(u32(global_id.x), u32(global_id.y));
    let pixel_pos: vec2<f32> = vec2<f32>(f32(screen_pos.x), f32(screen_pos.y)) * 2.0 - camera.image_size;
    let pixel_index: u32 = screen_pos.y * u32(camera.image_size.x) + screen_pos.x;
    var<function> pixel_seed: u32 = pixel_index + time.frame_number * 902347u;

    //Retrieve Stored Pixel Value
    var pixel: vec3<f32> = image_buffer[pixel_index];

    //Clear Pixel on Frame Reset
    if(time.frame_number == 0u){
        pixel = vec3<f32>(0.0, 0.0, 0.0);
    }

    // if(next_random(&pixel_seed) < 0.0){
    //     pixel += pixel / f32(time.frame_number + 1);
    //     image_buffer[pixel_index] = pixel;
    //     return;
    // } 

    //Generate Ray and Transform to World Space
    var ray: Ray = generatePinholeRay(pixel_pos, &pixel_seed);
    // var ray: Ray = generateThinLensRay(pixel_pos, &pixel_seed);
    ray.pos = (camera.camera_to_world_matrix * vec4<f32>(ray.pos, 1.0)).xyz;
    ray.dir = (camera.camera_to_world_matrix * vec4<f32>(ray.dir, 0.0)).xyz;

    //Calculate Pixel Color
    let rays_per_pixel: u32 = 1u;
    var pixel_color: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
    for(var i: u32 = 0u; i < rays_per_pixel; i = i + 1u){
        pixel_color += trace_ray(ray, &pixel_seed);
    }
    pixel_color /= f32(rays_per_pixel);

    //Accumulate New Pixel Value
    pixel += pixel_color;
    image_buffer[pixel_index] = pixel;

}