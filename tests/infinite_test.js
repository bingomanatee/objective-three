var O3 = require('./../o3');
var _ = require('underscore');
var THREE = require('three');
var tap = require('tap');

tap.test('inactive', function (test) {

    test.test('active and inactive', function (ai) {

        var d = O3.display();

        var infinite = new O3.Infinite('tiles', d, {
            range: 4,
            tile_size: 10,
            threshold: 1
        });

        infinite.reposition(new THREE.Vector3());

        ai.equal(infinite.tiles.length, Math.pow(9, 2), '81 tiles present');

        ai.equal(infinite.active_tiles().length, Math.pow(9, 2), 'all tiles are active');
        ai.equal(infinite.inactive_tiles().length, 0, 'no tiles inactive');

        infinite.center_ijk.k = 1;

        var changed = infinite.deactivate_distant();

        console.log('changed: %s', changed);

        ai.equal(changed, 9, 'nine changed tiles')

        ai.equal(infinite.active_tiles().length, Math.pow(9, 2) - 9, 'all but nine tiles are active after move');
        ai.equal(infinite.inactive_tiles().length, 9, '9 tiles inactive after move');

        ai.end();
    });
    test.test('compress', function (c) {

        var d = O3.display();

        var infinite = new O3.Infinite('tiles', d, {
            range: 4,
            tile_size: 10,
            threshold: 1,
            min_vert_count_to_compress: 0,
            tile_mat: function (iter) {
                var n = Math.abs(iter.i + iter.k) % 2;
                console.log('n: ', n);
                if (n) {
                    return 'red';
                } else {
                    return 'white';
                }
            }
        });


        var uncompressed = infinite._uncompressed_tiles();
        c.equal(uncompressed.length, 0, 'no tiles have not been compressed');

        infinite.reposition(new THREE.Vector3());

        uncompressed = infinite._uncompressed_tiles();
        c.equal(uncompressed.length, 0, 'still no tiles have not been compressed');

        var cg = infinite._compression_groups();
        infinite.compress();
        infinite.center_ijk.k = 1;

        infinite.on_change_center();

        uncompressed = infinite._uncompressed_tiles();

        console.log('second uncompressed tiles: ', uncompressed.length);

        c.end();
    });

    test.end();

});