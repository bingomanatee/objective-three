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
