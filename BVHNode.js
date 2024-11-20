import { vec3 } from 'gl-matrix';

export class BVHNode {
	static size = 48;

	constructor(options) {
		//Data for BVH construction
		this.bvh = options.bvh;

		//Data to be passed into the shader
		this.min = vec3.fromValues(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
		this.max = vec3.fromValues(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);
		this.child_left_node = options.child_left_node || 0; //Right index is always left index + 1
		this.first_triangle_index = options.first_triangle_index || 0;
		this.triangle_count = options.triangle_count || 0;
		this.depth = options.depth || 0;
	}

	updateBounds() {
		this.min = vec3.fromValues(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
		this.max = vec3.fromValues(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);

		for (
			let i = this.first_triangle_index;
			i < this.first_triangle_index + this.triangle_count;
			i++
		) {
			this.addTriangle(this.bvh.triangles[i]);
		}
	}

	addPoint(point) {
		this.min = vec3.min(vec3.create(), this.min, point);
		this.max = vec3.max(vec3.create(), this.max, point);
	}

	addTriangle(triangle) {
		this.addPoint(triangle.pos_a);
		this.addPoint(triangle.pos_b);
		this.addPoint(triangle.pos_c);
	}

	subdivide() {
		if (this.triangle_count <= 2) {
			this.bvh.leaf_count++;

			this.bvh.min_leaf_depth = Math.min(this.bvh.min_leaf_depth, this.depth);
			this.bvh.max_leaf_depth = Math.max(this.bvh.max_leaf_depth, this.depth);
			this.bvh.mean_leaf_depth += this.depth;

			this.bvh.min_leaf_triangles = Math.min(this.bvh.min_leaf_triangles, this.triangle_count);
			this.bvh.max_leaf_triangles = Math.max(this.bvh.max_leaf_triangles, this.triangle_count);
			this.bvh.mean_leaf_triangles += this.triangle_count;

			return;
		}

		//Determine the axis and position of the split plane
		// let extent = this.max - this.min;
		let extent = vec3.sub(vec3.create(), this.max, this.min);
		let axis = 0;
		if (extent[1] > extent[0]) axis = 1;
		if (extent[2] > extent[axis]) axis = 2;
		let splitPos = this.min[axis] + extent[axis] * 0.5;

		//Split the group of primitives in two halves using the split plane
		let i = this.first_triangle_index;
		let j = this.first_triangle_index + this.triangle_count - 1;
		while (i <= j) {
			const tri = this.bvh.triangles[i];
			if (tri.centroid[axis] < splitPos) {
				i++;
			} else {
				let temp = this.bvh.triangles[i];
				this.bvh.triangles[i] = this.bvh.triangles[j];
				this.bvh.triangles[j] = temp;
				j--;
			}
		}

		//Create child nodes for each half
		let left_count = i - this.first_triangle_index;
		if (left_count == 0 || left_count == this.triangle_count) {
			this.bvh.leaf_count++;

			this.bvh.min_leaf_depth = Math.min(this.bvh.min_leaf_depth, this.depth);
			this.bvh.max_leaf_depth = Math.max(this.bvh.max_leaf_depth, this.depth);
			this.bvh.mean_leaf_depth += this.depth;

			this.bvh.min_leaf_triangles = Math.min(this.bvh.min_leaf_triangles, this.triangle_count);
			this.bvh.max_leaf_triangles = Math.max(this.bvh.max_leaf_triangles, this.triangle_count);
			this.bvh.mean_leaf_triangles += this.triangle_count;
			return;
		}

		let left_index = this.bvh.node_count;
		this.bvh.node_count++;

		this.child_left_node = left_index;
		let left_node = new BVHNode({
			bvh: this.bvh,
			first_triangle_index: this.first_triangle_index,
			triangle_count: left_count,
			depth: this.depth + 1
		});
		this.bvh.nodes.push(left_node);

		let right_index = this.bvh.node_count;
		this.bvh.node_count++;

		let right_node = new BVHNode({
			bvh: this.bvh,
			first_triangle_index: i,
			triangle_count: this.triangle_count - left_count,
			depth: this.depth + 1
		});
		this.bvh.nodes.push(right_node);

		this.triangle_count = 0; //Only leaf nodes hold triangles

		//Recurse into each of the child nodes
		left_node.updateBounds();
		right_node.updateBounds();

		left_node.subdivide();
		right_node.subdivide();
	}
}
