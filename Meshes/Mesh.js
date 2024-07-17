import { BVH } from "../BVH.js";

export class Mesh {
    static triangle_size = 128
    static mesh_size = 20
    static count = 0;

    constructor(options){
        this.id = Mesh.count++;
        this.triangle_count = 0;
        this.triangles = [];
        this.bvh = new BVH();

    }

    async init() {
        await this.calculateVertices();
        this.bvh.constructBVH(this.triangles);
    }

    loaded() {
        return this.loadedPromise;
    }

    async calculateVertices(){
        await this.calculateVertexCoordinates();
        this.constructTriangles();
    }


    getSize() {
        return this.triangle_count * Mesh.triangle_size;
    }

    update(){
        this.transform.update();
    }
}