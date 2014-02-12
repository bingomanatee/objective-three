/**
 * A Display governs all activity targeting a specific output div.
 * @param name {string}
 * @param params {Object}
 * @constructor
 */

function Display(name, params) {

    this.name = name;
    this._width = 100;
    this._height = 100;
    this._scenes = {};
    this._cameras = {};
    this._objects = [];
    this.active = true;
    this.update_on_animate = true;

    if (params) {

        var tokens = _.pick(params, Display.PROPERTIES);
        delete params.width;
        delete params.height;
        _.extend(this, params);
        _.each(tokens, function (value, name) {
            this[name].call(this, value);
        }, this);
    }

    this.on('resize', function () {
        this.renderer.setSize(this.width(), this.height());
        _.each(this._cameras, function (c) {
            if (c.aspect) {
                c.aspect = this.width() / this.height();
                c.updateProjectionMatrix();
            }
        }, this);
    }.bind(this));
}

O3.util.inherits(Display, EventEmitter);

_.extend(
    Display.prototype, {

        add: function (object, scene) {
            this._objects.push(object);

            var s = this.scene(scene);
            s.add(object.content);
            object.scene = s;
            object.parent = this;
        },

        remove: function (object) {
            object.scene.remove(object.content);
            this._objects = _.reject(this._objects, function (o) {
                return o === object;
            });
        },

        destroy: function () {
            this.emit('destroy');
        },

        scenes: function () {
            return _.keys(this._scenes);
        },

        camera: function (name, value) {

            if (_.isObject(name)) {
                value = name;
                name = '';
            }

            if (!name) {
                name = this._default_camera || 'default';
            }
            if (value || !this._cameras[name]) {

                var self = this;
                this._cameras[name] = _.extend(value || new THREE.PerspectiveCamera(),
                    {
                        name:     name,
                        activate: function () {
                            self._default_camera = this.name;
                        }
                    }
                )
                this._cameras[name].aspect = this.width() / this.height(); // note - irrelevant (but harmless) for orthographic camera
                this._cameras[name].updateProjectionMatrix();

                this.emit('camera added', this._cameras[name]);
            }

            return this._cameras[name]
        },

        /**
         * note - unlike other properties, this class is not set up to
         * be updated more than once.
         *
         * @param renderer
         * @returns {*|THREE.WebGLRenderer}
         */
        renderer: function (renderer) {

            if (renderer || !this._renderer) {
                this._renderer = renderer || new THREE.WebGLRenderer();
            }

            this._renderer.setSize(this.width(), this.height());

            return this._renderer;
        },

        scene: function (name, value) {

            if (_.isObject(name)) {
                value = name;
                name = '';
            }

            if (!name) {
                name = this._default_scene || 'default';
            }
            if (value || !this._scenes[name]) {

                var self = this;
                this._scenes[name] = _.extend(value || new THREE.Scene(),
                    {
                        name:     name,
                        activate: function () {
                            self._default_scene = this.name;
                        }
                    }
                )
                ;
                this.emit('scene added', this._scenes[name]);
            }
            return this._scenes[name]
        },

        size: function (w, h) {
            if (arguments.length) {
                var old_height = this.height(), old_width = this.height();
                this.width(w, true);
                this.height(h, true);
                this.emit('resized', this._width, this._height, old_width, old_height);
            }
            return [this.width(), this.height()];
        },

        height: function (value, noEmit) {
            if (arguments.length && (value != this._height)) {
                var old_height = this.height(), old_width = this.width();
                O3.util.assign(this, '_height', value,
                    O3.util.as_test(_.isNumber, 'height must be a number'),
                    function (v) {
                        if (v <= 0) {
                            return 'height must be > 0'
                        }
                    }
                );
                if (!noEmit) {
                    this.emit('resized', this._width, this._height, old_width, old_height);
                }
            }

            return this._height;
        },

        width: function (value, noEmit) {

            if (arguments.length && value != this._width) {
                var old_height = this._height, old_width = this._width;
                O3.util.assign(this, '_width', value,
                    O3.util.as_test(_.isNumber, 'width must be a number'),
                    function (v) {
                        return v <= 0 ? 'width must be > 0' : false;
                    }
                );
                if (!noEmit) {
                    this.emit('resized', this._width, this._height, old_width, old_height);
                }
            }

            return this._width;
        },

        update: function (from_ani) {
            _.each(this._objects, function (o) {
                if ((!from_ani) || (o.update_on_animate)) {
                    o.emit('update');
                }
            })
        },

        animate: function () {
            if (!this.active) {
                return;
            }
            if (this.update_on_animate) {
                this.update(true);
            }
            this.renderer().render(this.scene(), this.camera());
        }

    });

Display.PROPERTIES = [ 'width', 'height', 'camera', 'scene', 'renderer'];