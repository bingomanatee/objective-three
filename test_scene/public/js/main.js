(function () {
    O3.mat('cube', {type: 'phong', color: O3.util.rgb(1, 1, 0.8)});
    O3.mat('sphere', {type: 'lambert', color: O3.util.rgb(.2,.2,.2)});
    O3.mat('sphere-white', {color: O3.util.rgb(1, 1, 1), parent: 'sphere'});

    function make_display(name){
        var display = O3.display(name, {width: 800, height: 500});



        display.camera().translateY(-200);

        display.add(new O3.RenderObject('point light', {name: 'top light'}).at (-20, 200, -300).rgb(1, 1, 0.8));
        display.add(new O3.RenderObject('point light', {name: 'blue underlight'}).at(0, -400, 800).rgb(0, 0, 1));
        display.find({name: 'blue underlight'})[0].obj().intensity = 0.25;

        var cubeGeo = new THREE.CubeGeometry(50, 50, 50);
        var cubeMesh = new THREE.Mesh(cubeGeo, display.mat('cube').obj());

        var cube = new O3.RenderObject(cubeMesh, {
            update: function () {
                this.position(null, -100, -520 + O3.time() * -0.05);
            }

        });
        display.add(cube);

        var sphereGeo = new THREE.SphereGeometry(10);

        var pivot = new O3.RenderObject(new THREE.Object3D(), {

            update: function () {
                console.log('rotating sphere');
                this.obj().rotateY(0.1);
            }
        });

        _.each([-100, 100], function (x, i) {
            _.each([-100, 100], function (y, j) {
                var n = (i + j) % 2;
                var sphereMesh = new THREE.Mesh(sphereGeo, display.mat('sphere' +( n ? '-white' : '')).obj());
                sphereMesh.translateX(x);
                sphereMesh.translateZ(y);
                var sphere = new O3.RenderObject(sphereMesh, {
                    update: function () {
                        var o = this.obj();
                        o.scale.x = o.scale.y = o.scale.z = Math.cos(O3.time() / 1000) + 1.5;
                    }

                });
                pivot.add(sphere);
            })

        })

        cube.add(pivot);

        cubeMesh.rotateY(Math.PI / 6);
        return display;
    }

    var d1 = make_display('alpha');
    var d2 = make_display('beta');
    d2.mat('cube', {color: O3.util.rgb(0, 1,0)});

    d1.renderer().domElement.style.left = 800;
    d1.renderer().domElement.style.position = 'absolute';

    document.body.appendChild(d1.renderer().domElement);
    document.body.appendChild(d2.renderer().domElement);

    O3.animate();
})();