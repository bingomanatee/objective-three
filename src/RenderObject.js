function RenderObject(obj, params) {
    var def;
    if (_.isString(obj)) {
        def = obj.split(' ');
        obj = null;
    }

    if (_.isFunction(params)) {
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

    self.addListener('update', function () {
        self.update();
        self._cascade('update');
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
        /**
         *
         * @param mat {string || THREE.Material}
         * @returns {RenderObject}
         */
        mat: function (mat) {
            if (!mat) {
                return this.obj() instanceof THREE.Mesh ? this.obj().material : false;
            }

            if (_.isString(mat)) {
                if (this.display) {
                    mat = this.display.mat(mat).obj();
                }
            }

            if ((this.obj() instanceof THREE.Mesh)) {
                if (this.obj().setMaterial){
                    this.obj().setMaterial(mat);
                } else {
                    this.obj().material = mat;
                }
            }

            return this;
        },

        n: function (n) {
            this.name = n;
            return this
        },

        geo: function (geo) {

            if (!geo) {
                return this.obj()instanceof  THREE.Mesh ? this.obj().geometry : false;
            }
            if (this.obj() instanceof THREE.Mesh) {
                if (this.obj.setGeometry){
                    this.obj().setGeometry(geo);
                } else {
                    this.obj().geometry = geo;
                    this.obj().updateMorphTargets();
                }
            }
            return this;
        },

        obj: function (o) {
            if (o) {
                this.set_obj(obj);
            }
            return this._obj;
        },

        set_obj: function (obj) {
            var children = this.children;

            var parent;
            _.each(children, function (child) {
                this.remove(child);
            });

            if (this._obj && this._obj.parent) {
                parent = this._obj.parent;
                this._obj.parent.remove(this._obj);
            }
            this._obj = obj;
            if (parent) {
                parent.add(obj);
            }
            return this;
        },

        /**
         * passes through single or multiple values to the object
         * @param key
         * @param value
         */
        set: function (key, value) {
            if (_.isObject(key)) {
                _.each(key, function (value, key) {
                    this.set(key, value);
                }.bind(this));
            } else if (key && _.isString(key)) {
                this.obj()[key] = value;
            }
            return this;
        },

        _cascade: function (event, data) {
            _.each(this.children, function (c) {
                c.emit(event, data);
            });
        },

        update: function () {
            // OVERRIDE FOR SYSTEM LOGIC HERE
        },

        add: function (ro) {
            this.children.push(ro);
            this.obj().add(ro.obj());
            ro.parent = this;
        },

        /**
         * removes both the render object and its obj from the heirarchy
         * @param ro
         */

        remove: function (ro) {
            ro.parent = null;
            this.obj().remove(ro.obj());
            this.children = _.reject(this.children, function (child) {
                return child === ro;
            })
        },

        detach: function () {
            if (this.parent) {
                this.parent.remove(this);
            }
        },

        at: function (x, y, z) {
            var o = this.obj();

            if (x instanceof THREE.Vector3){
                o.position.copy(x);
            } else {
                o.position.x = x;
                o.position.y = y;
                o.position.z = z;
            }

            return this;
        },

        rotX: function(v){
            this.obj().rotateX(v);
            return this;
        },


        rotY: function(v){
            this.obj().rotateY(v);
            return this;
        },


        rotZ: function(v){
            this.obj().rotateZ(v);
            return this;
        },

        transX: function(v){
            this.obj().translateX(v);
            return this;
        },


        transY: function(v){
            this.obj().translateY(v);
            return this;
        },


        transZ: function(v){
            this.obj().translateZ(v);
            return this;
        },

        light: function (type) {
            var p = RenderObject.LIGHT_PROTOS[type || 'point'] || THREE.PointLight;
            return this.set_obj(new p());
        },

        /**
         * setting the RGB of the object. 
         * To avoid side effects, the material is cloned the first time this method is called. 
         * 
         * @param r {number || Array || THREE.Color} (optional) if absent, the material color is returned unchanged.
         * @param g {number} optional
         * @param b {number} optional
         * @returns {*}
         */
        rgb: function (r, g, b) {
            if (arguments.length < 1){
                return this.obj().material.color;
            }

            if (_.isArray(r)) {
                b = r[2] || 0;
                g = r[1] || 0;
                r = r[0] || 0;
            }
            
            if (!this.obj().material.__color_clone){
                this.obj().material = this.obj().material.clone();
                this.obj().material.__color_clone = true;
                this.obj().material.__original_ro = this.id;
            }
            
            if (this.obj().material.color) {
                if (r instanceof THREE.Color) {
                    this.obj().material.color = r;
                } else {
                    this.obj().material.color.setRGB(r, g, b);
                }
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
            if (arguments.length) {

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

RenderObject.LIGHT_PROTOS = {
    point: THREE.PointLight,
    spot: THREE.SpotLight,
    distance: THREE.DirectionalLight,
    hemi: THREE.HemisphereLight,
    sun: THREE.DirectionalLight,
    ambient: THREE.AmbientLight,
    area: THREE.AreaLight
};