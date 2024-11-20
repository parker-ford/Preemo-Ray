import { Triangle } from '../Triangle';
import { Mesh } from './Mesh';

/**
 * Class representing a plane mesh, extending the abstract Mesh class.
 * @extends Mesh
 */
export class PlaneMesh extends Mesh {
	/**
	 * Create a PlaneMesh.
	 * @param {Object} options - The options for creating the plane mesh.
	 * @param {number} [options.width=1] - The number of segments along the width of the plane.
	 * @param {number} [options.height=1] - The number of segments along the height of the plane.
	 */
	constructor({ width = 1, height = 1 }) {
		super();

		/**
		 * The number of segments along the width of the plane.
		 * @type {number}
		 */
		this.width = width;

		/**
		 * The number of segments along the height of the plane.
		 * @type {number}
		 */
		this.height = height;

		/**
		 * Promise that resolves when the mesh is loaded.
		 * @type {Promise<void>}
		 */
		this.loadedPromise = this.init();
	}

	/**
	 * Calculate vertex coordinates, UV coordinates, and normal vectors for the plane.
	 * @override
	 * @returns {Promise<void>}
	 */
	calculateVertexCoordinates() {
		const widthInterval = 1 / this.width;
		const heightInterval = 1 / this.height;
		for (let i = 0; i < this.width + 1; i += 1) {
			for (let j = 0; j < this.height + 1; j += 1) {
				this.vertex_positions.push([-0.5 + i * widthInterval, -0.5 + j * heightInterval, 0]);
				this.vertex_uv_coordinates.push([i * widthInterval, j * heightInterval]);
				this.vertex_normals.push([0, 0, -1]);
			}
		}

		return Promise.resolve();
	}

	/**
	 * Construct triangles for the plane mesh.
	 * @override
	 */
	constructTriangles() {
		for (let i = 0; i < this.width; i += 1) {
			for (let j = 0; j < this.height; j += 1) {
				// Top Triangle
				const top_triangle = new Triangle({
					pos_a: this.vertex_positions[j + i * (this.height + 1)],
					pos_b: this.vertex_positions[j + 1 + i * (this.height + 1)],
					pos_c: this.vertex_positions[j + 1 + (i + 1) * (this.height + 1)],
					uv_a: this.vertex_uv_coordinates[j + i * (this.height + 1)],
					uv_b: this.vertex_uv_coordinates[j + 1 + i * (this.height + 1)],
					uv_c: this.vertex_uv_coordinates[j + 1 + (i + 1) * (this.height + 1)],
					normal_a: this.vertex_normals[j + i * (this.height + 1)],
					normal_b: this.vertex_normals[j + 1 + i * (this.height + 1)],
					normal_c: this.vertex_normals[j + 1 + (i + 1) * (this.height + 1)]
				});

				// Bottom Triangle
				const bottom_triangle = new Triangle({
					pos_a: this.vertex_positions[j + 1 + (i + 1) * (this.height + 1)],
					pos_b: this.vertex_positions[j + (i + 1) * (this.height + 1)],
					pos_c: this.vertex_positions[j + i * (this.height + 1)],
					uv_a: this.vertex_uv_coordinates[j + 1 + (i + 1) * (this.height + 1)],
					uv_b: this.vertex_uv_coordinates[j + (i + 1) * (this.height + 1)],
					uv_c: this.vertex_uv_coordinates[j + i * (this.height + 1)],
					normal_a: this.vertex_normals[j + 1 + (i + 1) * (this.height + 1)],
					normal_b: this.vertex_normals[j + (i + 1) * (this.height + 1)],
					normal_c: this.vertex_normals[j + i * (this.height + 1)]
				});

				// Push the triangles
				this.triangles.push(top_triangle);
				this.triangles.push(bottom_triangle);
				this.triangle_count += 2;
			}
		}
	}
}
