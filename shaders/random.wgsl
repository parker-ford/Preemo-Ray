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
