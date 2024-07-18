import { BVHNode } from "./BVHNode";

export class BVH {
    constructor(){
        this.nodes = [];
        this.node_count = 0;
        this.leaf_count = 0;
        this.min_leaf_depth = Number.MAX_VALUE;
        this.max_leaf_depth = 0;
        this.mean_leaf_depth = 0;
        this.min_leaf_triangles = Number.MAX_VALUE;
        this.max_leaf_triangles = 0;
        this.mean_leaf_triangles = 0;
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

        this.mean_leaf_depth /= this.leaf_count;
        this.mean_leaf_triangles /= this.leaf_count;
    }



    getSize(){
        return this.node_count * BVHNode.size;
    }
}