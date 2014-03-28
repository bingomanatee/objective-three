(function () {

  /**
   * Basic setup of O3 scene
   */
  var display = O3.display('infinite display', {width: window.innerWidth, height: window.innerHeight});

  display.append(document.body);
  display.scene().fog = new THREE.FogExp2(0xd0e0f0, 0.005);
  // display.renderer(new THREE.WebGLDeferredRenderer({scale: 1, width: window.innerWidth, height: window.innerHeight}));
  display.shadows(true);

  var GRADS = 6;

  display.mat('building', {type: 'phong', shadow: 1}).color(0.8, 0.8, 1);
  display.mat('house', {parent: 'building', shadow: 1}).color(0.25, 0, 0);
  display.mat('apt', {parent: 'building', shadow: 1}).color(0.13, 0.2, 0);
  display.mat('tower', {parent: 'building', shadow: 1}).color(0.25, 0.25, 0.33);
  display.mat('skyscraper', {parent: 'building', shadow: 1}).color(0.2, 0.2, 0.3);
  display.mat('road', {type: 'lambert', shadow: 1}).color(0, 0.2, 0.4);

  // a ground plane for reference
  var plane = display.ro('ground_plane', new THREE.PlaneGeometry(5000, 5000)).mat('road');
  plane.shadows(true);

  plane.rotX(Math.PI / -2);
  display.light('sun')
    .at(0.1, 1, 0.5)
    .shadows(true, {cheight: 5000, cwidth: 5000, mheight: 1024, mwidth: 1024});

  var camera_ro = display.ro('camera_ro', function () {
    this.transZ(1);

    var pos = this.obj().position.clone();
    pos.z += (-infinite.tile_size * infinite.range);
    if ((!this.last_inf_pos) || (this.last_inf_pos.distanceTo(pos) > infinite.tile_size * 2)) {
      infinite.reposition(pos);
      this.last_inf_pos = pos;
    }

  });

  var camera_rot = new O3.RenderObject(display.camera()).rotX(Math.PI / -5);
  camera_ro.at(0, 100, -10).add(camera_rot);

  function _height(iter, u, v){
    if (!u)u = 0;
    if (!v) v = 0;

    var angle = (iter.i + u) * Math.PI / 5;
    var angle2 = (iter.k + (1 - v)) * Math.PI / 5;

    return (2 + Math.sin(angle) + Math.cos(angle2)) * 10;
  }

  /**
   * Setup of infinite repeater
   *
   */

  function _pyrimid(n) {
    var index = Math.abs(Math.abs(n) % 12 - 5);
    return index;
  }

  // while not a requirement we are naming tiles based on their initial placement for debugging.
  function _color_name(iter) {
    iter = _.extend({i: 0, j: 0, k: 0}, iter);
    var i = Math.abs(iter.i) % GRADS;
    var j = Math.abs(iter.j) % GRADS;
    var k = Math.abs(iter.k) % GRADS;
    return  'infinite cube ' + [i, j, k].join(' ');
  }

  var infinite = new O3.Infinite('ground', display, {
    range: 15,
    tile_size: 5,
    threshold: 5,
    max_compression_time: 50,
    min_compressions: 10,

    compression_throttle_cooldown: 100,
    BUILDING_TYPES: [ 'house', 'apt', 'building', 'tower', 'skyscraper'],
    meshes: [],

    tile_height: function (iter) {
      return _height(iter);
    },

    has_tile: function (iter) {
      return this.tile_height(iter) > 0;
    },

   echo: 0,
    tile_geo: function (iter) {
     /* var height = this.tile_height(iter);
      if (height > 0) {
        if (!this.meshes[height]) {
          this.meshes[height] = new THREE.CubeGeometry(this.tile_size, this.tile_size * height * 2, this.tile_size, 2, this.tile_size * 2, 2);
        }
        return this.meshes[height];
      } else {
        return new THREE.Object3D();
      }*/

      var INC = 8;
      var ts = this.tile_size;
       var geo =  new THREE.ParametricGeometry(function(u, v){
         height = _height(iter, u, v);
         if (u > 0 && u < 1 && v > 0 && v < 1) height += Math.random() * ts / INC;
        return new THREE.Vector3(ts * u, height, ts * -v);
      }, INC, INC);
      if (this.echo++ < 5) {
        console.log('geo:', geo);
      }
      return geo;
    },

    tile_mat: function (iter) {
      var height = Math.round(this.tile_height(iter)/20);
      height = Math.max(0, height) % this.BUILDING_TYPES.length;

      return this.BUILDING_TYPES[height] || 'skyscraper';
    }
  });

  infinite.reposition(new THREE.Vector3());
  O3.animate();

})
  ();