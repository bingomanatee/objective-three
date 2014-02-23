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
        var cam_obj = display.add(new O3.RenderObject(display.camera(), {name: 'camera_render_object', update_on_animate: false}));
        cam_obj.position(0, 0, 200);

        var cube_mesh = new THREE.CubeGeometry(SIZE, SIZE, SIZE);
        var sphere_mesh = new THREE.IcosahedronGeometry(SIZE/2);

        // Adding point lights
        display.add(new O3.RenderObject('point light', {name: 'top light'}).at(-10, 200, -600).rgb(1, 1, 0.8));
        display.add(new O3.RenderObject('ambient light', {name: 'ambient'}).rgb(0.15, 0.1, 0.15));
        display.add(new O3.RenderObject('point light', {name: 'blue underlight'}).at(0, -400, 800).rgb(0, 0, 1));
        display.add(new O3.RenderObject('sun light').rgb(0.7, 0.7, 0.7)).obj().rotateX(Math.PI/-5).rotateY(Math.PI/6);
        display.find({name: 'blue underlight'})[0].set('intensity', 0.25);
        display.forces = [];
        display.on('animate', function(){
            display.forces = [];
        });

        var count = 0;

        function add_cube () {
            ++count;
            document.getElementById('count').innerHTML = count;
            var is_cube = Math.random() > 0.5;
            var is_red = Math.random() > 0.5;

            var obj = new THREE.Mesh(is_cube ? cube_mesh : sphere_mesh, display.mat(is_red ? 'red' : 'blue').obj());

            // on update, add the net forces to the momentum vector
            var force_obj = new O3.RenderObject(obj, {graph_type: 'cube', life: 0, is_red: is_red, is_cube: is_cube, update: function () {

                if (force_obj.freeze) return;
                var related_forces = _.filter(display.forces, function(force){
                    return force.from == force_obj || force.to == force_obj;
                });

                net_vector =  _.reduce(related_forces, function (o, force) {
                    var k = (force.from === force_obj) ? 1 : -1;
                    scale = k/(Math.pow(force.distance, 1.1) + 10);
                    var away = force.vector.clone();
                    away.multiplyScalar(scale);
                    o.sub(away);

                    if (force.attraction> 0){
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
                try {
                    console.log('length:', Math.round(this.vector.length()));
                } catch(err){
                    console.log('no mag ', err);
                }

            }});

            // before each update, calculate the gravitational and repulsive forces of cubes.

            function calc_forces() {
                var fop = force_obj.position();
                ++force_obj.life;

                if (force_obj.life > 200 && force_obj.vector.length() < 1){
                    force_obj.freeze = true;
                    force_obj.obj().scale.set(1.5, 1.5, 1.5)
                }

                var higher_objects = _.reject(display.find({graph_type: 'cube'}), function (other_object) {
                    return other_object.graph_type == 'cube' && other_object.id > force_obj.id;
                });

                _.each(higher_objects, function (oc) {

                    if (force_obj.freeze && oc.freeze) return;
                    var p = oc.position();
                    var v = p.clone();
                    v.sub(fop).normalize();
                    display.forces.push({
                        from: force_obj,
                        to: oc,
                        distance: fop.distanceTo(p),
                        vector: v,
                        attraction: ((oc.is_cube == force_obj.is_cube ? 1 : 0) + (oc.is_red == force_obj.is_red ? 1 : 0))/200
                    });
                });
            }

            force_obj.on('animate', calc_forces);

            force_obj.position(Math.random() * 100 - 50, Math.random() * 100 - 50, Math.random() * -100 - 50);
            display.add(force_obj);
        }

        _.each(_.range(0, 50), add_cube);

        setInterval(function(){
            if (Math.random() * 800 > count) add_cube();
        }, 50);
        return display;
    }

    var d1 = make_display('alpha');
    var camera_object = d1.find({name: 'camera_display_object' })[0];



    // putting the content into the page
    d1.append(document.body);


    d1.renderer().setClearColor(O3.util.rgb(1, 1, 1).getHex());
    // starting the motion
    O3.animate();
})();