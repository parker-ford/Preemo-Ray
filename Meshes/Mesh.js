import { vec3, vec4 } from "gl-matrix";
import { BoundingBox } from "../BoundingBox.js";
import { Transform } from "../Transform.js";
import { BVH } from "../BVH.js";

export class Mesh {
    static triangle_size = 128
    static mesh_size = 12

    constructor(options){
        this.triangle_count = 0;
        this.triangles = [];
        this.material_id = options.material_id || 0;
        this.transform = new Transform({});
        this.bounding_box = new BoundingBox();
        this.bvh = new BVH();
        this.has_setup = false;
    }

    setup(){
        if(this.has_setup) return;
        this.transformToWorldSpace();
        this.setupBoundingBox()
        this.bvh.constructBVH(this.triangles);
        console.log(this.bvh);
        this.has_setup = true;
    }

    transformToWorldSpace(){
        this.triangles.forEach(triangle => {
                //Convert to world space. This is being done on CPU side because it simple and only will happen once for now. This prevents real-time animation. I will revisit this at a later time.
                var world_pos_a = vec4.fromValues(triangle.pos_a[0], triangle.pos_a[1], triangle.pos_a[2], 1);
                world_pos_a = vec4.transformMat4(vec4.create(), world_pos_a, this.transform.TRS);
                triangle.pos_a = vec3.fromValues(world_pos_a[0], world_pos_a[1], world_pos_a[2]);

                let world_pos_b = vec4.fromValues(triangle.pos_b[0], triangle.pos_b[1], triangle.pos_b[2], 1);
                world_pos_b = vec4.transformMat4(vec4.create(), world_pos_b, this.transform.TRS);
                triangle.pos_b = vec3.fromValues(world_pos_b[0], world_pos_b[1], world_pos_b[2]);

                let world_pos_c = vec4.fromValues(triangle.pos_c[0], triangle.pos_c[1], triangle.pos_c[2], 1);
                world_pos_c = vec4.transformMat4(vec4.create(), world_pos_c, this.transform.TRS);
                triangle.pos_c = vec3.fromValues(world_pos_c[0], world_pos_c[1], world_pos_c[2]);

                var world_normal_a = vec4.fromValues(triangle.normal_a[0], triangle.normal_a[1], triangle.normal_a[2], 0);
                world_normal_a = vec4.transformMat4(vec4.create(), world_normal_a, this.transform.TRS_I_T);
                triangle.normal_a = vec3.fromValues(world_normal_a[0], world_normal_a[1], world_normal_a[2]);

                var world_normal_b = vec4.fromValues(triangle.normal_b[0], triangle.normal_b[1], triangle.normal_b[2], 0);
                world_normal_b = vec4.transformMat4(vec4.create(), world_normal_b, this.transform.TRS_I_T);
                triangle.normal_b = vec3.fromValues(world_normal_b[0], world_normal_b[1], world_normal_b[2]);

                var world_normal_c = vec4.fromValues(triangle.normal_c[0], triangle.normal_c[1], triangle.normal_c[2], 0);
                world_normal_c = vec4.transformMat4(vec4.create(), world_normal_c, this.transform.TRS_I_T);
                triangle.normal_c = vec3.fromValues(world_normal_c[0], world_normal_c[1], world_normal_c[2]);
        })
    }

    setupBoundingBox(){
        this.triangles.forEach(triangle => {
            this.bounding_box.addTriangle(triangle);
        });
    }

    getSize() {
        return this.triangle_count * Mesh.triangle_size;
    }

    update(){
        this.transform.update();
    }
}