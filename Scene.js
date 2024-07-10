
import { Sphere } from './Sphere.js';
import { Material } from './Material.js';
import { Mesh } from './Meshes/Mesh.js';
import { vec3, vec4 } from 'gl-matrix';
import { BoundingBox } from './BoundingBox.js';

export class Scene {

    constructor() {
        this.objects = [];
        this.parameters_updated = false;
        this.has_setup_buffers = false;

        //Spheres
        this.spheres = [];
        this.spheres_count = 0;
        this.spheres_data = new ArrayBuffer(0);
        this.sphere_size = 32;

        //Materials
        this.materials = [];
        this.materials_count = 0;
        this.materials_data = new ArrayBuffer(0);
        // this.material_size = 32;

        //Meshes
        this.meshes = [];
        this.meshes_count = 0;
        this.meshes_data = new ArrayBuffer(0);

        //Triangles
        this.triangle_count = 0;
        this.triangles_data = new ArrayBuffer(0);

        //Bounding Box
        this.bounding_box_data = new ArrayBuffer(0);
        
        //Debug
        this.print = false;
    }

    add(object) {
        this.objects.push(object);
        if(object instanceof Sphere){
            this.spheres.push(object);
            this.spheres_data = new ArrayBuffer(this.spheres_data.byteLength + this.sphere_size);
            this.spheres_count++;
        }
        if(object instanceof Material){
            this.materials.push(object);
            this.materials_data = new ArrayBuffer(this.materials_data.byteLength + Material.size);
            this.materials_count++;
        }
        if(object instanceof Mesh){

            //Mesh
            this.meshes.push(object);
            this.meshes_data = new ArrayBuffer(this.meshes_data.byteLength + Mesh.mesh_size);
            this.meshes_count++;
            
            //Triangles
            this.triangles_data = new ArrayBuffer(this.triangles_data.byteLength + object.getSize());
            this.triangle_count += object.triangle_count;

            //Bounding Box
            this.bounding_box_data = new ArrayBuffer(this.bounding_box_data.byteLength + BoundingBox.size);
        }
    }

    remove(object) {
        
    }

    //TODO: I bet this doesn't work but I don't think I'll care until later
    clear() {
        this.objects = [];
        this.object_count = 0;
    }


    setupBuffers(){
        this.setupSphereBuffer();
        this.setupMaterialBuffer();
        this.setupMeshBuffer();
        this.has_setup_buffers = true;
    }

    setupSphereBuffer(){
        var sphere_offset = 0;
        this.spheres.forEach(sphere => {
            const SphereDataValues = new ArrayBuffer(this.sphere_size);
            const SphereDataViews = {
                pos: new Float32Array(SphereDataValues, 0, 3),
                radius: new Float32Array(SphereDataValues, 12, 1),
                material_index: new Uint32Array(SphereDataValues, 16, 1),
            };
            SphereDataViews.pos.set(sphere.position);
            SphereDataViews.radius[0] = sphere.radius;
            SphereDataViews.material_index[0] = sphere.material_id;

            const sphereView = new Uint8Array(SphereDataValues);
            const allLightsView = new Uint8Array(this.spheres_data, sphere_offset * this.sphere_size, this.sphere_size);
            allLightsView.set(sphereView);
            sphere_offset++;
        });
    }

    setupMaterialBuffer(){
        var material_offset = 0;
        this.materials.forEach(material => {
            const MaterialValues = new ArrayBuffer(Material.size);
            const MaterialViews = {
                attenuation: new Float32Array(MaterialValues, 0, 3),
                metalic_fuzz: new Float32Array(MaterialValues, 12, 1),
                emissive_color: new Float32Array(MaterialValues, 16, 3),
                emissive_strength: new Float32Array(MaterialValues, 28, 1),
                material_flag: new Uint32Array(MaterialValues, 32, 1),
                refractive_index: new Float32Array(MaterialValues, 36, 1),
            }
            MaterialViews.attenuation.set(material.attenuation);
            MaterialViews.metalic_fuzz[0] = material.metalic_fuzz;
            MaterialViews.material_flag[0] = material.material_flag;
            MaterialViews.refractive_index[0] = material.refractive_index;
            MaterialViews.emissive_color.set(material.emissive_color);
            MaterialViews.emissive_strength[0] = material.emissive_strength;

            const materialView = new Uint8Array(MaterialValues);
            const allMaterialsView = new Uint8Array(this.materials_data, material_offset * Material.size, Material.size);
            allMaterialsView.set(materialView);
            material_offset++;
        });
    }

    setupMeshBuffer(){
        var triangle_offset = 0;
        var mesh_offset = 0;
        var bounding_box_offset = 0;

        this.meshes.forEach(mesh => {

            mesh.transformToWorldSpace();
            mesh.setupBoundingBox()

            console.log(mesh.bounding_box);

            const MeshValues = new ArrayBuffer(Mesh.mesh_size);
            const MeshViews = {
                bounding_box_index: new Uint32Array(MeshValues, 0, 1),
                first_triangle_index: new Uint32Array(MeshValues, 4, 1),
                triangle_count: new Uint32Array(MeshValues, 8, 1),
            };
            MeshViews.bounding_box_index[0] = bounding_box_offset;
            MeshViews.first_triangle_index[0] = triangle_offset;
            MeshViews.triangle_count[0] = mesh.triangle_count;
            const meshView = new Uint8Array(MeshValues);
            const allMeshView = new Uint8Array(this.meshes_data, mesh_offset * Mesh.mesh_size, Mesh.mesh_size);
            allMeshView.set(meshView);
            mesh_offset++;

            const BoundingBoxValues = new ArrayBuffer(32);
            const BoundingBoxViews = {
                min: new Float32Array(BoundingBoxValues, 0, 3),
                max: new Float32Array(BoundingBoxValues, 16, 3),
            };
            BoundingBoxViews.min.set(mesh.bounding_box.min);
            BoundingBoxViews.max.set(mesh.bounding_box.max);
            const boundingBoxView = new Uint8Array(BoundingBoxValues);
            const allBoundingBoxView = new Uint8Array(this.bounding_box_data, bounding_box_offset * BoundingBox.size, BoundingBox.size);
            allBoundingBoxView.set(boundingBoxView);
            bounding_box_offset++;
            
            mesh.triangles.forEach(triangle => {

                // //Convert to world space. This is being done on CPU side because it simple and only will happen once for now. This prevents real-time animation. I will revisit this at a later time.
                // //This should also be in its own function probably but....
                // var world_pos_a = vec4.fromValues(triangle.pos_a[0], triangle.pos_a[1], triangle.pos_a[2], 1);
                // world_pos_a = vec4.transformMat4(vec4.create(), world_pos_a, mesh.transform.TRS);
                // triangle.pos_a = vec3.fromValues(world_pos_a[0], world_pos_a[1], world_pos_a[2]);

                // let world_pos_b = vec4.fromValues(triangle.pos_b[0], triangle.pos_b[1], triangle.pos_b[2], 1);
                // world_pos_b = vec4.transformMat4(vec4.create(), world_pos_b, mesh.transform.TRS);
                // triangle.pos_b = vec3.fromValues(world_pos_b[0], world_pos_b[1], world_pos_b[2]);

                // let world_pos_c = vec4.fromValues(triangle.pos_c[0], triangle.pos_c[1], triangle.pos_c[2], 1);
                // world_pos_c = vec4.transformMat4(vec4.create(), world_pos_c, mesh.transform.TRS);
                // triangle.pos_c = vec3.fromValues(world_pos_c[0], world_pos_c[1], world_pos_c[2]);

                // var world_normal_a = vec4.fromValues(triangle.normal_a[0], triangle.normal_a[1], triangle.normal_a[2], 0);
                // world_normal_a = vec4.transformMat4(vec4.create(), world_normal_a, mesh.transform.TRS_I_T);
                // triangle.normal_a = vec3.fromValues(world_normal_a[0], world_normal_a[1], world_normal_a[2]);

                // var world_normal_b = vec4.fromValues(triangle.normal_b[0], triangle.normal_b[1], triangle.normal_b[2], 0);
                // world_normal_b = vec4.transformMat4(vec4.create(), world_normal_b, mesh.transform.TRS_I_T);
                // triangle.normal_b = vec3.fromValues(world_normal_b[0], world_normal_b[1], world_normal_b[2]);

                // var world_normal_c = vec4.fromValues(triangle.normal_c[0], triangle.normal_c[1], triangle.normal_c[2], 0);
                // world_normal_c = vec4.transformMat4(vec4.create(), world_normal_c, mesh.transform.TRS_I_T);
                // triangle.normal_c = vec3.fromValues(world_normal_c[0], world_normal_c[1], world_normal_c[2]);

                const TriangleValues = new ArrayBuffer(128);
                const TriangleViews = {
                    pos_a: new Float32Array(TriangleValues, 0, 3),
                    pos_b: new Float32Array(TriangleValues, 16, 3),
                    pos_c: new Float32Array(TriangleValues, 32, 3),
                    normal_a: new Float32Array(TriangleValues, 48, 3),
                    normal_b: new Float32Array(TriangleValues, 64, 3),
                    normal_c: new Float32Array(TriangleValues, 80, 3),
                    material_index: new Uint32Array(TriangleValues, 92, 1),
                    uv_a: new Float32Array(TriangleValues, 96, 2),
                    uv_b: new Float32Array(TriangleValues, 104, 2),
                    uv_c: new Float32Array(TriangleValues, 112, 2),
                };
                TriangleViews.pos_a.set(triangle.pos_a);
                TriangleViews.pos_b.set(triangle.pos_b);
                TriangleViews.pos_c.set(triangle.pos_c);
                TriangleViews.normal_a.set(triangle.normal_a);
                TriangleViews.normal_b.set(triangle.normal_b);
                TriangleViews.normal_c.set(triangle.normal_c);
                TriangleViews.material_index[0] = mesh.material_id;
                TriangleViews.uv_a.set(triangle.uv_a);
                TriangleViews.uv_b.set(triangle.uv_b);
                TriangleViews.uv_c.set(triangle.uv_c);

                const triangleView = new Uint8Array(TriangleValues);
                const allTrianglesView = new Uint8Array(this.triangles_data, triangle_offset * Mesh.triangle_size, Mesh.triangle_size);
                allTrianglesView.set(triangleView);
                triangle_offset++;
            });
        })
    }

    update(){
        this.parameters_updated = false;
        this.objects.forEach(element => { 
            if(typeof element.update === 'function'){
                element.update();
            }
        });
    }
}