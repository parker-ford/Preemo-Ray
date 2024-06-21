
export class Scene {
    constructor() {
        this.objects = [];
        //Debug
        this.print = false;
    }

    add(object) {
        this.objects.push(object);
    }

    remove(object) {
        
    }

    //TODO: I bet this doesn't work but I don't think I'll care until later
    clear() {
        this.objects = [];
        this.object_count = 0;
    }

    update(){
        this.objects.forEach(element => {
            
            if(typeof element.update === 'function'){
                element.update();
            }
            
        });
    }
}