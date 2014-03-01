var tap = require('tap');
var O3 = require('./../o3');
var _ = require('underscore');
var THREE = require('three');

tap.test('display', function (test) {

    test.test('width and height', function (test_w_h) {

        test_w_h.test('set and get', function (set_get) {

            var d = O3.display('foo');

            var noticed = 0;
            d.once('resized', function (w, h) {
                set_get.equal(w, 200, 'width set to 200');
                ++noticed;
            })

            d.width(200);

            d.once('resized', function (w, h) {
                set_get.equal(h, 300, 'height set to 300');
                ++noticed;
            });

            d.height(300);

            d.once('resized', function () {
                ++noticed;
            });

            set_get.equal(d.height(), 300, 'height of 300 retrieved - no resize');

            set_get.equal(noticed, 2, 'noticed twice');

            O3.reset();
            set_get.end();
        });

        test_w_h.test('construction', function (con) {

            var display = O3.display({width: 250, height: 350});

            con.equal(display.width(), 250, 'width is 250');
            con.equal(display.height(), 350, 'height is 350');

            var d2 = O3.display('foo', {width: 200, height: 250});

            con.equal(d2.width(), 200, 'width is 200');
            con.equal(d2.height(), 250, 'height is 250');

            O3.reset();
            con.end();
        });

        test_w_h.test('invalid data', function (validation) {

            var d2 = O3.display('bar');

            var error = null;
            try {
                d2.width(0);
            }
            catch (err) {
                error = err;
            }

            validation.ok(error, 'setting width to 0 throws an error');
            error = null;
            try {
                d2.width('foo');
            }
            catch (err) {
                error = err;
            }

            validation.ok(error, 'setting width to "foo" throws an error');

            O3.reset();
            validation.end();

        });
        O3.reset();
        test_w_h.end();
    });

    test.test('camera', function (cam_test) {

        var display = O3.display({width: 200, height: 400});

        cam_test.equal(display.camera().aspect, 0.5, 'aspect ratio of camera = 0.5');

        display.size(300, 200);
        cam_test.equal(display.camera().aspect, 3 / 2, 'aspect ratio of camera = 1.5');

        O3.reset();
        cam_test.end();
    });

    test.test('scene', function (test_scene) {

        var display = O3.display('test_scene_display');

        test_scene.deepEqual(display.scenes(), [], 'display has no scenes');

        var s1 = display.scene();

        test_scene.deepEqual(display.scenes(), ['default'], 'default scene spawned');
        test_scene.equal(s1.name, 'default', 'anon scene is default');

        var s2 = display.scene('s2');

        test_scene.deepEqual(_.sortBy(display.scenes(), _.identity), ['default', 's2'], 'new scene spawned');

        s2.activate();

        test_scene.equal(display.scene().name, 's2', 's2 is activated');

        s1.activate();

        test_scene.equal(display.scene().name, 'default', 'default is active');

        test_scene.end();
    });

    test.test('materials', function (mt) {
        var d1 = O3.display('d1');

        var d2 = O3.display('d2');

        var red = new THREE.Color();
        red.setRGB(1, 0, 0);
        O3.mat('foo', {color: red, opacity: 0.5});

        mt.equal(d1.mat('foo').obj().color.getHex(), red.getHex(), 'foo color is red');

        var bar = O3.mat('bar', {parent: 'foo'});
        mt.equal(d1.mat('bar').obj().color.getHex(), red.getHex(), 'foo color is red');
        mt.end();

        var vey = O3.mat('vey', {parent: 'foo', opacity: 1});

        mt.equal(d1.mat('vey').obj().opacity, 1, 'vey is opacity 1');
        mt.equal(d1.mat('vey').obj().color.getHex(), red.getHex(), 'vey is red');
    })

    test.end();

});