/**
 * A Display governs all activity targeting a specific output div.
 * @param params
 * @constructor
 */

function Display(name, params) {

    this.name = name;
    this._width = 100;
    this._height = 100;
    this._scenes = {};

    if (params) {

        var tokens = _.pick(parmas, 'width', 'height');
        delete params.width;
        delete params.height;
        _.extend(this, params);
        _.each(tokens, function (value, name) {
            this.call(name, this, value);
        }, this);
    }
}

O3.util.inherits(Display, EventEmitter);

_.extend(
    Display.prototype, {

        destroy: function () {
            this.emit('destroy');
        },

        scene: function (name) {
            if (!name) {
                name = 'default';
            }
            if (!this._scenes[name]) {
                this._scenes[name] = new THREE.Scene();
                this.emit('scene added', this._scenes[name]);
            }
            return this._scenes[name]
        },

        height: function (value) {
            if (arguments.length && (value != this._height)) {
                var old_height = this._height, old_width = this._width;
                O3.util.assign(this, '_height', value,
                    O3.util.as_test(_.isNumber, 'height must be a number'),
                    function (v) {
                        if (v <= 0) {
                            return 'height must be > 0'
                        }
                    }
                );
                this.emit('resized', this._width, this._height, old_width, old_height);
            }

            return this._height;
        },

        width: function (value) {

            if (arguments.length && value != this._width) {
                var old_height = this._height, old_width = this._width;
                O3.util.assign(this, '_width', value,
                    O3.util.as_test(_.isNumber, 'width must be a number'),
                    function (v) {
                        return v <= 0 ? 'width must be > 0' : false;
                    }
                );
                this.emit('resized', this._width, this._height, old_width, old_height);
            }

            return this._width;
        }


    });

O3.Display = Display;