export class Time {
    static deltaTime = 0;
    static elapsedTime = 0;
    static lastFrameTime = performance.now();

    static update() {
        let currentFrameTime = performance.now();
        this.deltaTime = (currentFrameTime - this.lastFrameTime) / 1000;
        this.elapsedTime += this.deltaTime;
        this.lastFrameTime = currentFrameTime;
    }
}

function frame() {
    Time.update();
    requestAnimationFrame(frame);
}

requestAnimationFrame(frame);