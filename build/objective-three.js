// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var domain;

function EventEmitter() {
    EventEmitter.init.call(this);
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.usingDomains = false;

EventEmitter.prototype.domain = undefined;
EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

EventEmitter.init = function() {
    this.domain = null;
    if (EventEmitter.usingDomains) {
        // if there is an active domain, then attach to it.
        domain = domain || require('domain');
        if (domain.active && !(this instanceof domain.Domain)) {
            this.domain = domain.active;
        }
    }
    this._events = this._events || {};
    this._maxListeners = this._maxListeners || undefined;
};

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
    if (!_.isNumber(n) || n < 0 || isNaN(n))
        throw TypeError('n must be a positive number');
    this._maxListeners = n;
    return this;
};

EventEmitter.prototype.emit = function(type) {
    var er, handler, len, args, i, listeners;

    if (!this._events)
        this._events = {};

    // If there is no 'error' event listener then throw.
    if (type === 'error' && !this._events.error) {
        er = arguments[1];
        if (this.domain) {
            if (!er)
                er = new Error('Uncaught, unspecified "error" event.');
            er.domainEmitter = this;
            er.domain = this.domain;
            er.domainThrown = false;
            this.domain.emit('error', er);
        } else if (er instanceof Error) {
            throw er; // Unhandled 'error' event
        } else {
            throw Error('Uncaught, unspecified "error" event.');
        }
        return false;
    }

    handler = this._events[type];

    if (_.isUndefined(handler))
        return false;

    if (this.domain && this !== process)
        this.domain.enter();

    if (_.isFunction(handler)) {
        switch (arguments.length) {
            // fast cases
            case 1:
                handler.call(this);
                break;
            case 2:
                handler.call(this, arguments[1]);
                break;
            case 3:
                handler.call(this, arguments[1], arguments[2]);
                break;
            // slower
            default:
                len = arguments.length;
                args = new Array(len - 1);
                for (i = 1; i < len; i++)
                    args[i - 1] = arguments[i];
                handler.apply(this, args);
        }
    } else if (_.isObject(handler)) {
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
            args[i - 1] = arguments[i];

        listeners = handler.slice();
        len = listeners.length;
        for (i = 0; i < len; i++)
            listeners[i].apply(this, args);
    }

    if (this.domain && this !== process)
        this.domain.exit();

    return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
    var m;

    if (!_.isFunction(listener))
        throw TypeError('listener must be a function');

    if (!this._events)
        this._events = {};

    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (this._events.newListener)
        this.emit('newListener', type,
            _.isFunction(listener.listener) ?
                listener.listener : listener);

    if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
        this._events[type] = listener;
    else if (_.isArray(this._events[type]))
    // If we've already got an array, just append.
        this._events[type].push(listener);
    else
    // Adding the second element, need to change to array.
        this._events[type] = [this._events[type], listener];

    // Check for listener leak
    if (_.isObject(this._events[type]) && !this._events[type].warned) {
        var m;
        if (!_.isUndefined(this._maxListeners)) {
            m = this._maxListeners;
        } else {
            m = EventEmitter.defaultMaxListeners;
        }

        if (m && m > 0 && this._events[type].length > m) {
            this._events[type].warned = true;
            console.error('(node) warning: possible EventEmitter memory ' +
                'leak detected. %d listeners added. ' +
                'Use emitter.setMaxListeners() to increase limit.',
                this._events[type].length);
            console.trace();
        }
    }

    return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
    if (!_.isFunction(listener))
        throw TypeError('listener must be a function');

    var fired = false;

    function g() {
        this.removeListener(type, g);

        if (!fired) {
            fired = true;
            listener.apply(this, arguments);
        }
    }

    g.listener = listener;
    this.on(type, g);

    return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
    var list, position, length, i;

    if (!_.isFunction(listener))
        throw TypeError('listener must be a function');

    if (!this._events || !this._events[type])
        return this;

    list = this._events[type];
    length = list.length;
    position = -1;

    if (list === listener ||
        (_.isFunction(list.listener) && list.listener === listener)) {
        delete this._events[type];
        if (this._events.removeListener)
            this.emit('removeListener', type, listener);

    } else if (_.isObject(list)) {
        for (i = length; i-- > 0;) {
            if (list[i] === listener ||
                (list[i].listener && list[i].listener === listener)) {
                position = i;
                break;
            }
        }

        if (position < 0)
            return this;

        if (list.length === 1) {
            list.length = 0;
            delete this._events[type];
        } else {
            list.splice(position, 1);
        }

        if (this._events.removeListener)
            this.emit('removeListener', type, listener);
    }

    return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
    var key, listeners;

    if (!this._events)
        return this;

    // not listening for removeListener, no need to emit
    if (!this._events.removeListener) {
        if (arguments.length === 0)
            this._events = {};
        else if (this._events[type])
            delete this._events[type];
        return this;
    }

    // emit removeListener for all listeners on all events
    if (arguments.length === 0) {
        for (key in this._events) {
            if (key === 'removeListener') continue;
            this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = {};
        return this;
    }

    listeners = this._events[type];

    if (_.isFunction(listeners)) {
        this.removeListener(type, listeners);
    } else if (Array.isArray(listeners)) {
        // LIFO order
        while (listeners.length)
            this.removeListener(type, listeners[listeners.length - 1]);
    }
    delete this._events[type];

    return this;
};

EventEmitter.prototype.listeners = function(type) {
    var ret;
    if (!this._events || !this._events[type])
        ret = [];
    else if (_.isFunction(this._events[type]))
        ret = [this._events[type]];
    else
        ret = this._events[type].slice();
    return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
    var ret;
    if (!emitter._events || !emitter._events[type])
        ret = 0;
    else if (_.isFunction(emitter._events[type]))
        ret = 1;
    else
        ret = emitter._events[type].length;
    return ret;
};
/**
 * O3 is a singleton sandbox to manage all displays.
 * In order to give it the ability to implement events we make it the only instance of  a private
 * class _O3.
 *
 */

var O3 = (function () {

    function _O3() {
        this.displays = {};
        this.state = 'NOT STARTED';
        this._mats = {};
    };

    var _proto = {
        mats: function (filter) {
            return filter ? _.where(_.values(this._mats), filter) : _.values(this._mats);
        },

        mat: function (name, params, value) {
            if (!this._mats[name]) {
                params = params || {};
                _.extend(params, {context: this});
                this._mats[name] = new MatProxy(name, params, this);
                this._mats[name].addListener('refresh', function () {
                    O3.update_mat(name);
                })
            } else if (params) {
                if (_.isString(params)) {
                    this._mats[name].set(params, value);
                } else if (_.isObject(params)) {
                    this._mats[name].set_params(params);
                }
            }

            return this._mats[name];
        },

        update_mat: function (name) {
            var mat = this.mat(name);

            if (mat) {
                _.each(this.displays, function (d) {
                    d.update_mat(name);
                })
            }
        },

        reset: function () {
            _.each(this.displays, function (d) {
                d.destroy();
            });
            this.displays = {};
        },

        displays: {},
        display: function (name, params) {
            if (_.isObject(name)) {
                params = name;
                name = '';
            }

            if (!name) {
                name = 'default';
            }

            if (!this.displays[name]) {
                var display = new Display(name, params);
                this.displays[name] = display;
                this.emit('display', name, display);
            }
            return this.displays[name];
        }, util: {
            assign: function (target, field, value) {
                var args = _.toArray(arguments);

                if (args.length > 3) {
                    _.each(args.slice(3), function (test) {
                        var msg = test(value);
                        if (msg) {
                            throw new Error(msg);
                        }
                    });
                }

                target[field] = value;
            },

            as_test: function (fn, msg) {
                return function (v) {
                    return fn(v) ? false : msg;
                }
            },

            inherits: function (ctor, superCtor) { // taken from node.js
                ctor.super_ = superCtor;
                ctor.prototype = Object.create(superCtor.prototype, {
                    constructor: {
                        value: ctor,
                        enumerable: false,
                        writable: true,
                        configurable: true
                    }
                });
            },
            rgb: function (r, g, b) {
                var c = new THREE.Color();
                c.setRGB(r, g, b);
                return c;
            },
            /**
             * will return a number with AT MOST d significant digits.
             * @param n {float}
             * @param d {int}
             * @returns {number}
             */
            digits: function(n, d){
                var power = Math.pow(10, d);
                return Math.round(n * power)/power;
            }
        },

        _start_time: 0,
        _ani_time: 0,
        time: function () {
            return this._ani_time - this._start_time;
        },

        stop: function () {
            this.paused = true;
        },

        start: function () {
            this.paused = false;
            this.animate();
        },

        animate: function () {
            if (!this._start_time) {
                this._start_time = new Date().getTime();
            }
            this._ani_time = new Date().getTime();
            if (this.paused) {
                return;
            }
            this.emit('animate', this.time());
            _.each(this.displays, function (display) {
                display.animate(this.time());
            }, this);

            requestAnimationFrame(this.animate.bind(this));
        }
    };

    _proto.util.inherits(_O3, EventEmitter);

    _.extend(_O3.prototype, _proto);

    return new _O3();

})();

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
    this._mats = {};

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

    this.addListener('resized', function () {
        if (this._renderer) {
            this._renderer.setSize(this.width(), this.height());
        }
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

        mats: function (filter) {
            return filter ? _.where(_.values(this._mats), filter) : _.values(this._mats);
        },

        mat: function (name, params, value) {
            if (!this._mats[name]) {
                if (params === false) {
                    return null;
                }

                params = params || {};
                _.extend(params, {context: this});
                var p = new MatProxy(name, params);
                this._mats[name] = p;
                this._mats[name].addListener('refresh', function () {
                    p.emit('refresh');
                }.bind(this))
            } else if (params) {
                if (_.isString(params)) {
                    this._mats[name].set(params, value);
                } else if (_.isObject(params)) {
                    this._mats[name].set_params(params);
                }
            }
            return this._mats[name];
        },

        mat_values: function (name) {
            return _.reduce(_.compact([
                O3.mat(name).params(), local_mat(name).params()
            ], function (o, p) {
                return _.extend(o, p)
            }, {}));

        },

        add: function (object, scene) {
            this._objects.push(object);

            var s = this.scene(scene);
            s.add(object.obj());
            object.scene = s;
            object.display = this;
            return object;
        },

        I_HAVE_LIGHT: true,

        light: function (type, name) {
            var ro = new RenderObject().light(type);
            this.add(ro);
            return name ? ro.n(name) : ro;
        },

        ro: function () {
            var name, geo, mat, mesh, light, update, params;

            var args = _.toArray(arguments);

            _.each(args, function (a) {
                if (_.isString(a)) {
                    name = a;
                    return;
                }
                if (_.isObject(a)) {
                    if (a instanceof THREE.Geometry) {
                        geo = a;
                        return;
                    }
                    if (a instanceof THREE.Material) {
                        mat = a;
                        return;
                    }
                    if (a instanceof THREE.Mesh) {
                        mesh = a;
                        return;
                    }
                    if (a instanceof THREE.Light) {
                        light = a;
                        return;
                    }
                    params = a;
                    return;
                }

                if (_.isFunction(a)) {
                    if (params) {
                        params.update = a;
                    } else {
                        params = {
                            update: a
                        }
                    }

                }
            });

            mesh = mesh || light || new THREE.Mesh(geo, mat);

            var ro = new RenderObject(mesh, params);
            ro.name = name || 'ro #' + ro.id;
            ro.display = this;

            this.add(ro);

            return ro;

        },

        find: function (query) {
            return _.where(this._objects, query);
        },

        objects: function (readonly) {
            return readonly ? this._objects : this._objects.slice();
        },
        remove: function (object) {
            object.scene.remove(object.obj());
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
                        name: name,
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

            if (renderer) {
                this._renderer = renderer;
            } else if (!this._renderer) {
                this._renderer = new THREE.WebGLRenderer();
                this._renderer.setSize(this.width(), this.height());
            }

            this._extend_renderer();

            return this._renderer;
        },

        _extend_renderer: function () {
            if (!this._renderer._extended) {
                _.extend(this._renderer,
                    {
                        _extended: 1,

                        shadows: function (s, mode) {
                            if (!arguments.length) {
                                s = true;
                            }

                            this.shadowMapEnabled = s;

                            if (typeof mode != 'undefined') {
                                this.shadowMapType = mode || 0;
                            }

                            return this;
                        }
                    })
            }
        },

        shadows: function (s, m) {
            return this.renderer().shadows(s, m);
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
                        name: name,
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

        append: function (parent) {
            var dom = this.renderer().domElement;

            if (!dom) {
                throw new Error('no domElement on renderer');
            }
            parent.appendChild(dom);
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

        /**
         *
         * @param camera {Three.Camera} (optional)
         * @param scene {Three.Scene} (optional)
         */
        render: function (camera, scene) {
            this.renderer().render(scene || this.scene(), camera || this.camera());
        },

        /**
         * render continuously
         * @param t
         */
        animate: function (t) {
            this.emit('animate', t);
            _.each(this.objects(1), function (o) {
                o.emit('animate', t);
            });

            if (this.active && this.update_on_animate) {
                if (this.update_on_animate) {
                    this.update(true);
                }
                this.render();
            }
        }

    })
;

Display.PROPERTIES = [ 'width', 'height', 'camera', 'scene', 'renderer'];
/**
 * MatProy is a set of properties that the
 * @param name
 * @param params
 * @constructor
 */
function MatProxy(name, params) {
    this.name = name;
    this.context = null;
    if (_.isString(params)){
        params = {type: params};
    }
    if (params.context) {
        this.context = params.context;
        delete params.context;
    }
    this._params = params || {};
}

O3.util.inherits(MatProxy, EventEmitter);

_.extend(MatProxy.prototype, {

    set: function (prop, value) {
        this._params[prop] = value;
        this.update_obj();
    },

    color: function (r, g, b) {
        switch (arguments.length) {
            case 0:
                if (!this._params.color) {
                    this._params.color = new THREE.Color();
                }
                break;

            case 1:
                this._params.color = r.clone ? r.clone() : new THREE.Color(r);
                break;

            case 3:
                this._params.color = new THREE.Color().setRGB(r, g, b);
                break;

            default:
                throw new Error('write better code');
        }

        if (this._obj){
            this.update_obj();
        }
        return this._params.color;
    },

    get: function (prop) {
        return this._params.hasOwnProperty(prop) ? this._params[prop] : null;
    },

    set_params: function (props) {
        _.extend(this._params, props);
        this.update_obj();
    },

    parent: function () {
        var parent = this.get('parent');
        if (!parent) {
            return null;
        } else if (_.isString(parent) && (!this.name == parent)) {
            return this.context.mat(parent);
        } else {
            return null;
        }
    },

    params: function () {
        var out;
        var parent;
        var base;

        if (this._params.parent) {

            if (_.isString(this._params.parent) && this.context) {
                if (this._params.parent == this.name) {
                    console.log('circular parenting');
                } else {
                    parent = this.context.mat(this._params.parent).params();
                }
            } else if (_.isObject(this._params.parent)) {
                parent = this._params.parent;
            }
        }

        if (this.context !== O3) {
            base = O3.mat(this.name).params();
        }

        out = _.extend({type: 'basic'}, parent, base, this._params);

        _.each(out, function (v, p) {
            if (v && v.clone) {
                out[p] = v.clone();
            }
        });

        return out;
    },

    update_obj: function () {
        if (this.context !== O3) {
            if (this._obj) {
                _.extend(this._obj, this.params());
            }
        }

        _.each(this.children(), function (c) {
            c.update_obj();
        });
    },

    children: function () {
        if (!this.context) return [];
        var children = this.context.mats({parent: this.name});
        if (this.context == O3) {
            _.each(this.context.displays, function (d) {
                children = children.concat(d.mats({name: this.name}))
            }, this)
        }
        return children;
    },

    obj: function () {
        if (!this._obj) {

            var mat_values = this.params();

            if (_.isString(mat_values.type)) {
                if (THREE.hasOwnProperty(mat_values.type)) {
                    this._obj = new THREE[mat_values.type](mat_values);
                } else if (MatProxy.ALIASES[mat_values.type]) {
                    var name = MatProxy.ALIASES[mat_values.type];
                    if (THREE[name]) {
                        this._obj = new THREE[name]();
                        this.update_obj();
                    } else {
                        throw new Error('cannot find material class ' + name);
                    }
                } else {
                    throw new Error('cannot find material class ' + mat_values.type);
                }

            } else {
                this._obj = new mat_values.type(mat_values);
            }
        }

        if (!this._obj.name){
            this._obj.name = this.name;
        }
        return this._obj;
    },

    _on_update: function () {
        if (this._obj) {
            _.extend(this._obj, this.params());
        }
    }

});

MatProxy.ALIASES = {
    '': 'MeshBasicMaterial',
    shader: 'ShaderMaterial',
    spritecanvas: 'SpriteCanvasMaterial',
    'sprite': 'SpriteMaterial'
};

_.each('lambert,face,normal,phong,depth,basic'.split(','),
    function (base) {
        MatProxy.ALIASES[base] = MatProxy.ALIASES[base.toLowerCase()] = 'Mesh' + base.substr(0, 1).toUpperCase() + base.substr(1) + 'Material';
    });
O3.fast_geo_merge = function ( geometry1, object2 /* mesh | geometry */, materialIndexOffset ) {

  var matrix, normalMatrix,
    vertexOffset = geometry1.vertices.length,
    uvPosition = geometry1.faceVertexUvs[ 0 ].length,
    geometry2 = object2 instanceof THREE.Mesh ? object2.geometry : object2,
    vertices1 = geometry1.vertices,
    vertices2 = geometry2.vertices,
    faces1 = geometry1.faces,
    faces2 = geometry2.faces,
    uvs1 = geometry1.faceVertexUvs[ 0 ],
    uvs2 = geometry2.faceVertexUvs[ 0 ];

  if ( materialIndexOffset === undefined ) materialIndexOffset = 0;

  if ( object2 instanceof THREE.Mesh ) {

    object2.matrixAutoUpdate && object2.updateMatrix();

    matrix = object2.matrix;

    normalMatrix = new THREE.Matrix3().getNormalMatrix( matrix );

  }

  // vertices

  for ( var i = 0, il = vertices2.length; i < il; i ++ ) {

    var vertex = vertices2[ i ];

    var vertexCopy =  vertex; //vertex.clone();

    if ( matrix ) vertexCopy.applyMatrix4( matrix );

    vertices1.push( vertexCopy );

  }

  // faces

  for ( i = 0, il = faces2.length; i < il; i ++ ) {

    var face = faces2[ i ], faceCopy, normal, color,
      faceVertexNormals = face.vertexNormals,
      faceVertexColors = face.vertexColors;

    faceCopy = new THREE.Face3( face.a + vertexOffset, face.b + vertexOffset, face.c + vertexOffset );
    faceCopy.normal.copy( face.normal );

    if ( normalMatrix ) {

      faceCopy.normal.applyMatrix3( normalMatrix ).normalize();

    }

    for ( var j = 0, jl = faceVertexNormals.length; j < jl; j ++ ) {

      normal = faceVertexNormals[ j ].clone();

      if ( normalMatrix ) {

        normal.applyMatrix3( normalMatrix ).normalize();

      }

      faceCopy.vertexNormals.push( normal );

    }

    faceCopy.color.copy( face.color );

    for ( var j = 0, jl = faceVertexColors.length; j < jl; j ++ ) {

      color = faceVertexColors[ j ];
      faceCopy.vertexColors.push( color.clone() );

    }

    faceCopy.materialIndex = face.materialIndex + materialIndexOffset;

    faceCopy.centroid.copy( face.centroid );

    if ( matrix ) {

      faceCopy.centroid.applyMatrix4( matrix );

    }

    faces1.push( faceCopy );

  }

  // uvs

  for ( i = 0, il = uvs2.length; i < il; i ++ ) {

    var uv = uvs2[ i ], uvCopy = [];

    for ( var j = 0, jl = uv.length; j < jl; j ++ ) {

      uvCopy.push( new THREE.Vector2( uv[ j ].x, uv[ j ].y ) );

    }

    uvs1.push( uvCopy );

  }

}

var limit = 0;
/**
 * A Infinite monitors and reuses tiles to produce infinite spaces.
 * @param name {string}
 * @param params {Object}
 * @constructor
 */

function Infinite(name, display, params) {
  this.tile_size = 10; // the dimension of a single tile
  this.range = 4; // the number of tiles out that Infinite redraws
  this.dimensions = {
    x: true, y: false, z: true
  }; // by default, is a 2d planar mechanic
  this.threshold = 1; //the maximum distance before geometry is added
  // this.compression_factor = 10; // the number of compression changes before purging
  this.compression_throttle_cooldown = 200;
  this.min_vert_count_to_compress = 30;
  this.min_compressions = 2;
  this.max_compression_time = 100;
  _.extend(this, params);
  this.name = name;
  this.display = display;

  this.tiles = [];
  this._compressed_tiles = [];

  this.on('position', this.reposition.bind(this));
  this.display.mat('red', {type: 'phong'}).color(1, 0, 0);

  this.center = {};
  this.center_ijk = {};
  this._initialized = false;
}

O3.util.inherits(Infinite, EventEmitter);

_.extend(Infinite.prototype, {

  cg_worker_msg: function (msg) {
    var o;
    try {
      o = JSON.parse(msg);
    }
    catch (err) {
      console.log('non JSON message from worker: ', msg);
      return;
    }

    if (o) {

      if (o.err) {
        console.log('worker error: ', o.err);
      } else {
        console.log('message: ', o);
      }
    }
  },

  /**
   *
   * set the first set of tiles
   *
   * @param center_xyz {THREE.Vector3}
   */
  initialize: function (center_xyz) {

    // @TODO: validate that center is Vector3

    var loop = Fools.loop(this.handle_tile.bind(this));

    var i = 0, j = 0, k = 0;

    _.each({x: 'i', y: 'j', z: 'k'}, function (ijk, dim) {

      if (this.dimensions[dim]) {
        var value = this.center_ijk[ijk] = this['_c' + ijk](center_xyz);
        loop.dim(ijk)
          .min(value - this.range)
          .max(value + this.range);
      }
    }, this);

    loop();
  },

  _ci: function (center_xyz) {
    return Math.round(center_xyz.x / this.tile_size);
  },

  _cj: function (center_xyz) {
    return Math.round(center_xyz.y / this.tile_size);
  },

  _ck: function (center_xyz) {
    return Math.round(center_xyz.z / this.tile_size);
  },

  /**
   *
   * update tiles to a world coordinate
   *
   * @param center_xyz {THREE.Vector3}
   */
  reposition: function (center_xyz) {
    if (!this._initialized) {
      this.initialize(center_xyz);
      this._initialized = true;
    } else {
      this.update(center_xyz);
    }
  //  this.compress();
    
   // this.remove_distant_compressions()
  },

  remove_distant_compressions: function(){
    var good_comps = [];
    _.each(this._compressed_tiles, function(comp){

      var distance = this.ijk_distance(comp);
      if (distance > 3 * this.range * this.tile_size){
        this.display.remove(comp);
      } else {
        good_comps.push(comp);
      }

    }, this);
    this._compressed_tiles = good_comps;
  },

  _ijk_to_xyz: {i: 'x', j: 'y', k: 'z'},
  _xyz_to_ijk: {x: 'i', y: 'j', z: 'k'},

  has_ijk: function (ijk) {
    return this.dimensions[this._ijk_to_xyz[ijk]];
  },

  /**
   *
   * move or create tiles around new world coordinate
   *
   * @param center_xyz {THREE.Vector3}
   *
   */
  update: function (center_xyz) {

    // project a range along the greatest distance covered
    // that describes the extra overlap between the last position and the new one.

    var new_center_ijk = _.reduce(this._ijk_to_xyz, function (new_center, xyz, ijk) {
      if (this.dimensions[xyz]) {
        new_center[ijk] = this['_c' + ijk](center_xyz);
      }
      return new_center;

    }.bind(this), {});

    var distance = 0;
    _.each({x: 'i', y: 'j', z: 'k'}, function (ijk, dim) {
      if (this.dimensions[dim]) {
        distance += Math.abs(new_center_ijk[ijk] - this.center_ijk[ijk]);
      }
    }, this);

    if (distance > this.threshold){

      this.center_ijk = new_center_ijk;
      this.on_change_center();
    }
  },

  on_change_center: function () {

    //  console.log('before deactivate: ', this.active_tiles().length, 'active,', this.inactive_tiles().length, 'inactive');
    this.deactivate_distant();

    var tiles = [];
    _.each(this.tiles, function (tile) {
      if (tile.active) {
        tiles.push(tile);
      } else {
        this.display.remove(tile);
      }
    }, this);

    this.tiles = tiles;

    var reps = 0, updates = 0;

    function _index(tile) {
      return [tile.i || 0, tile.j || 0, tile.k || 0].join(' ');
    }

    //  var ti = new Date().getTime();
    var index = _.reduce(this.tiles, function (index, tile) {
      index[_index(tile)] = tile;
      return index;
    }, {});

    this._new_tiles = 0;

    var loop = Fools.loop(function (iter) {
      ++reps;
      var key = _index(iter);
      if (!index[key]) {
        ++updates;
        this.handle_tile(iter);
      } else if (!index[key].active) {
        index[key].active = true;
      }
    }.bind(this));
    //  var ti2 = new Date().getTime();

    _.each({x: 'i', y: 'j', z: 'k'}, function (ijk, dim) {
      if (this.dimensions[dim]) {
        var value = this.center_ijk[ijk];
        loop.dim(ijk)
          .min(value - this.range)
          .max(value + this.range);
      }
    }, this);

    loop();

    //    console.log('after looping: ',  this.active_tiles().length, 'active,', this.inactive_tiles().length, 'inactive');

    /*    console.log('reps: ', reps,
     'updates: ', updates,
     'tiles: ', this.tiles.length,
     'tiles made: ', this._new_tiles,
     'objects: ', this.display._objects.length,
     'handle time: ', new Date().getTime() - t,
     'index: ', ti2 - ti);*/

    this._safety_cleanup();
  },

  _safety_cleanup: function () {

    var expected = Math.pow((2 * this.range + 1), this.dim_count());
    var ratio = this.tiles.length / expected;

    //    console.log('expected:', expected, 'actual: ', this.tiles.length, 'ratio: ', ratio);
    if (ratio > 1.2) {
      var inactive = this.inactive_tiles();
      _.each(inactive, this.display.remove.bind(this.display));
      this.tiles = this.active_tiles();
    }
  },

  active_tiles: function () {
    var out = [];

    _.each(this.tiles, function (tile) {
      if (tile.active) {
        out.push(tile);
      }
    }, this);

    return out;
  },

  dim_count: function () {
    return _.reduce(this.dimensions, function (o, v, d) {
      return o + (v ? 1 : 0);
    });
  },

  // the military distance between tile and center;

  ijk_distance: function (tile) {
    return _.reduce(this.dimensions, function (distance, active, dim) {
      if (!active) {
        return distance;
      }
      var ijk = this._xyz_to_ijk[dim];
      var tile_value = this['_c' + ijk](tile.position());

      return distance + Math.abs(tile_value - this.center_ijk[ijk]);
    }, 0, this);
  },

  deactivate_distant: function () {
    var count = 0;

    //    var t = new Date().getTime();
    var tiles = this.active_tiles();
    //    var t1 = new Date().getTime();

    //  console.log(tiles.length, 'deactivating tiles too far from ', JSON.stringify(this.center_ijk));
    _.each(tiles, function (tile) {
      if (tile.comp){
        // don't deactivate compressed tiles
        return;
      }
      var distance = _.reduce(this.dimensions, function (distance, active, xyz) {
        if (!active || (distance > this.range)) {
          return distance;
        }

        var ijk = this._xyz_to_ijk[xyz];
        var center_value = this.center_ijk[ijk];
        var tile_value = tile[ijk];

        return Math.max(distance, Math.abs(center_value - tile_value))

      }, 0, this);

      if (distance > this.range) {
        //    console.log('tile: ', _.pick(tile, 'i','j', 'k'), 'center: ', this.center_ijk, 'distance: ', distance, 'max: ', max_distance);
        this.deactivate(tile);
        ++count;
      }
    }, this);
    var t2 = new Date().getTime();

    // console.log('getting active: ', t1 - t, 'deactivating: ', t2 - t1);
    return count;
  },

  _uncompressed_tiles: function () {
    return _.reject(this.tiles, function (tile) {
      return tile.comp || !tile.active;
    });
  },

  _compress_tiles: function (data, t) {
    var tiles = data.tiles;
    var geo = new THREE.Geometry();
   // console.log('pre compress time: ', new Date().getTime() - t);
    var c = 0;
    _.each(tiles, function (tile, i) {
      if (!tile.comp) {
        O3.fast_geo_merge(geo, tile.obj());
        tile.comp = true;
        this.display.remove(tile);
      }
      ++c;

    }, this);

    var tMove = new Date().getTime();
  //  console.log('compress time: ', tMove - t, 'desired compressions', tiles.length, 'actual', c);
    var first_point = geo.vertices[0];
    var min_x = first_point.x;
    var max_x = min_x;
    var min_y = first_point.y;
    var max_y = min_y;
    var min_z = first_point.z;
    var max_z = min_z;

    _.each(geo.vertices, function (v) {
      if (v.x < min_x) {
        min_x = v.x;
      } else if (v.x > max_x) {
        max_x = v.x;
      }
      if (v.y < min_y) {
        min_y = v.y;
      } else if (v.y > max_y) {
        max_y = v.y;
      }
      if (v.z < min_z) {
        min_z = v.z;
      } else if (v.z > max_z) {
        max_z = v.z;
      }
    });

    var x = Math.round((max_x + min_x) / 2);
    var y = Math.round((max_y + min_y) / 2);
    var z = Math.round((max_z + min_z) / 2);

    _.each(geo.vertices, function (v) {
      v.x -= x;
      v.y -= y;
      v.z -= z;
    })

    console.log('move time: ', new Date().getTime() - tMove);
    var ro = this.display.ro().geo(geo).at(x, y, z);
    ro.mat(data.mat);
    this._compressed_tiles.push(ro);
  },

  _compression_groups: function () {
    var tiles = this._uncompressed_tiles();

    var groups = _.groupBy(tiles, function (tile) {
      return tile.obj().material.name;
    });

    var data = _.sortBy(_.map(groups, function (group_tiles, name) {
      return {tiles: group_tiles, mat: name, count: _.reduce(tiles, function (o, tile) {
        return tile.obj().geometry.vertices.length + o;
      }, 0)}
    }), 'count');
    return data;
  },

  compress: function () {
    var t = new Date().getTime();
    if (this.compress_time && (t - this.compress_time < this.compression_throttle_cooldown)) {
      return;
    }

    var tiles = this._compression_groups();
    if (!tiles.length) {
      return;
    }


    _.each(tiles, function(data){
      this._compress_tiles(data, t);
    }, this);


  },

  /**
   *
   * recategorize a tile into the active tiles bin
   * optionally, removing it from the inactive tiles
   *
   * @param tile
   */
  activate: function (tile) {
    tile.active = true;
    tile.comp = false;
    if (!tile.parent && tile.obj().parent) {
      this.display.add(tile);
    }
    tile.set('visible', true);
  },

  /**
   *
   * recategorize a tile into the inactive tiles bin
   * optionally, removing it from the active tiles
   *
   * @param tile
   */
  deactivate: function (tile) {
    tile.active = false;
  },

  inactive_tiles: function () {
    var out = [];

    _.each(this.tiles, function (tile) {
      if (!tile.active) {
        out.push(tile);
      }
    }, this);

    return out;
  },

  has_tile: function (iter) {
    return true;
  },

  /**
   *
   * create or recycle a tile
   * @param iter {Object} ijk
   */
  handle_tile: function (iter) {
    if (!this.has_tile(iter)) {
      return;
    }
    var mat = this.tile_mat(iter);
    var inactive_tile = _.find(this.tiles, function (tile) {
      return (!tile.active) && (tile.obj().material.name == mat);
    });

    this.tiles.push(this.make_tile(iter));
    /*if (inactive_tile) {
     this.activate(inactive_tile);
     this.reuse_tile(inactive_tile, iter);
     } else {
     }*/
  },

  /**
   *
   * the color to use based on the location
   * override to customize
   *
   * @param iter {Object} ijk coordinates
   * @returns {string} the name of a material
   */
  tile_mat: function (iter) {
    return 'infinite cube';
  },

  /**
   *
   * Sets the properties of the tile based on its ikj coordinate
   *
   * @param tile {RenderObject}
   * @param iter {Object} the ijk coordinate
   *
   * DEPRECATED
   */
  reuse_tile: function (tile, iter) {
    tile.comp = false;
    this.locate_tile(tile, iter);
    this.emit('reuse', tile, iter);
    _.extend(tile, iter);
  },

  tile_geo: function (iter) {
    if (!this._cube_geo) {
      this._cube_geo = new THREE.CubeGeometry(this.tile_size, this.tile_size, this.tile_size);
    }
    return this._cube_geo;
  },

  /**
   *
   * Sets the geometry and material but not position of a new tile
   *
   * @param iter {obj} the ijk position of the tile -- useful for multi-type tiles.
   * @returns {O3.RenderObject}
   *
   */
  new_tile: function (iter) {
    ++this._new_tiles;
    var mat = this.tile_mat(iter);
    var geo = this.tile_geo(iter);

    //   console.log('iter:', iter,  'mat:', mat);
    var tile = this.display.ro('tile ' + JSON.stringify(iter),
      _.extend({tile: true,
          active: true,
          update_on_animate: false,
          created: new Date().getTime()}
        , iter)


    );
    tile.geo(geo)
      .mat(mat);
    return tile;
  },

  /**
   *
   * Sets the position of a tile based on its ijk coordinate
   *
   * @param tile {O3.RenderObject}
   * @param iter {Object} the ijk position of the tile
   * @returns {*|Array}
   */
  locate_tile: function (tile, iter) {
    tile.at(
      (iter.i || 0) * this.tile_size,
      (iter.j || 0) * this.tile_size,
      (iter.k || 0) * this.tile_size
    );
    _.extend(tile, iter);
    return tile;
  },

  /**
   *
   * places a new tile at the iter position
   *
   * @param iter {object}
   * @returns {O3.RenderObject}
   */
  make_tile: function (iter) {
    var tile = this.new_tile(iter);
    this.locate_tile(tile, iter);
    return tile;
  }

});
O3.Infinite = Infinite;
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

    this.on('obj', this.mat_to_shadow.bind(this));
    this.on('mat', this.mat_to_shadow.bind(this));

    this.id = ++RenderObject.__id;

}

RenderObject.__id = 0;
O3.util.inherits(RenderObject, EventEmitter);

_.extend(
    RenderObject.prototype, {

        mat_to_shadow: function () {
            var mat_proxy = this.mat_proxy();

            if (mat_proxy) {

                this.shadows(mat_proxy.params().shadow);
            }
        },

        shadows: function (shadow, params) {
            switch (shadow) {
                case 1:
                case 'on':
                case true:
                    this.set({castShadow: true, receiveShadow: true});
                    break;

                case 'cast':
                    this.set({castShadow: true, receiveShadow: false});
                    break;

                case 'receive':
                    this.set({castShadow: false, receiveShadow: true});
                    break;

                default:
                    this.set({castShadow: false, receiveShadow: false});

            }

            if (params) {
                this.config_shadow(params);
            }
        },

        config_shadow: function (params) {
            var self = this;
            var obj = this.obj();
            if (obj instanceof THREE.Light) {
                _.each(params, function (value, name) {
                    var dir = /(left|right|near|far|top|bottom)$/i.exec(name);
                    if (dir) {
                        var ord = dir[1].toLowerCase();
                        ord = 'shadowCamera' + ord.substr(0, 1).toUpperCase().concat(ord.substr(1));

                        obj[ord] = value;
                    } else {
                        switch (name.toLowerCase()) {

                            case 'cwidth':
                                obj.shadowCameraLeft = -value;
                                obj.shadowCameraRight = value;
                                break;

                            case 'cheight':
                                obj.shadowCameraTop = value;
                                obj.shadowCameraBottom = -value;
                                break;

                            case 'mwidth':
                                obj.shadowMapWidth = value;
                                break;

                            case 'mheight':
                                obj.shadowMapHeight = value;
                                break;

                            case 'shadow':
                                self.shadow(value);
                                break;

                            default:
                                console.log('unrecognized parameter ', name);
                        }
                    }

                })
            }

            return this;
        },

        /**
         * returns the material proxy for the object if it exists.
         *
         * @returns {O3.MatProxy || null}
         */
        mat_proxy: function () {
            if (!this._mat_proxy) {
                var obj = this.obj();
                if (obj && obj instanceof THREE.Mesh) {
                    if (obj.material && obj.material.name) {
                        this._mat_proxy = obj.material.name;
                        return this.get_mat();
                    } else {
                        return null;
                    }
                } else {
                    return null;
                }
            } else {
                return this.display.mat(this._mat_proxy);
            }
        },

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
                this._mat_proxy = mat;
                if (this.display) {
                    mat = this.display.mat(mat).obj();
                }
            }

            if ((this.obj() instanceof THREE.Mesh)) {
                if (this.obj().setMaterial) {
                    this.obj().setMaterial(mat);
                } else {
                    this.obj().material = mat;
                }
            }

            this.emit('mat');
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
                if (this.obj.setGeometry) {
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
                this.set_obj(o);
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
            this.emit('obj', obj);

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

            if (x instanceof THREE.Vector3) {
                o.position.copy(x);
            } else {
                o.position.x = x;
                o.position.y = y;
                o.position.z = z;
            }

            return this;
        },

        rotX: function (v) {
            this.obj().rotateX(v);
            return this;
        },

        rotY: function (v) {
            this.obj().rotateY(v);
            return this;
        },

        rotZ: function (v) {
            this.obj().rotateZ(v);
            return this;
        },

        transX: function (v) {
            this.obj().translateX(v);
            return this;
        },

        transY: function (v) {
            this.obj().translateY(v);
            return this;
        },

        transZ: function (v) {
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
            if (arguments.length < 1) {
                return this.obj().material.color;
            }

            if (_.isArray(r)) {
                b = r[2] || 0;
                g = r[1] || 0;
                r = r[0] || 0;
            }

            if (!this.obj().material.__color_clone) {
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