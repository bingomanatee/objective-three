/**
 * O3 is a singleton sandbox to manage all displays.
 * In order to give it the ability to implement events we make it the only instance of  a private
 * class _O3.
 *
 */

var O3 = (function () {

    function _O3() {
        this.displays = {};
    };

    var _proto = {

        reset: function(){
            _.each(this.displays, function(d){
                d.destroy();
            });
            this.displays = {};
        },

        displays:       [],
        display: function (name, params) {
            if (!this.displays[name]){
                var display = new O3.Display(name, params);
                this.displays[name] = display;
                this.emit('display', name, display);
            }
            return this.displays[name];
        }, util:        {
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
                    return fn(v) ? false: msg;
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
        }
    };

    _proto.util.inherits(_O3, EventEmitter);

    _.extend(_O3.prototype, _proto);

    return new _O3();

})();
