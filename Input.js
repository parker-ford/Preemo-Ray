export class Input {
    static keys = {};
    static mouseButtons = {};
    static mousePosition = { x: 0, y: 0 };
    static deltaMouse = { x: 0, y: 0 };
    static initialized = false;

    static init() {
        if(!this.initialized){
            window.addEventListener('keydown', function(event) {
                Input.keys[event.key] = true;
            });

            window.addEventListener('keyup', function(event) {
                Input.keys[event.key] = false;
            });

            window.addEventListener('mousedown', function(event) {
                Input.mouseButtons[event.button] = true;
            });

            window.addEventListener('mouseup', function(event) {
                Input.mouseButtons[event.button] = false;
            });

            window.addEventListener('mousemove', function(event) {

                if (Input.mouseStopTimeout) {
                    clearTimeout(Input.mouseStopTimeout);
                }

                Input.deltaMouse.x = Input.mousePosition.x - event.clientX;
                Input.deltaMouse.y = Input.mousePosition.y - event.clientY;
                Input.mousePosition.x = event.clientX;
                Input.mousePosition.y = event.clientY;

                Input.mouseStopTimeout = setTimeout(function() {
                    Input.deltaMouse.x = 0;
                    Input.deltaMouse.y = 0;
                }, 10);
            });

            this.initialized = true;
        }
    }

    static isKeyDown(key) {
        return !!Input.keys[key];
    }

    static isMouseDown(button) {
        return !!Input.mouseButtons[button];
    }

    static getMousePosition() {
        return Input.mousePosition;
    }
}

Input.init();