(function () {

    /**
     * Defining shared materials used in all displays
     */
    O3.mat('red', {type: 'phong', color: O3.util.rgb(1, 0, 0)});
    O3.mat('blue', {type: 'lambert', color: O3.util.rgb(0, 0, 1)});

    // a "display factory" that makes a new display with the passed - in name.

    var SIZE = 10;

    function make_display(name) {
        var display = O3.display(name, {width: window.innerWidth, height: window.innerHeight});

        // Putting the camera under renederObject management
        var cam_obj = display.add(new O3.RenderObject(display.camera(),
            {
                name:         'camera_display_object',
                leap_vectors: [],
                update:       function () {
                    var mean_values;
                    if (this.leap_vectors.length) {
                        mean_values = _.reduce(this.leap_vectors, function (out, data) {
                            return _.map(out, function (v, i) {
                                return v + data.palm[i];
                            })
                        }, [0, 0, 0]);
                        mean_values = _.map(mean_values, function(v){
                            return v / this.leap_vectors.length;
                        }, this);
                    } else {
                        mean_values = [0, -1, 0];
                    }
                    
                    var mean_vector = new THREE.Vector3(mean_values[0], mean_values[1], mean_values[2]);

                    if (!this.vector){
                        this.vector = mean_vector;
                    } else {
                        mean_vector.normalize().multiplyScalar(0.1);
                        this.vector.multiplyScalar(0.9).add(mean_vector);
                    }
                    this.leap_vectors = [];

                    document.getElementById('x-vector').value = this.vector.x;
                    document.getElementById('y-vector').value = this.vector.y;
                    document.getElementById('z-vector').value = this.vector.z;

                    document.getElementById('x-a').value = this.obj().rotation.x;
                    document.getElementById('y-a').value = this.obj().rotation.y;
                    document.getElementById('z-a').value = this.obj().rotation.z;

                   this.obj().rotateY(this.vector.x/50);
                    this.obj().rotateX(this.vector.z/25);
                    this.obj().rotation.x *= 0.95;
                    this.obj().rotation.z *= 0.95;
                }


            }));
        cam_obj.position(0, 0, 200);

        var cube_mesh = new THREE.CubeGeometry(SIZE, SIZE, SIZE);
        var sphere_mesh = new THREE.IcosahedronGeometry(SIZE / 2);

        // Adding point lights
        display.add(new O3.RenderObject('point light', {name: 'top light'}).at(-10, 200, -600).rgb(1, 1, 0.8));
        display.add(new O3.RenderObject('ambient light', {name: 'ambient'}).rgb(0.15, 0.1, 0.15));
        display.add(new O3.RenderObject('point light', {name: 'blue underlight'}).at(0, -400, 800).rgb(0, 0, 1));
        display.add(new O3.RenderObject('sun light').rgb(0.7, 0.7, 0.7)).obj().rotateX(Math.PI / -5).rotateY(Math.PI / 6);
        display.find({name: 'blue underlight'})[0].set('intensity', 0.25);
        display.forces = [];
        display.on('animate', function () {
            display.forces = [];
        });

        var count = 0;

        function add_cube() {
            ++count;
            document.getElementById('count').innerHTML = count;
            var is_cube = Math.random() > 0.5;
            var is_red = Math.random() > 0.5;

            var obj = new THREE.Mesh(is_cube ? cube_mesh : sphere_mesh, display.mat(is_red ? 'red' : 'blue').obj());

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

            // before each update, calculate the gravitational and repulsive forces of cubes.

            function calc_forces() {
                var fop = force_obj.position();
                ++force_obj.life;

                if (force_obj.life > 200 && force_obj.vector.length() < 1) {
                    force_obj.freeze = true;
                    force_obj.obj().scale.set(1.5, 1.5, 1.5)
                }

                var higher_objects = _.reject(display.find({graph_type: 'cube'}), function (other_object) {
                    return other_object.graph_type == 'cube' && other_object.id > force_obj.id;
                });

                _.each(higher_objects, function (oc) {

                    if (force_obj.freeze && oc.freeze) {
                        return;
                    }
                    var p = oc.position();
                    var v = p.clone();
                    v.sub(fop).normalize();
                    display.forces.push({
                        from:       force_obj,
                        to:         oc,
                        distance:   fop.distanceTo(p),
                        vector:     v,
                        attraction: ((oc.is_cube == force_obj.is_cube ? 1 : 0) + (oc.is_red == force_obj.is_red ? 1 : 0)) / 200
                    });
                });
            }

            force_obj.on('animate', calc_forces);

            force_obj.position(Math.random() * 100 - 50, Math.random() * 100 - 50, Math.random() * -100 - 50);
            display.add(force_obj);
        }

        _.each(_.range(0, 50), add_cube);

        setInterval(function () {
            if (count < 200) {
                add_cube();
            }
        }, 50);
        return display;
    }

    var d1 = make_display('alpha');
    var camera_object = d1.find({name: 'camera_display_object' })[0];

    var controller = new Leap.Controller();

    // the range around zero in which your measurement has full weight.
    var X_REGION = 50;
    var Y_REGION = 40;
    var Z_REGION = 20
    // the zero point for Y
    var Y_OFFSET = 200;

    // how much wavering out on that dimension will reduce the weight of the measurement
    var Z_SCALE = 0.5;
    var X_SCALE = 2;
    var Y_SCALE = 1.5;

    var DEPLETION = {
        x: {scale: X_SCALE, offset: 0, region: X_REGION},
        y: {scale: Y_SCALE, offset: Y_OFFSET, region: Y_REGION},
        z: {scale: Z_SCALE, offset: 0, region: Y_REGION}
    };

    function show_distance(measurement) {
        var distance_field = document.getElementById('hand-centered');
        distance_field.value = measurement;
    }

    function pos_strength(hand) {
        // adjusting for influence by measuring position from center

        var pos = _.object(['x', 'y', 'z'], hand.palmPosition);

        var position_strength = 10 / _.reduce(DEPLETION, function (out, data, axis) {
            var value = pos[axis];
            var d = Math.max(0, Math.abs(value - data.offset) - data.region);
            document.getElementById(axis + '-dev').value = d;
            return out + d * data.scale;
        }, 10);

        return (position_strength);
    }

    controller.on('frame', function (frame) {

        if (!frame.hands.length) {
            return show_distance(0);
        }
        var right_hand = _.reduce(frame.hands, function (out, hand) {

            if (!out || (out.palmPosition.x < hand.palmPosition.x)) {
                return hand;
            } else {
                return out;
            }

        }, null);
        camera_object.leap_vectors.push({palm: right_hand.palmNormal, time: new Date().getTime()})

      //  var position_strength = pos_strength(right_hand);
       // if (position_strength > 0.5) {
      //  }

    });
    controller.connect();

    // putting the content into the page
    d1.append(document.body);

    d1.renderer().setClearColor(O3.util.rgb(1, 1, 1).getHex());
    // starting the motion
    O3.animate();
})();