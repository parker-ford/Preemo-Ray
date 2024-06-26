import raytracer_shader from './shaders/raytracer.wgsl?raw';
import compositer_shader from './shaders/compositer.wgsl?raw';
import { Time } from './Time.js';

export class Renderer {
    static instance;

    constructor(canvas) {
        if (Renderer.instance) {
            return Renderer.instance;
        }

        this.canvas = canvas;
        this.gpu = null;
        this.adapter = null;
        this.device = null;
        this.context = null;
        this.commandBuffers = [];
        this.renderFunctions = [];

        this.frame_number = 1;

        //Assets
        this.color_buffer = null;
        this.color_buffer_view = null;
        this.sampler = null;

        //Pipeline Objects
        this.ray_tracing_pipeline = null;
        this.ray_tracing_bind_group = null;
        this.compositer_pipeline = null;
        this.compositer_bind_group = null;

        Renderer.instance = this;
    }

    async init() {

        if(!await this.setupDevice()){
            console.log("device setup failed");
            return false;
        }
        await this.createAssets();
        await this.createPipeline();

        return true;
    }

    async setupDevice() {
        //Checks to see if WebGPU is available
        if (!("gpu" in window.navigator)) {
            console.log("gpu not in navigator");
            return false;
        }
        this.gpu = navigator.gpu;
        console.log(window.navigator);
        //The adapter represents the physicsal gpu device.
        //This method can not fail but it may be null.
        this.adapter = await this.gpu.requestAdapter();
        if (!this.adapter) {
            console.log("no adapter");
            return false;
        }

        //This is the logical connection of the gpu. It allows you to create thins like buffers and textures.
        this.device = await this.adapter.requestDevice();
        if (!this.device) {
            console.log("no device");
            return false;
        }

        this.context = this.canvas.getContext('webgpu');
        this.devicePixelRatio = window.devicePixelRatio || 1;
        this.presentationSize = [this.canvas.clientWidth * devicePixelRatio, this.canvas.clientHeight * devicePixelRatio];
        this.presentationFormat = this.gpu.getPreferredCanvasFormat();
        let configuration = {
            device: this.device,
            format: this.presentationFormat,
            size: this.presentationSize,
        };
        this.context.configure(configuration);

        return true;
    }

    async createAssets() {

        //Image Buffer
        this.image_buffer = this.device.createBuffer({
            label: 'image_buffer',
            size: Float32Array.BYTES_PER_ELEMENT * 4 * this.canvas.width * this.canvas.height,
            usage: GPUBufferUsage.STORAGE
        });

        //Write Buffer
        this.color_buffer = this.device.createTexture({
            label: 'color_buffer',
            size : {
                width: this.canvas.width,
                height: this.canvas.height,
            },
            format: 'rgba8unorm',
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC |GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING 
        });

        this.color_buffer_view = this.color_buffer.createView();

        //Read Buffer
        this.color_buffer_read = this.device.createTexture({
            label: 'color_buffer_read',
            size : {
                width: this.canvas.width,
                height: this.canvas.height,
            },
            format: 'rgba8unorm',
            usage: GPUTextureUsage.COPY_DST |GPUTextureUsage.COPY_SRC | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING
        });

        this.color_buffer_read_view = this.color_buffer_read.createView();

        const samplerDescriptor = {
            addressModeU: 'repeat',
            addressModeV: 'repeat',
            magFilter: 'linear',
            minFilter: 'linear',
            minmapFilter: "nearest",
            maxAnisotropy: 1
        };

        this.sampler = this.device.createSampler(samplerDescriptor);

        this.camera_buffer = this.device.createBuffer({
            label: 'camera_buffer',
            size: 112,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });


        this.time_values = new ArrayBuffer(8);
        this.time_views = {
            elapsed_time: new Float32Array(this.time_values, 0, 1),
            frame_number: new Uint32Array(this.time_values, 4, 1),
          };

        this.time_buffer = this.device.createBuffer({
            label: 'time_buffer',
            size: 8,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });

        this.scene_values = new ArrayBuffer(4);
        this.scene_views = {
            sphere_count: new Uint32Array(this.scene_values, 0, 1),
        }
        this.scene_buffer = this.device.createBuffer({
            label: 'scene_buffer',
            size: 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        })

        this.sphere_buffer = this.device.createBuffer({
            size: 32 * 100, //Size of sphere * number of spheres
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });
        
        this.material_buffer = this.device.createBuffer({
            size: 32 * 100, //Size of material * number of spheres
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        })
    }

    async createPipeline() {
        const ray_tracing_bind_group_layout = this.device.createBindGroupLayout({
            label: 'ray_tracing_bind_group_layout',
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: {
                        access: 'write-only',
                        format: 'rgba8unorm',
                        viewDimension: '2d'
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    storageTexture: {
                        access: 'read-only',
                        format: 'rgba8unorm',
                        viewDimension: '2d'
                    }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'uniform'
                    }
                },
                {
                    binding: 3,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'uniform'
                    }
                },
                {
                    binding: 4,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'uniform'
                    }
                },
                {
                    binding: 5,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'read-only-storage',
                        hasDynamicOffset: false
                    }
                },
                {
                    binding: 6,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'read-only-storage',
                        hasDynamicOffset: false
                    }
                },
                {
                    binding: 7,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        // type: ''
                        type: 'storage',
                    }
                }
            ]
        });

        this.ray_tracing_bind_group = this.device.createBindGroup({
            label: 'ray_tracing_bind_group',
            layout: ray_tracing_bind_group_layout,
            entries: [
                {
                    binding: 0,
                    resource: this.color_buffer_view
                },
                {
                    binding: 1,
                    resource: this.color_buffer_read_view
                },
                {
                    binding: 2,
                    resource: {
                        buffer: this.camera_buffer
                    }
                },
                {
                    binding: 3,
                    resource: {
                        buffer: this.time_buffer
                    }
                },
                {
                    binding: 4,
                    resource: {
                        buffer: this.scene_buffer
                    }
                },
                {
                    binding: 5,
                    resource: {
                        buffer: this.sphere_buffer
                    }
                },
                {
                    binding: 6,
                    resource: {
                        buffer: this.material_buffer
                    }
                },
                {
                    binding: 7,
                    resource: {
                        buffer: this.image_buffer
                    }
                }
            ]
        });

        const ray_tracing_pipeline_layout = this.device.createPipelineLayout({
            bindGroupLayouts: [ray_tracing_bind_group_layout]
        });

        this.ray_tracing_pipeline = this.device.createComputePipeline({
            label: 'ray_tracing_pipeline',
            layout: ray_tracing_pipeline_layout,
            compute: {
                module: this.device.createShaderModule({
                    code: raytracer_shader
                }),
                entryPoint: 'main'
            }
        });

        const compositer_bind_group_layout = this.device.createBindGroupLayout({
            label: 'compositer_bind_group_layout',
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: {}
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: {}
                }
            ]
        })

        this.compositer_bind_group = this.device.createBindGroup({
            label: 'compositer_bind_group',
            layout: compositer_bind_group_layout,
            entries: [
                {
                    binding: 0,
                    resource: this.sampler
                },
                {
                    binding: 1,
                    resource: this.color_buffer_view
                }
            ]
        });

        const compositer_pipeline_layout = this.device.createPipelineLayout({
            bindGroupLayouts: [compositer_bind_group_layout]
        });

        this.compositer_pipeline = this.device.createRenderPipeline({
            label: 'compositer_pipeline',
            layout: compositer_pipeline_layout,
            vertex: {
                module: this.device.createShaderModule({
                    code: compositer_shader
                }),
                entryPoint: 'vert_main'
            },
            fragment: {
                module: this.device.createShaderModule({
                    code: compositer_shader
                }),
                entryPoint: 'fragment_main',
                targets: [
                    {
                        format: 'bgra8unorm'
                    }
                ]
            },

            primitive: {
                topology: 'triangle-list'
            }
        });
    }

    render(scene, camera) {

        if(camera.hasMoved || scene.parameters_updated){
            this.frame_number = 0;
         }

        scene.update();

        //Camera Data
        this.device.queue.writeBuffer(this.camera_buffer, 0, camera.cameraBufferValues);

        //Sphere Data
        //TODO Do not need to write this every frame
        var clearBuffer = new ArrayBuffer(this.sphere_buffer.size);
        this.device.queue.writeBuffer(this.sphere_buffer, 0, clearBuffer);
        this.device.queue.writeBuffer(this.sphere_buffer, 0, scene.spheres_data, 0, scene.spheres_data.byteLength);

        //Material Data
        clearBuffer = new ArrayBuffer(this.material_buffer.size);
        this.device.queue.writeBuffer(this.material_buffer, 0, clearBuffer);
        this.device.queue.writeBuffer(this.material_buffer, 0, scene.materials_data, 0, scene.materials_data.byteLength);

        //Scene Data
        this.scene_views.sphere_count[0] = scene.spheres_count;
        this.device.queue.writeBuffer(this.scene_buffer, 0, this.scene_values);

        //Time Data
        this.time_views.elapsed_time[0] = Time.elapsedTime;
        this.time_views.frame_number[0] = this.frame_number;
        this.device.queue.writeBuffer(this.time_buffer, 0, this.time_values);

        const commandEncoder = this.device.createCommandEncoder();

        const ray_trace_pass = commandEncoder.beginComputePass();
        ray_trace_pass.setPipeline(this.ray_tracing_pipeline);
        ray_trace_pass.setBindGroup(0, this.ray_tracing_bind_group);
        ray_trace_pass.dispatchWorkgroups(this.canvas.width, this.canvas.height, 1);
        ray_trace_pass.end();

        commandEncoder.copyTextureToTexture(
            { texture: this.color_buffer }, 
            { texture: this.color_buffer_read }, 
            {
                width: this.canvas.width,
                height: this.canvas.height,
                depthOrArrayLayers: 1,
            }
        );

        const texture_view = this.context.getCurrentTexture().createView();
        const render_pass = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: texture_view,
                clearValue: { r: 0.5, g: 0.0, b: 0.25, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store'
            }]
        });

        render_pass.setPipeline(this.compositer_pipeline);
        render_pass.setBindGroup(0, this.compositer_bind_group);
        render_pass.draw(6, 1, 0, 0);

        render_pass.end();

        this.device.queue.submit([commandEncoder.finish()]);

        this.frame_number++;
    }
}