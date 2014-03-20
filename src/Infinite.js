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
    this.inactive_tiles = [];
    this.active_tiles = [];
    this.composites = [];
    this.on('position', this.reposition.bind(this));

    this.worker = new Worker('compress_geometry.js');

    this.worker.onmessage = this.cg_worker_msg.bind(this);

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

    reposition: function (center) {
        this.inactive_tiles = this.tiles.slice();
        this.active_tiles = [];

        // @TODO: validate that center is Vector3

        var loop = Fools.loop(this.handle_tile.bind(this));

        var i = 0, j = 0, k = 0;

        if (this.dimensions.x) {
            i = Math.round(center.x / this.tile_size);
            loop.dim('i', i - this.range, i + this.range)
        }

        if (this.dimensions.y) {
            j = Math.round(center.y / this.tile_size);
            loop.dim('j', j - this.range, j + this.range)
        }

        if (this.dimensions.z) {
            k = Math.round(center.z / this.tile_size);
            loop.dim('k', k - this.range, k + this.range)
        }

        console.log('repositioning to ', i, j, k);

        loop();

        if (this.compression_factor > 1) {
            this.compress();
        }
    },

    compress: function () {

        var uncompressed_tiles = _.reject(this.active_tiles, function (tile) {
            return tile.compressed;
        });

        var by_group = _.groupBy(uncompressed_tiles, function (tile) {
            var index = tile.obj().material.name;
            console.log('material: ', index);
            return index;
        }, this);

        _.each(by_group, function(tiles, name){
            var ids = _.pluck(tiles, 'id');
            var geos = _.map(tiles, function(tile){
               var geo = tile.obj().geometry;
                 var geo_data = O3.util.geo_to_JSON(geo);


            });
        });

        _.each(by_group, function (group) {
            var geo = new THREE.Geometry();
            var mats = [];
            if (group.length > 1) {
                _.each(group, function (tile) {
                    this.display.remove(tile);
                    THREE.GeometryUtils.merge(geo, tile.obj());
                    mats.push(tile.material);
                }, this);

            }
            mats = _.uniq(mats);
            var mesh = new THREE.Mesh(geo, mats[0]);

            var composite = this.display.ro(mesh);
            _.each(group, function (tile) {
                tile.compressed = true;
            })
        }, this);

    },

    activate: function (tile) {
        this.inactive_tiles = _.difference(this.inactive_tiles, [tile]);
        this.active_tiles.push(tile);
    },

    handle_tile: function (iter) {
        var inactive_tiles = this.inactive_tiles;
        var old_tile_at = _.find(inactive_tiles, function (tile) {
            if (iter.hasOwnProperty('i') && (iter.i != tile.i)) {
                return false;
            }
            if (iter.hasOwnProperty('j') && (iter.j != tile.j)) {
                return false;
            }
            if (iter.hasOwnProperty('k') && (iter.k != tile.k)) {
                return false;
            }
            return true;
        });

        if (old_tile_at) {
            console.log('old tile exists - not changing', iter);
            this.activate(old_tile_at);
            return; // tile is in place -- don't do anything.
        }
        var tile;
        if (inactive_tiles && inactive_tiles.length) {
            tile = _.first(inactive_tiles);
            // console.log('reusing ', tile);
            this.update_tile(tile, iter);
        } else {
            tile = this.make_tile(iter);
        }
        this.activate(tile);
    },

    tile_mat: function (iter) {
        return 'infinite cube';
    },

    update_tile: function (tile, iter) {
        //   console.log('reusing tile at', iter);
        this.locate_tile(tile, iter).mat(this.tile_mat(iter));
    },

    new_tile: function (iter) {
        console.log('making tile at', iter);
        if (!this._cube_geo) {
            this._cube_geo = new THREE.CubeGeometry(this.tile_size, this.tile_size, this.tile_size);
        }
        var tile = this.display.ro('tile ' + JSON.stringify(iter), _.extend({tile: true, active: true}, iter));
        tile.geo(this._cube_geo).mat(this.tile_mat(iter)).rotX(Math.PI / -2);
        this.tiles.push(tile);
        return tile;
    },

    locate_tile: function (tile, iter) {
        return tile.at(
            (iter.i || 0) * this.tile_size,
            (iter.j || 0) * this.tile_size,
            (iter.k || 0) * this.tile_size
        );
    },

    /**
     * places a new tile at the iter position
     * @param iter {object}
     * @returns {O3.RenderObject}
     */
    make_tile: function (iter) {
        var cube = this.new_tile(iter);
        this.locate_tile(cube, iter);
        this.activate(cube);
        return cube;
    }

});
O3.Infinite = Infinite;