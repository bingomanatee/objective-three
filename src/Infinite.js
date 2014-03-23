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
    this.threshold = 1;
    this.compression_factor = 2; // the number of tiles / per dimension to compress
    _.extend(this, params);
    this.name = name;
    this.display = display;

    this.tiles = [];
    this._composites = {};

    this.on('position', this.reposition.bind(this));

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
        } catch (err) {
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

     /*   if (this.compression_factor > 1) {
            this.compress();
        }*/
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

        var max_value = 0;
        var diff = 0;

        var new_center_ijk = _.reduce(this._ijk_to_xyz, function (new_center, xyz, ijk) {
            if (this.dimensions[xyz]) {
                new_center[ijk] = this['_c' + ijk](center_xyz);
            }
            return new_center;

        }.bind(this), {});

        var old_center_ijk = this.center_ijk;
        this.center_ijk = new_center_ijk;

        console.log('before deactivate: ',  this.active_tiles().length, 'active,', this.inactive_tiles().length, 'inactive');
        this.deactivate_distant();
        console.log('after deactivate: ',  this.active_tiles().length, 'active,', this.inactive_tiles().length, 'inactive');

        var t = new Date().getTime();

        var reps = 0, updates = 0;

        function _index(tile) {
            return [tile.i || 0, tile.j || 0, tile.k || 0].join(' ');
        }

        var ti = new Date().getTime();
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
                this._inactive_tiles = _.difference(this._inactive_tiles, [index[key]]);
            }
        }.bind(this));
        var ti2 = new Date().getTime();

        _.each({x: 'i', y: 'j', z: 'k'}, function (ijk, dim) {
            if (this.dimensions[dim]) {
                var value = this.center_ijk[ijk] = this['_c' + ijk](center_xyz);
                loop.dim(ijk)
                    .min(value - this.range)
                    .max(value + this.range);
            }
        }, this);

        loop();

        //    console.log('after looping: ',  this.active_tiles().length, 'active,', this.inactive_tiles().length, 'inactive');

        console.log('reps: ', reps,
            'updates: ', updates,
            'tiles: ', this.tiles.length,
            'tiles made: ', this._new_tiles,
            'objects: ', this.display._objects.length,
            'handle time: ', new Date().getTime() - t,
            'index: ', ti2 - ti);

        var expected = Math.pow((2 * this.range + 1), this.dim_count());

        var ratio = this.tiles.length / expected;

        console.log('expected:', expected, 'actual: ', this.tiles.length, 'ratio: ', ratio);
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

        var t = new Date().getTime();
        var tiles = this.active_tiles();
        var t1 = new Date().getTime();

        console.log(tiles.length, 'deactivating tiles too far from ', JSON.stringify(this.center_ijk));
        _.each(tiles, function (tile) {
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

    compress: function () {

        var t = new Date().getTime();

        var uncompressed_tiles = _.reject(this.tiles, function (tile) {
            return tile.comp;
        });

        console.log('uncom: ', uncompressed_tiles.length);
        var by_group = _.groupBy(uncompressed_tiles, function (tile) {
            return tile.obj().material.name;
        }, this);

        _.each(by_group, function (mat_tiles, name) {
            if (mat_tiles.length < 2) {
                return;
            }

            var geo;

            if (this._composites[name]) {
                geo = this._composites[name].obj().geometry.clone();
                this.display.remove(this._composites[name]);
            } else {
                geo = new THREE.Geometry();
            }

            _.each(mat_tiles, function (t2) {
                THREE.GeometryUtils.merge(geo, t2.obj());
                t2.comp = true;
                // t2.obj(new THREE.Object3D());
                t2.set('visible', false);
            });

            this._composites[name] = this.display.ro(name + '_merged', geo).mat(name);

        }, this);

        console.log('compressed in ', new Date().getTime() - t, 'ms');

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

    /**
     *
     * create or recycle a tile
     * @param iter {Object} ijk
     */
    handle_tile: function (iter) {
        var inactive_tile = _.find(this.tiles, function(tile){
            return !tile.active;
        });

        if (inactive_tile) {
            this.update_tile(inactive_tile, iter);
            this.activate(inactive_tile);
        } else {
            this.tiles.push(this.make_tile(iter));
        }
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
     */
    update_tile: function (tile, iter) {
        tile.compressed = false;
        this.locate_tile(tile, iter).mat(this.tile_mat(iter));
        _.extend(tile, iter);
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
        if (!this._cube_geo) {
            this._cube_geo = new THREE.CubeGeometry(this.tile_size, this.tile_size, this.tile_size);
        }
        var tile = this.display.ro('tile ' + JSON.stringify(iter),
            _.extend({tile: true, active: true, created: new Date().getTime()}, iter));
        tile.geo(this._cube_geo)
            .mat(this.tile_mat(iter));

     //   console.log('obj.rotateX: %s', require('util').inspect(tile.obj()),  { showHidden: true, depth: 1 });
        tile.rotX(Math.PI / -2);
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