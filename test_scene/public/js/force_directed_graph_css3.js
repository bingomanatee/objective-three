(function () {
    // a "display factory" that makes a new display with the passed - in name.
    function make_display(name) {
        var count = 0;
        var display = O3.display(name, {width: window.innerWidth, height: window.innerHeight});
        display.renderer(new THREE.CSS3DRenderer()).domElement.style.position = 'absolute';

        // Putting the camera under renederObject management
        var cam_obj = display.add(new O3.RenderObject(display.camera(), {name: 'camera'}));
        cam_obj.position(0, 0, 200);

        function addClass(el) {
            _.each(_.toArray(arguments).slice(1), function (c) {
                if (el.classList) {
                    el.classList.add(c);
                }
                else {
                    el.className += ' ' + c;
                }
            })
        }

        function sprite(e_type, color, id) {
            var element = document.createElement('div');
            addClass(element, e_type, color);
            element.innerHTML = e_type + ' ' + id;
            return new THREE.CSS3DObject(element);
        }

        display.forces = [];
        display.on('animate', function () {
            display.forces = [];
        });

        function add_cube() {
            ++count;
            document.getElementById('count').innerHTML = count;
            var is_cube = Math.random() > 0.5;
            var is_red = Math.random() > 0.5;
            var obj = sprite(is_cube ? 'cube' : 'sphere', is_red ? 'red' : 'blue', count);

            // on update, add the net forces to the momentum vector
            var force_obj = new O3.RenderObject(obj, {graph_type: 'cube', life: 0, is_red: is_red, is_cube: is_cube, update: function () {
                if (force_obj.freeze) {
                    return;
                }
                var related_forces = _.filter(display.forces, function (force) {
                    return force.from == force_obj || force.to == force_obj;
                });

                net_vector = _.reduce(related_forces, function (o, force) {
                    var k = (force.from === force_obj) ? 1 : -1;
                    scale = k / (Math.pow(force.distance, 1.1) + 10);
                    var away = force.vector.clone();
                    away.multiplyScalar(scale);
                    o.sub(away);

                    if (force.attraction > 0) {
                        var towards = force.vector.clone();
                        towards.multiplyScalar(force.attraction * k);
                        o.add(towards);
                    }
                    return o;
                }, new THREE.Vector3());

                if (this.vector) {
                    this.vector.add(net_vector);
                } else {
                    this.vector = net_vector;
                }

                this.vector.multiplyScalar(0.99);
                this.obj().position.add(this.vector);
            }});

            /**
             * before each update, calculate the gravitational and repulsive forces of cubes.
             * note -- only calculating the forces between each object and the ones with higher IDs.
             * This halves the number of force calculations while still covering all network relationships.
             */

            function calc_forces() {
                var fop = force_obj.position();
                ++force_obj.life;

                if (force_obj.life > 200 && force_obj.vector.length() < 1) {
                    force_obj.freeze = true;
                    force_obj.obj().scale.set(1.5, 1.5, 1.5)
                }

                var higher_objects = _.reject(display.find({graph_type: 'cube'}), function (other_object) {
                    return (!(other_object.freeze && other_object.freeze))
                        && other_object.graph_type == 'cube'
                        && other_object.id > force_obj.id;
                });

                _.each(higher_objects, function (oc) {
                    var v = oc.position().clone().sub(fop).normalize();
                    var att = ((oc.is_cube == force_obj.is_cube ? 1 : 0) + (oc.is_red == force_obj.is_red ? 1 : 0)) / 200;
                    display.forces.push({ from: force_obj, to: oc, distance: fop.distanceTo(oc.position()), vector: v, attraction: att     });
                });
            }

            force_obj.on('animate', calc_forces);

            force_obj.position(Math.random() * 100 - 50, Math.random() * 100 - 50, Math.random() * -100 - 50);
            display.add(force_obj);
        }

        _.each(_.range(0, 50), add_cube);

        // slowly adding more content
        setInterval(function () {
            if (Math.random() * 800 > count) {
                add_cube();
            }
        }, 50);
        return display;
    }

    // putting the content into the page
    var d1 = make_display('alpha');
    d1.append(document.body);

    // starting the motion
    O3.animate();
})();