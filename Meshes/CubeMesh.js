import Triangle from '../Triangle';
import Mesh from './Mesh';

/**
 * Class representing a cube mesh, extending the abstract Mesh class.
 * @extends Mesh
 */
export default class CubeMesh extends Mesh {
	/**
	 * Create a CubeMesh.
	 * @param {Object} options - The options for creating the cube mesh.
	 * @param {number} [options.width=1] - The number of vertices along the width of the cube.
	 * @param {number} [options.height=1] - The number of vertices along the height of the cube.
	 * @param {number} [options.depth=1] - The number of vertices along the depth of the cube.
	 */
	constructor({ width = 1, height = 1, depth = 1 }) {
		super();

		/**
		 * The number of vertices along the width of the cube.
		 * @type {number}
		 */
		this.width = width;

		/**
		 * The number of vertices along the height of the cube.
		 * @type {number}
		 */
		this.height = height;

		/**
		 * The number of vertices along the depth of the cube.
		 * @type {number}
		 */
		this.depth = depth;

		/**
		 * Promise that resolves when the mesh is loaded.
		 * @type {Promise<void>|undefined}
		 */
		this.loaded_promise = this.init();
	}

	/**
	 * Calculate vertex coordinates, UV coordinates, and normal vectors for all faces of the cube.
	 * @override
	 * @returns {Promise<void>}
	 */
	calculateVertexCoordinates() {
		const widthInterval = 1 / this.width;
		const heightInterval = 1 / this.height;
		const depthInterval = 1 / this.depth;

		// Front Face
		for (let i = 0; i < this.width + 1; i += 1) {
			for (let j = 0; j < this.height + 1; j += 1) {
				this.vertex_positions.push([-0.5 + i * widthInterval, -0.5 + j * heightInterval, -0.5]);
				this.vertex_uv_coordinates.push([i * widthInterval, j * heightInterval]);
				this.vertex_normals.push([0, 0, -1]);
			}
		}

		// Back Face
		for (let i = this.width; i >= 0; i -= 1) {
			for (let j = 0; j < this.height + 1; j += 1) {
				this.vertex_positions.push([-0.5 + i * widthInterval, -0.5 + j * heightInterval, 0.5]);
				this.vertex_uv_coordinates.push([1 - i * widthInterval, j * heightInterval]);
				this.vertex_normals.push([0, 0, 1]);
			}
		}

		// Right Face
		for (let i = 0; i < this.height + 1; i += 1) {
			for (let j = 0; j < this.depth + 1; j += 1) {
				this.vertex_positions.push([0.5, -0.5 + i * heightInterval, -0.5 + j * depthInterval]);
				this.vertex_uv_coordinates.push([j * heightInterval, i * widthInterval]);
				this.vertex_normals.push([1, 0, 0]);
			}
		}

		// Left Face
		for (let i = this.height; i >= 0; i -= 1) {
			for (let j = 0; j < this.depth + 1; j += 1) {
				this.vertex_positions.push([-0.5, -0.5 + i * heightInterval, -0.5 + j * depthInterval]);
				this.vertex_uv_coordinates.push([1 - j * heightInterval, i * widthInterval]);
				this.vertex_normals.push([-1, 0, 0]);
			}
		}

		// Top Face
		for (let i = 0; i < this.width + 1; i += 1) {
			for (let j = 0; j < this.depth + 1; j += 1) {
				this.vertex_positions.push([-0.5 + i * widthInterval, 0.5, -0.5 + j * depthInterval]);
				this.vertex_uv_coordinates.push([i * widthInterval, j * heightInterval]);
				this.vertex_normals.push([0, 1, 0]);
			}
		}

		// Bottom Face
		for (let i = this.width; i >= 0; i -= 1) {
			for (let j = 0; j < this.depth + 1; j += 1) {
				this.vertex_positions.push([-0.5 + i * widthInterval, -0.5, -0.5 + j * depthInterval]);
				this.vertex_uv_coordinates.push([i * widthInterval, 1 - j * heightInterval]);
				this.vertex_normals.push([0, -1, 0]);
			}
		}

		return Promise.resolve();
	}

	/**
	 * Calculate vertices for a single face of the cube.
	 * @param {number} x - Number of segments along the x-axis of the face.
	 * @param {number} y - Number of segments along the y-axis of the face.
	 * @param {number} offset - Offset in the vertex array to start from.
	 */
	calculateFaceVertices(x, y, offset) {
		for (let i = 0; i < x; i += 1) {
			for (let j = 0; j < y; j += 1) {
				// Top Triangle
				const top_triangle = new Triangle({
					pos_a: this.vertex_positions[j + i * (y + 1) + offset],
					pos_b: this.vertex_positions[j + 1 + i * (y + 1) + offset],
					pos_c: this.vertex_positions[j + 1 + (i + 1) * (y + 1) + offset],
					uv_a: this.vertex_uv_coordinates[j + i * (y + 1) + offset],
					uv_b: this.vertex_uv_coordinates[j + 1 + i * (y + 1) + offset],
					uv_c: this.vertex_uv_coordinates[j + 1 + (i + 1) * (y + 1) + offset],
					normal_a: this.vertex_normals[j + i * (y + 1) + offset],
					normal_b: this.vertex_normals[j + 1 + i * (y + 1) + offset],
					normal_c: this.vertex_normals[j + 1 + (i + 1) * (y + 1) + offset]
				});

				// Bottom Triangle
				const bottom_triangle = new Triangle({
					pos_a: this.vertex_positions[j + 1 + (i + 1) * (y + 1) + offset],
					pos_b: this.vertex_positions[j + (i + 1) * (y + 1) + offset],
					pos_c: this.vertex_positions[j + i * (y + 1) + offset],
					uv_a: this.vertex_uv_coordinates[j + 1 + (i + 1) * (y + 1) + offset],
					uv_b: this.vertex_uv_coordinates[j + (i + 1) * (y + 1) + offset],
					uv_c: this.vertex_uv_coordinates[j + i * (y + 1) + offset],
					normal_a: this.vertex_normals[j + 1 + (i + 1) * (y + 1) + offset],
					normal_b: this.vertex_normals[j + (i + 1) * (y + 1) + offset],
					normal_c: this.vertex_normals[j + i * (y + 1) + offset]
				});

				this.triangles.push(top_triangle);
				this.triangles.push(bottom_triangle);
				this.triangle_count += 2;
			}
		}
	}

	constructTriangles() {
		let offset = 0;

		// Front Face
		this.calculateFaceVertices(this.width, this.height, offset);
		offset += (this.width + 1) * (this.height + 1);

		// Back Face
		this.calculateFaceVertices(this.width, this.height, offset);
		offset += (this.width + 1) * (this.height + 1);

		// Right Face
		this.calculateFaceVertices(this.height, this.depth, offset);
		offset += (this.height + 1) * (this.depth + 1);

		// Left Face
		this.calculateFaceVertices(this.height, this.depth, offset);
		offset += (this.height + 1) * (this.depth + 1);

		// Top Face
		this.calculateFaceVertices(this.width, this.depth, offset);
		offset += (this.width + 1) * (this.depth + 1);

		// Bottom Face
		this.calculateFaceVertices(this.width, this.depth, offset);
	}
}
