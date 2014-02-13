

function RenderObject(obj, params) {
    var def;
    if (_.isString(obj)) {
        def = obj.split(' ');
        obj = null;
    }

    if (_.isFunction(params)){
        params = {
            update: params
        }
    }

    this._obj = obj || new THREE.Object3D();
    this.display = null;
    this.update_on_animate = true;

    this.children = [];
    this.parent = null;

    var self = this;

    self.addListener('refresh', function () {
        self.update();
        self._cascade('refresh');
    });

    _.extend(this, params);

    if (def) {
        switch (def[1]) {
            case 'light':
                this.light(def[0]);
        }
    }
    this.id = ++RenderObject.__id;

}

RenderObject.__id = 0;
O3.util.inherits(RenderObject, EventEmitter);

_.extend(
    RenderObject.prototype, {

        obj: function(o){
            if(o){
                this._obj = o;
            }
            return this._obj;
        },

        set: function(key, value){
            this.obj()[key] = value;
        },

        _cascade: function (event, data) {
            _.each(this.children, function (c) {
                c.emit(event, data);
            });
        },

        update: function () {

        },

        add: function (ro) {
            this.children.push(ro);
            this.obj().add(ro.obj());
            ro.parent = this;
        },

        remove: function (ro) {
            ro.parent = null;
            this.obj.remove(ro.obj);
        },

        detach: function () {
            if (this.parent) {
                this.parent.remove(this);
            }
        },

        at: function (x, y, z) {
            var o = this.obj();
            o.position.x = x;
            o.position.y = y;
            o.position.z = z;

            return this;
        },

        light: function (type) {
            if (!type) {
                type = 'point';
            }
            switch (type) {
                case 'point':
                    this.type = 'POINT_LIGHT';

                    this.obj(new THREE.PointLight());
                    break;

                case 'directional':
                case 'sun':
                    this.obj(new THREE.DirectionalLight());
                    break;

                case 'ambient':
                    this.obj(new THREE.AmbientLight());

            }

            return this;

        },

        rgb: function (r, g, b) {
            if (this.obj().color) {
                this.obj().color.setRGB(r, g, b);
            }

            return this;
        },

        intensity: function (i) {
            if (this.obj().hasOwnProperty('intensity')) {
                this.obj().intensity = i;
            }

            return this;
        },

        position: function (x, y, z) {
            var o = this.obj();
            if (arguments.length){

            if (!_.isNull(x) || (!_.isUndefined(x))) {
                o.position.x = x;
            }
                if (!_.isNull(y) || (!_.isUndefined(y))) {
                o.position.y = y;
            }
                if (!_.isNull(z) || (!_.isUndefined(z))) {
                o.position.z = z;
            }
        }

            return o.position;
        },

        move: function (x, y, z) {
            return this.position(x, y, z);
        }
    });

O3.RenderObject = RenderObject;