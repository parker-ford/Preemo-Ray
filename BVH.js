// eslint-disable-next-line no-unused-vars
import Triangle from './Triangle';
import { BVHNode } from './BVHNode';

/**
 * Class representing a Bounding Volume Hierarchy.
 */
export default class BVH {
	/**
	 * Create a new BVH.
	 */
	constructor() {
		/** @type {BVHNode[]} Array of BVH nodes */
		this.nodes = [];

		/** @type {number} Total number of nodes in the BVH (including leafs) */
		this.node_count = 0;

		/** @type {number} Number of leaf nodes in the BVH */
		this.leaf_count = 0;

		/** @type {number} Minimum depth of leaf nodes */
		this.min_leaf_depth = Number.MAX_VALUE;

		/** @type {number} Maximum depth of leaf nodes */
		this.max_leaf_depth = 0;

		/** @type {number} Mean depth of leaf nodes */
		this.mean_leaf_depth = 0;

		/** @type {number} Minimum number of triangles in a leaf node */
		this.min_leaf_triangles = Number.MAX_VALUE;

		/** @type {number} Maximum number of triangles in a leaf node */
		this.max_leaf_triangles = 0;

		/** @type {number} Mean number of triangles in leaf nodes */
		this.mean_leaf_triangles = 0;

		/** @type {BVHNode|null} Root node of the BVH */
		this.root = null;

		/** @type {Array<Triangle>|null} Array of triangles used to construct the BVH */
		this.triangles = null;
	}

	/**
	 * Construct the Bounding Volume Hierarchy from a set of triangles.
	 * @param {Array<Triangle>} triangles - Array of triangles to construct the BVH from.
	 */
	constructBVH(triangles) {
		// Reset
		this.nodes = [];
		this.node_count = 0;
		this.root = null;
		this.triangles = null;

		this.triangles = triangles;
		this.root = new BVHNode({
			bvh: this
		});
		this.root.first_triangle_index = 0;
		this.root.triangle_count = triangles.length;
		this.root.updateBounds();
		this.nodes.push(this.root);
		this.node_count += 1;
		this.root.subdivide();

		this.mean_leaf_depth /= this.leaf_count;
		this.mean_leaf_triangles /= this.leaf_count;
	}

	/**
	 * Get the total size of the BVH in bytes.
	 * @returns {number} Size of the BVH in bytes.
	 */
	getSize() {
		return this.node_count * BVHNode.size;
	}
}
