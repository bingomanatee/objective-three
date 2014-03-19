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

    _.extend(this, params);
    this.name = name;
    this.display = display;

    this.on('position', this.reposition.bind(this));
}

O3.util.inherits(Infinite, EventEmitter);

_.extend(Infinite.prototype, {

    reposition: function (center) {

        _.each(this.display.find({tile: true}), function (ro) {
            ro.active = false; // marking all tiles for reuse/garbage collection
        });

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
    },

    handle_tile: function (iter) {
        var inactive_tiles = this.display.find({tile: true, active: false});
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
            old_tile_at.active = true;
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
        tile.active = true;
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
        if (!this._cube_mesh) {
            this._cube_mesh = new THREE.CubeGeometry(this.tile_size, this.tile_size, this.tile_size);
        }
        var tile = this.display.ro('tile ' + JSON.stringify(iter), {tile: true, active: true});
        tile.geo(this._cube_mesh).mat(this.tile_mat(iter));
        return tile;
    },

    locate_tile: function (tile, iter) {
        return tile.at(( iter.i || 0) * this.tile_size, (iter.j | 0) * this.tile_size, (iter.k || 0) * this.tile_size);
    },

    make_tile: function (iter) {
        var cube = _.first(this.display.find({tile: true, active: false})) || this.new_tile(iter);
        this.locate_tile(cube, iter);
        cube.active = true;
        return cube;
    }

});
O3.Infinite = Infinite;