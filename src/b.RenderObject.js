function RenderObject(obj, params) {
    this.obj = obj || new Object3D();
    this.display = null;
    this.update_on_animate = true;

    this.children = [];
    this.parent = null;

    var self = this;

    _.each(['refresh'], function(event){
        self.on(event, function(){
            self[event]();
            self._cascade(event);
        })
    });

    _.extend(this, params);
}

O3.util.inherits(RenderObject, EventEmitter);

_.extend(
    RenderObject.prototype, {

        _cascade: function (event, data) {
            _.each(this.children, function (c) {
                c.emit(event, data);
            });
        },

        update: function () {

        },

        add: function (ro) {
            this.children.push(ro);
            this.obj.add(ro.obj);
            ro.parent = this;
        },

        remove: function(ro){
            ro.parent = null;
            this.obj.remove(ro.obj);
        },

        detach: function(){
            if (this.parent){
                this.parent.remove(this);
            }
        },

        at: function(x, y, z){
            this.obj.position.x = x;
            this.obj.position.y = y;
            this.obj.position.z = z;

            return this;
        },

        light: function(type){
            switch (type){
                case 'point':
                    this.type = 'POINT_LIGHT';

                    this.obj = new THREE.PointLight();
                    break;

                case 'directional':
                case 'sun':
                    this.obj = new THREE.DirectionalLight();
                    break;

            }

            return this;

        },

        rgb: function(r, g, b){
            if (this.obj.color){
                this.obj.color.setRGB(r, g, b);
            }

            return this;
        },

        intensity: function(i){
            if (this.obj.hasOwnProperty('intensity')){
                this.obj.intensity = i;
            }

            return this;
        },

        position: function(x, y, z){
            if (!_.isNull(x)){
                this.obj.position.x = x;
            }
            if (!_.isNull(y)){
                this.obj.position.y = y;
            }
            if (!_.isNull(z)){
                this.obj.position.z = z;
            }

            return this
        },

        move: function(x, y, z){ return this.position(x, y, z);}

    });

O3.RenderObject = RenderObject;