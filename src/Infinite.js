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