(function () {

    /**
     * Basic setup of O3 scene
     */
    var display = O3.display('infiinite display', {width: window.innerWidth, height: window.innerHeight});

    display.append(document.body);
    display.scene().fog = new THREE.FogExp2(0xd0e0f0, 0.005);
    display.renderer().setClearColorHex(0xd0e0f0, 1);

    var GRADS = 6;

    display.mat('building', {type: 'phong'}).color(0.8, 0.8, 1);
    display.mat('house',{parent: 'building'}).color(1, 0, 0);
    display.mat('apt',{parent: 'building'}).color(0.33, 0.4, 0);
    display.mat('tower',{parent: 'building'}).color(0.25, 0.25, 0.33);
    display.mat('skyscraper',{parent: 'building'}).color(0.2, 0.2, 0.3);
    display.mat('road', {type: 'lambert'}).color(0, 0.2, 0.4);

    // a ground plane for reference
    var plane = display.ro('ground_plane', new THREE.PlaneGeometry(5000, 5000)).mat('road');

    plane.rotX(Math.PI / -2);
    display.light('sun').at(0.1, 1, 0.5);

    var camera_ro = display.ro('camera_ro', function () {
        this.transZ(-0.5);

        var pos = this.obj().position.clone();
        pos.z += (-infinite.tile_size * infinite.range);
        if ((!this.last_inf_pos) || (this.last_inf_pos.distanceTo(pos) > infinite.tile_size * 2)) {
            infinite.reposition(pos);
            this.last_inf_pos = pos;
        }

    });

    var camera_rot = new O3.RenderObject(display.camera()).rotX(Math.PI / -5);
    camera_ro.at(0, 100, -10).add(camera_rot);

    /**
     * Setup of infinite repeater
     *
     */

        // while not a requirement we are naming tiles based on their initial placement for debugging.
    function _color_name(iter) {
        iter = _.extend({i: 0, j: 0, k: 0}, iter);
        var i = Math.abs(iter.i) % GRADS;
        var j = Math.abs(iter.j) % GRADS;
        var k = Math.abs(iter.k) % GRADS;
        return  'infinite cube ' + [i, j, k].join(' ');
    }

    var infinite = new O3.Infinite('ground', display, {
        range:     25,
        tile_size: 15,
        threshold: 1,

        compression_factor: 2,

        meshes: [],

        tile_height: function (iter) {
            return Math.min(5, 3 + Math.floor(3 * Math.sin(iter.i * Math.PI / 7) - 4 * Math.cos(iter.k * Math.PI / 4)));
        },

        has_tile: function (iter) {
            return iter.i % 4 && iter.k % 4 && this.tile_height(iter) > 0;
        },

        tile_geo: function (iter) {
            var height = this.tile_height(iter);
            if (height > 0) {
                if (!this.meshes[height]) {
                    this.meshes[height] = new THREE.CubeGeometry(this.tile_size, this.tile_size * height * 2, this.tile_size);
                }
                return  this.meshes[height];
            } else {
                return new THREE.Object3D();
            }
        },

        tile_mat: function (iter) {
            var height = this.tile_height(iter);
            if (height <= 0){
                return road;
            }

            return ['', 'house','apt', 'building', 'tower', 'skyscraper'][height] || 'skyscraper';
        }
    });

    infinite.reposition(new THREE.Vector3());
    O3.animate();

})
    ();