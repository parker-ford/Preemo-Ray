struct Ray {
    pos: vec3<f32>, //origin
    min: f32, //distance at which intersection testing begins
    dir: vec3<f32>, //direction (normalized)
    max: f32, //distance at which intersection testing ends,
    inv_dir: vec3<f32> //precomputed for boudning box intersection testing
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

struct BVHNode {
    min: vec3<f32>,
    max: vec3<f32>,
    left_index: u32, //right index is left + 1
    first_triangle_index: u32,
    triangle_count: u32,
}

struct BVHData {
    nodes: array<BVHNode>
}

struct Mesh {
    first_triangle_index: u32,
    triangle_count: u32,
    first_bvh_index: u32,
    trs_index: u32
}

struct Scene {
    sphere_count: u32,
    renderable_count: u32,
    triangle_count: u32,
};

struct Renderable {
    mesh_index: u32,
    trs_index: u32,
    material_index: u32,
};

struct RenderableData {
    renderables: array<Renderable>
};

struct TRSData {
    trs: array<mat4x4<f32>>
}

struct SphereData {
    spheres: array<Sphere>
}

struct MaterialData {
    materials: array<Material>
}

struct TriangleData {
    triangles: array<Triangle>
}

struct MeshData {
    meshes: array<Mesh>
}

struct ScatterInfo {
    ray: Ray,
    attenuation: vec3<f32>,
}

struct Debug{
  DEBUG_0: u32, DEBUG_1: f32,DEBUG_2: f32,DEBUG_3: f32,DEBUG_4: f32,DEBUG_5: f32,DEBUG_6: f32,DEBUG_7: f32,DEBUG_8: f32,DEBUG_9: f32,DEBUG_10: f32,DEBUG_11: f32,DEBUG_12: f32,DEBUG_13: f32,DEBUG_14: f32,DEBUG_15: f32,
}

@group(0) @binding(0) var<storage, read_write> image_buffer: array<vec3f>;
@group(0) @binding(1) var<uniform> camera: Camera;
@group(0) @binding(2) var<uniform> time: Time;
@group(0) @binding(3) var<uniform> scene: Scene;
@group(0) @binding(4) var<uniform> DEBUG: Debug; 
@group(0) @binding(5) var<storage, read> sphere_data: SphereData;
@group(0) @binding(6) var<storage, read> renderable_data: RenderableData;
@group(0) @binding(7) var<storage, read> mesh_data: MeshData;
@group(0) @binding(8) var<storage, read> triangle_data: TriangleData;
@group(0) @binding(9) var<storage, read> bvh_data: BVHData;
@group(0) @binding(10) var<storage, read> trs_data: TRSData;
@group(0) @binding(11) var<storage, read> material_data: MaterialData;


var<private> debug_var: f32 = 0;
var<private> debug_var2: f32 = 0;
var<private> debug_var3: f32 = 0;
var<private> debug_vec: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);

fn traverse_bvh(mesh: Mesh, ray: Ray) -> HitInfo{

    //Create Stack
    var stack: array<vec2<u32>,32> = array<vec2<u32>,32>();
    var stack_ptr: i32 = 0;

    //Push Root Node
    stack[stack_ptr] = vec2<u32>(mesh.first_bvh_index, 0u);
    stack_ptr++;

    var light_dir: vec3<f32> = normalize(vec3<f32>(1.0, 1.0, 0.0));

    //Saftey variable to prevent infinite loop
    var safety: u32 = 0u;

    var closest_hit: HitInfo;
    closest_hit.hit = false;
    closest_hit.t = INFINITY;

    var debug_hit: HitInfo;
    debug_hit.hit = false;
    debug_hit.t = INFINITY;

    while(stack_ptr > 0 && safety < 100u){

        //Get the Node
        stack_ptr--;
        var node_data: vec2<u32> = stack[stack_ptr];
        var node_index: u32 = node_data.x;
        var current_level: u32 = node_data.y;
        var node: BVHNode = bvh_data.nodes[node_index];
        var is_leaf: bool = node.triangle_count > 0u;


        if(hit_bvh_node(node, ray).hit == false){
            continue;
        }

        if(is_leaf){
            for(var i: u32 = 0u; i < node.triangle_count; i = i + 1u){
                var triangle_index: u32 = mesh.first_triangle_index + node.first_triangle_index + i;
                var triangle: Triangle = triangle_data.triangles[triangle_index];
                var hit_info: HitInfo = hit_triangle(triangle, ray);
                if(hit_info.hit && hit_info.t < closest_hit.t){
                    closest_hit = hit_info;
                }
            }
        }
        else{
            // Push child nodes with incremented level
            stack[stack_ptr] = vec2<u32>(node.left_index, current_level + 1u);
            stack_ptr++;
            stack[stack_ptr] = vec2<u32>(node.left_index + 1u, current_level + 1u);
            stack_ptr++;
        }

        //DEBUG
        if(DEBUG.DEBUG_0 != 0){
            if(current_level == u32(DEBUG.DEBUG_1)){
                debug_hit = DEBUG_hit_bvh_node(node, ray);
                var level_seed = current_level;
                debug_vec = normalize(random_vec3(&level_seed));
                if(debug_hit.hit){
                    debug_var2 = 1.0;
                }
            }
        }

        safety = safety + 1u;
    }

    if(DEBUG.DEBUG_0 != 0){
        if(debug_var2 > 0.0){
            if(debug_hit.t > closest_hit.t){
                debug_var2 = 0.0;
            }
        }
    }

    return closest_hit;
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
    
    for(var i: u32 = 0u; i < scene.renderable_count; i = i + 1u){
        var renderable: Renderable = renderable_data.renderables[i];
        var mesh: Mesh = mesh_data.meshes[renderable.mesh_index];
        var material: Material = material_data.materials[renderable.material_index];
        var trs: mat4x4<f32> = trs_data.trs[renderable.trs_index];

        //TODO: Transform Ray


        closest_hit = traverse_bvh(mesh, ray);

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
    scatter_info.ray.inv_dir = (1.0 /scatter_info.ray.dir );
    scatter_info.attenuation = hit_info.material.attenuation;

    return scatter_info;
}

fn trace_ray(ray: Ray, state_ptr: ptr<function, u32>) -> vec3<f32> {

    var current_ray: Ray = ray;
    let max_bounces: u32 = 0u;
    var ray_color: vec3<f32> = vec3<f32>(1.0, 1.0, 1.0);
    var incoming_light: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);

    for(var i: u32 = 0u; i <= max_bounces; i = i + 1u){
        var hit_info: HitInfo = intersect_ray(current_ray);

        if(hit_info.hit){ 

            //Stop if bounce limit reached
            if(i == max_bounces){
                ray_color *= 0;
                break;
            }

            let color_from_emission: vec3<f32> = hit_info.material.emissive_color * hit_info.material.emissive_strength;

            //Stop if emissive material
            if(hit_info.material.material_flag == MATERIAL_EMISSIVE){
                ray_color *= color_from_emission;
                break; 
            }

            var scatter_info: ScatterInfo = scatter(current_ray, hit_info, state_ptr);
            current_ray = scatter_info.ray;
            let color_from_scatter: vec3<f32> = scatter_info.attenuation;
            ray_color *= scatter_info.attenuation;

        } else {
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



@compute @workgroup_size(8,8,1)
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
    ray.pos = (camera.camera_to_world_matrix * vec4<f32>(ray.pos, 1.0)).xyz;
    ray.dir = (camera.camera_to_world_matrix * vec4<f32>(ray.dir, 0.0)).xyz;
    ray.inv_dir = (1.0 / ray.dir);

    //Calculate Pixel Color
    let rays_per_pixel: u32 = 1u;
    var pixel_color: vec3<f32> = vec3<f32>(0.0, 0.0, 0.0);
    for(var i: u32 = 0u; i < rays_per_pixel; i = i + 1u){
        pixel_color += trace_ray(ray, &pixel_seed);
    }
    pixel_color /= f32(rays_per_pixel);

    //DEBUG
    if(DEBUG.DEBUG_0 != 0){
        // if(length(debug) > 0.0){
            pixel_color = debug_var2 * debug_vec + (1.0 - debug_var2) * pixel_color;
        // }
    // pixel_color = vec3<f32>(debug_var, 0, 0);
    // pixel_color = debug_vec;
    }

    //Accumulate New Pixel Value
    pixel += pixel_color;
    image_buffer[pixel_index] = pixel;

}