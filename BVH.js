import { BVHNode } from "./BVHNode";

export class BVH {
    constructor(){
        this.nodes = [];
        this.node_count = 0;
        this.root  = null;
        this.triangles = null;
    }

    constructBVH(triangles){

        //Reset
        this.nodes = [];
        this.node_count = 0;
        this.root  = null;
        this.triangles = null;

        this.triangles = triangles;
        this.root = new BVHNode({
            bvh: this
        });
        this.root.first_triangle_index = 0;
        this.root.triangle_count = triangles.length;
        this.root.updateBounds();
        this.nodes.push(this.root);
        this.node_count++;
        this.root.subdivide();
    }

    getSize(){
        return this.node_count * BVHNode.size;
    }
}