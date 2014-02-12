
(function(root, factory) {
    if(typeof exports === 'object') {
        module.exports = factory(require('underscore'), require('three'), require, exports, module);
    }
    else if(typeof define === 'function' && define.amd) {
        define('O3', ['_', 'THREE', 'require', 'exports', 'module'], factory);
    }
    else {
        var req = function(id) {return root[id];},
            exp = root,
            mod = {exports: exp};
        root.O3 = factory(root._, root.THREE, req, exp, mod);
    }
}(this, function(_, THREE, require, exports, module) {
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
    else if (_.isObject(this._events[type]))
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
    };

    var _proto = {

        reset: function () {
            _.each(this.displays, function (d) {
                d.destroy();
            });
            this.displays = {};
        },

        displays: {},
        display:  function (name, params) {
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
        }, util:  {
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
                        value:        ctor,
                        enumerable:   false,
                        writable:     true,
                        configurable: true
                    }
                });
            }
        },

        _start_time: 0,
        _ani_time:   0,
        time:        function () {
            return this._ani_time - this._start_time;
        },

        animate: function () {
            if (!this._start_time) {
                this._start_time = new Date().getTime();
            }
            this._ani_time = new Date().getTime();

            _.each(this.displays, function (display) {
                display.animate();
            });

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
function RenderObject(content, params) {
    this.content = content;
    this.display = null;
    this.update_on_animate = true;

    this.children = [];
    this.parent = null;

    var self = this;

    _.each(['update'], function(event){
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
            this.content.add(ro.content);
            ro.parent = this;
        },

        remove: function(ro){
            ro.parent = null;
            this.content.remove(ro.content);
        },

        detach: function(){
            if (this.parent){
                this.parent.remove(this);
            }
        }
    });

O3.RenderObject = RenderObject;
    return O3;
}));
