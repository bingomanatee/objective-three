(function () {
    var display = O3.display({width: 800, height: 500});

    display.camera().translateY(-200);
    document.body.appendChild(display.renderer().domElement);

    var lightSource = new THREE.PointLight(new THREE.Color().setRGB(0.8, 0.9, 0.8).getHex());
    lightSource.position.y = 400;
    var light = new O3.RenderObject(lightSource,

        {update: function () {
            this.content.intensity = Math.cos(O3.time() / 100) + 1.1;
        }});
    display.add(light);

    var lightSource2 = new THREE.PointLight(new THREE.Color().setRGB(0, 0, 1).getHex());
    lightSource2.position.y = -400;
    lightSource2.position.z = -800;

    var light = new O3.RenderObject(lightSource2,
        {update: function () {

        }});
    display.add(light);

    var cubeGeo = new THREE.CubeGeometry(50, 50, 50);
    var mat = new THREE.MeshPhongMaterial({color: new THREE.Color().setRGB(0.5, 0.6, 0.4).getHex()});
    var mat2 = new THREE.MeshPhongMaterial({color: new THREE.Color().setRGB(1, 1, 0.8).getHex()});
    var cubeMesh = new THREE.Mesh(cubeGeo, mat);

    var cube = new O3.RenderObject(cubeMesh, {
        update: function () {
            this.content.position.z = -520 + O3.time() * -0.05;
            this.content.position.y = -100;
        }

    });
    display.add(cube);

    var sphereGeo = new THREE.SphereGeometry(10);

    var pivot = new O3.RenderObject(new THREE.Object3D(), {

        update: function () {
            console.log('rotating sphere');
            this.content.rotateY(0.1);
        }
    });

    _.each([-100, 100], function (x) {
        _.each([-100, 100], function (y) {

            var sphereMesh = new THREE.Mesh(sphereGeo, mat2);
            sphereMesh.translateX(x);
            sphereMesh.translateZ(y);
            var sphere = new O3.RenderObject(sphereMesh, {
                update: function () {
                    this.content.scale.x = this.content.scale.y = this.content.scale.z = Math.cos(O3.time() / 1000) + 1.5;
                }

            });
            pivot.add(sphere);
        })

    })

    cube.add(pivot);

    cubeMesh.rotateY(Math.PI / 6);

    O3.animate();
})();