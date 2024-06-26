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