module.exports = function(grunt) {
grunt.initConfig({
    pkg : grunt.file.readJSON('package.json'),

    qunit: {
        app : [
            'qunit-tests/*.html'
        ]
    },

    blanket_qunit: {
        all : {
            options: {
                urls: ['qunit-tests/Dummy.html?coverage=true&gruntReport'],
                threshold: 90
            }
        }
    }
	

});
  grunt.loadNpmTasks('grunt-blanket-qunit');

  grunt.registerTask('default', ['blanket_qunit']);

}