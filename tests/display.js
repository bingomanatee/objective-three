var tap = require('tap');
var O3 = require('./../build/o3');
tap.test('display', function (test) {

    test.test('width and height', function (test_w_h) {

        var d = O3.display('foo');

        var noticed = 0;
        d.once('resized', function (w, h) {
            test_w_h.equal(w, 200, 'width set to 200');
            ++noticed;
        })

        d.width(200);

        d.once('resized', function (w, h) {
            test_w_h.equal(h, 300, 'height set to 300');
            ++noticed;
        });

        d.height(300);

        d.once('resized', function () {
            ++noticed;
        });

        test_w_h.equal(d.height(), 300, 'height of 300 retrieved - no resize');

        test_w_h.equal(noticed, 2, 'noticed twice');

        var d2 = O3.display('bar');

        var error = null;
        try {
            d2.width(0);
        } catch(err){
            error = err;
        }
        test_w_h.ok(error, 'setting width to 0 throws an error');
        error = null;
        try {
            d2.width('foo');
        } catch(err){
            error = err;
        }

        test_w_h.ok(error, 'setting width to "foo" throws an error');
        O3.reset();
        test_w_h.end();
    });

    test.test('scene', function(test_scene){

        var display = O3.display('test_scene_display');


        test_scene.end();
    })
    test.end();

});