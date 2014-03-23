module.exports = function (grunt) {

    grunt.initConfig({
        concat:   {
            base:       {
                files: {
                    'build/objective-three.js': ['lib/vendor/node.events.js',
                        'src/index.js',
                   //     'src/geo_to_JSON.js',
                        'src/Display.js',
                        'src/MatProxy.js',
                        'src/Infinite.js',
                        'src/RenderObject.js']
                }
            },
            test_scene: {
                files: {
                    'test_scene/public/js/o3.js': ['o3.js']
                }
            }
        },
        umd:      {
            all: {
                src:            'build/objective-three.js',
                dest:           'o3.js', // optional, if missing the src will be used
                template:       'unit', // optional; a template from templates subdir can be specified by name (e.g. 'umd');
                // if missing the templates/umd.hbs file will be used
                objectToExport: 'O3', // optional, internal object that will be exported
                amdModuleId:    'O3', // optional, if missing the AMD module will be anonymous
                globalAlias:    'O3', // optional, changes the name of the global variable
                deps:           { // optional
                    'default': ['_', 'THREE', 'Fools'],
                    cjs:       ['underscore', 'three', 'fools']
                }
            }
        },
        node_tap: {
            test: {
                options: {
                    outputType: 'tap', // tap, failures, stats
                    outputTo:   'console' // or file
                    // outputFilePath: '/tmp/out.log' // path for output file,
                    // only makes sense with outputTo 'file'
                },
                files:   {
                    'tests': ['./tests/display.js']
                }
            }
        }

    });
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-umd');
    grunt.loadNpmTasks('grunt-node-tap');

// the default task can be run just by typing "grunt" on the command line
    grunt.registerTask('default', ['concat:base', 'umd:all', 'concat:test_scene']);
};