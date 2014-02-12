module.exports = function (grunt) {

    grunt.initConfig({
        concat: {
            base: {
                src:  ['lib/vendor/node.events.js', 'src/index.js', 'src/Display.js'],
                dest: 'build/objective-three.js'
            }
        },
        umd: {
            all: {
                src: 'build/objective-three.js',
                dest: 'build/o3.js', // optional, if missing the src will be used
                template: 'unit', // optional; a template from templates subdir can be specified by name (e.g. 'umd');
                // if missing the templates/umd.hbs file will be used
                objectToExport: 'O3', // optional, internal object that will be exported
                amdModuleId: 'O3', // optional, if missing the AMD module will be anonymous
               globalAlias: 'O3', // optional, changes the name of the global variable
                deps: { // optional
                    'default': ['_', 'THREE'],
                    cjs: ['underscore', 'three']
                }
            }
        },
        node_tap: {
            test: {
                options: {
                    outputType: 'tap', // tap, failures, stats
                    outputTo: 'console' // or file
                    // outputFilePath: '/tmp/out.log' // path for output file,
                    // only makes sense with outputTo 'file'
                },
                files: {
                    'tests': ['./tests/display.js']
                }
            }
        }

    });
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-umd');
    grunt.loadNpmTasks('grunt-node-tap');

// the default task can be run just by typing "grunt" on the command line
    grunt.registerTask('default', ['concat:base', 'umd:all']);
};