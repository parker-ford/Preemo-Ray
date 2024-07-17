struct HitInfo {
    hit: bool,
    t: f32,
    p: vec3<f32>,
    normal: vec3<f32>,
    color: vec3<f32>,
    material: Material,
    front_face: bool,
};

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
    if(dot(ray.dir, hit_info.normal) < 0.0 || true){
        hit_info.front_face = true;
    } else {
        hit_info.front_face = false;
        hit_info.hit = false;
    }

    return hit_info;
}

fn hit_bvh_node(bvh_node: BVHNode, ray: Ray) -> HitInfo {
    var hit_info: HitInfo;

    var t_lower: vec3<f32> = (bvh_node.min - ray.pos) * ray.inv_dir; //Need to inverse?
    var t_upper: vec3<f32> = (bvh_node.max - ray.pos) * ray.inv_dir;

    var t_mins: vec4<f32> = vec4<f32>(min(t_lower, t_upper), ray.min);
    var t_maxes: vec4<f32> = vec4<f32>(max(t_lower, t_upper), ray.max);

    var t_box_min: f32 = max_component_4(t_mins);
    var t_box_max: f32 = min_component_4(t_maxes);

    if(t_box_min <= t_box_max){
        hit_info.hit = true;
    }

    return hit_info;
}