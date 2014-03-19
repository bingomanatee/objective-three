(function () {

    /**
     * Basic setup of O3 scene
     */
    var display = O3.display('infiinite display', {width: window.innerWidth, height: window.innerHeight});

    display.append(document.body);
    display.mat('plane', 'basic').color(1, 0.5, 1);

    Fools.loop(function (iter) {
        var name = _color_name(iter);
        display.mat(name).color(iter.i / 2, iter.j / 2, iter.k / 2);
        //  console.log('color of ', name, 'is', display.mat(name).obj().color.getStyle());
    }).dim('i', 0, 2).dim('j', 0, 2).dim('k', 0, 2)();

    // a ground plane for reference
    var plane = display.ro('ground_plane', new THREE.PlaneGeometry(500, 500)).mat('plane');

    plane.rotX(Math.PI / -2);
    display.light('sun').at(0.1, 1, 0.5);



    var camera_ro = display.ro('camera_ro', function () {
        this.transZ(-1);

        var pos = this.obj().position.clone();
        pos.z += (-infinite.tile_size * infinite.range);
        if ( (!this.last_inf_pos) || (this.last_inf_pos.distanceTo(pos) > infinite.tile_size)) {
            infinite.reposition(pos);
            this.last_inf_pos = pos;
        }

    });

    var camera_rot = new O3.RenderObject(display.camera()).rotX(Math.PI/-6);
    camera_ro.at(0, 25, -10).add(camera_rot);

    /**
     * Setup of infinite repeater
     *
     */

    // while not a requirement we are naming tiles based on their initial placement for debugging.
    function _color_name(iter) {
        iter = _.extend({i: 0, j: 0, k: 0}, iter);
        var i = Math.abs(iter.i) % 3;
        var j = Math.abs(iter.j) % 3;
        var k = Math.abs(iter.k) % 3;
        return  'infinite cube ' + [i, j, k].join(' ');
    }

    var infinite = new O3.Infinite('ground', display, {
        range: 10,
        tile_size: 20,
        locate_tile: function (tile, iter) {
            var y = (this.tile_size/2) * Math.sin(Math.PI * (iter.i + iter.k)/10);

            return tile.at(( iter.i || 0) * this.tile_size, y, (iter.k || 0) * this.tile_size);
        },

        tile_mat: function (iter) {

            var name = _color_name(iter);
        //    console.log('returning ', name, 'for ', iter);
            return name;
        }
    });

    infinite.reposition(new THREE.Vector3());
    O3.animate();

})
    ();