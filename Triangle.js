import { vec2, vec3 } from 'gl-matrix';

/**
 * Class Representing a Triangle
 */
export default class Triangle {
	/**
	 * Number of bytes per triangle struct in triangle buffer.
	 * @type {number}
	 */
	static TRIANGLE_SIZE = 128;

	/**
	 * Create a new Triangle.
	 * @param {Object} options - The parameters for creating the triangle.
	 * @param {vec3} [options.pos_a=vec3.fromValues(0, 0, 0)] - The position of vertex A.
	 * @param {vec3} [options.pos_b=vec3.fromValues(0, 0, 0)] - The position of vertex B.
	 * @param {vec3} [options.pos_c=vec3.fromValues(0, 0, 0)] - The position of vertex C.
	 * @param {vec2} [options.uv_a=vec3.fromValues(0, 0)] - The UV coordinates of vertex A.
	 * @param {vec2} [options.uv_b=vec3.fromValues(0, 0)] - The UV coordinates of vertex B.
	 * @param {vec2} [options.uv_c=vec3.fromValues(0, 0)] - The UV coordinates of vertex C.
	 * @param {vec3} [options.normal_a=vec3.fromValues(0, 0, 0)] - The normal vector of vertex A.
	 * @param {vec3} [options.normal_b=vec3.fromValues(0, 0, 0)] - The normal vector of vertex B.
	 * @param {vec3} [options.normal_c=vec3.fromValues(0, 0, 0)] - The normal vector of vertex C.
	 */
	constructor({
		pos_a = vec3.fromValues(0, 0, 0),
		pos_b = vec3.fromValues(0, 0, 0),
		pos_c = vec3.fromValues(0, 0, 0),
		uv_a = vec2.fromValues(0, 0),
		uv_b = vec2.fromValues(0, 0),
		uv_c = vec2.fromValues(0, 0),
		normal_a = vec3.fromValues(0, 0, 0),
		normal_b = vec3.fromValues(0, 0, 0),
		normal_c = vec3.fromValues(0, 0, 0)
	}) {
		/**
		 * The position of vertex A.
		 * @type {vec3}
		 */
		this.pos_a = pos_a;

		/**
		 * The position of vertex B.
		 * @type {vec3}
		 */
		this.pos_b = pos_b;

		/**
		 * The position of vertex C.
		 * @type {vec3}
		 */
		this.pos_c = pos_c;

		/**
		 * The UV coordinates of vertex A.
		 * @type {vec2}
		 */
		this.uv_a = uv_a;

		/**
		 * The UV coordinates of vertex B.
		 * @type {vec2}
		 */
		this.uv_b = uv_b;

		/**
		 * The UV coordinates of vertex C.
		 * @type {vec2}
		 */
		this.uv_c = uv_c;

		/**
		 * The normal vector of vertex A.
		 * @type {vec3}
		 */
		this.normal_a = normal_a;

		/**
		 * The normal vector of vertex B.
		 * @type {vec3}
		 */
		this.normal_b = normal_b;

		/**
		 * The normal vector of vertex C.
		 * @type {vec3}
		 */
		this.normal_c = normal_c;

		/**
		 * The centroid of the triangle.
		 * @type {vec3}
		 */
		this.centroid = this.calculateCenter();
	}

	/**
	 * Calculate the center (centroid) of the triangle.
	 * @returns {vec3} The centroid of the triangle.
	 */
	calculateCenter() {
		const center = vec3.create();
		vec3.add(center, this.pos_a, this.pos_b);
		vec3.add(center, center, this.pos_c);
		vec3.scale(center, center, 1 / 3);
		return center;
	}
}
