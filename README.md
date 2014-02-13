Objective-THREE
---------------

This is a library that provides the basic structure of a THREE.js scene in a self-contained class.

Its purpose is to create a framework in which scenes and object trees can be managed in a d3-like fashion.

There is a singleton objet, O3, that has all the composite classes

One or more O3.Display instances can be created. To those instances, add one or more
O3.RenderObjects, with Object3D - type instances as their content. These are wrappers for any Object3D - based
instances.

These RenderObjects are then add() -ed to the display objects. RenderObjects can themselves have children,
or you can add THREE.js objects to the RenderObjects' content property.

RenderObjects have an update() method which can be extended to allow time-based manipulation of the content.

When you have consturcted your display object (and added its' .renderer().domElement to the page), call
O3.animate().

## update timing

There is two ways to update your scene content. One is to animate content every animation cycle (the default method).
The other is to manually update content based on some other trigger.

Setting the `update_on_animate` property of a RenderObject to false means that it will no longer get update
messages every animationFrame; you will have to choose when and how to update those RenderObjects yourself.
(You can still define the update metho on the RenderObjects, you'll just have to emit 'update' methods on your
own time scheme.)

## setting and changing scenes and cameras

You can define any number of scenes and cameras; however, the default camera /scene will be used until
you activate another scene or camera by calling `mydisplay.camera('secondary').activate()` or
`mydisplay.scene('second_scene').activate()`.

## time based change

The O3 singleton has a time() method that reflects the milliseconds since animation begun. It is a useful
basis for animation. You can "scrub" time by changing the _start_time property of O3.

## A sample O3 scene

```javascript

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
                        this.content.scale.x = this.content.scale.y = this.content.scale.z =
                         Math.cos(O3.time() / 1000) + 1.5;
                    }

                });
                pivot.add(sphere);
            })

        })

        cube.add(pivot);

        cubeMesh.rotateY(Math.PI / 6);

        O3.animate();
    })();

````