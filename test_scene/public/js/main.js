(function () {

    /**
     * Defining shared materials used in all displays
     */
    O3.mat('cube', {type: 'phong', color: O3.util.rgb(1, 1, 0.8)});
    O3.mat('sphere', {type: 'lambert', color: O3.util.rgb(.2, .2, .2)});
    // note that sphere-white inherits properties from sphere - just varies the color.
    O3.mat('sphere-white', {color: O3.util.rgb(1, 1, 1), parent: 'sphere'});

    // a "display factory" that makes a new display with the passed - in name.
    
    function make_display(name) {
        var display = O3.display(name, {width: 500, height: 300});

        // Putting the camera under renederObject management
        var cam_obj = display.add(new O3.RenderObject(display.camera(), {name: 'camera'}));
        cam_obj.position(0, -50, -200);

        // Adding point lights
        display.add(new O3.RenderObject('point light', {name: 'top light'}).at(-20, 200, -300).rgb(1, 1, 0.8));
        display.add(new O3.RenderObject('point light', {name: 'blue underlight'}).at(0, -400, 800).rgb(0, 0, 1));
        display.find({name: 'blue underlight'})[0].set('intensity', 0.25);

        // Adding a central cube
        var cubeGeo = new THREE.CubeGeometry(150, 50, 150);
        var cubeMesh = new THREE.Mesh(cubeGeo, display.mat('cube').obj());
        cubeMesh.rotateY(Math.PI / 6);
        var cube = new O3.RenderObject(cubeMesh, function () {
            this.position(null, -100, -520 + O3.time() * -0.05);
        });
        display.add(cube);

        var sphereGeo = new THREE.SphereGeometry(10);
        // Adding orbital spheres
        var pivot = new O3.RenderObject(new THREE.Object3D(), function () {
            this.obj().rotateY(0.1);
        });
        cube.add(pivot);

        _.each([-100, 100], function (x, i) {
            _.each([-100, 100], function (y, k) {
                _.each([-100, 100], function (z, j) {
                    var n = (i + j + k) % 2;
                    // varying the material per sphere.
                    var sphereMesh = new THREE.Mesh(sphereGeo, display.mat('sphere' + ( n ? '-white' : '')).obj());
                    sphereMesh.position.set(x, y, z);

                    // adding scale bobbing to sphere
                    var sphere = new O3.RenderObject(sphereMesh, function () {
                        var s = Math.cos(O3.time() / 1000) + 1.5;
                        this.obj().scale.set(s, s, s);
                    });
                    pivot.add(sphere);
                })
            })
        })

        return display;
    }

    var d1 = make_display('alpha');
    var d2 = make_display('beta');
    // varying the cube color for the second display
    d2.mat('cube', {color: O3.util.rgb(0, 1, 0)});

    _.extend(d1.renderer().domElement.style, {
        left: 800, position: 'absolute'
    });

    // putting the content into the page
    d1.append(document.body);
    d2.append(document.body);

    // starting the motion
    O3.animate();
})();