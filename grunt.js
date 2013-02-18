/*global module:false*/
module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-less');

    // Project configuration
    grunt.initConfig({
        meta: {
            version: '0.1.0',
            banner: '/*! GAMEDEX - v<%= meta.version %> - ' +
                '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
                '* http://www.gamedex.net/\n' +
                '* <%= grunt.template.today("yyyy") %> - ' +
                'Michael Martin */'
        },

        // source files
        src: {

            // libraries
            lib: [
                // 'lib/underscore.min.js',
                'lib/underscore.string.js',
                'lib/sugar-core.js',
                'lib/sugar-function.js',
                'lib/jquery-ui.min.js',
                'lib/jquery.ui.stars.min.js',
                'lib/jquery.ba-resize.js',
                'lib/jquery.nanoscroller.js',
                'lib/jquery.isotope.js',
                'lib/bootstrap.js',
                'lib/video.js',
                'lib/moment.js',
                'lib/select2.js',
                'lib/list.js',
                'lib/alertify.js'
            ],

            // gamedex source (order matters)
            gamedex: [
                'js/jquery.bootstrap-dropdown-sub-menu.js',
                'js/tmz.js',
                'js/tmz_util.js',
                'js/tmz_user.js',
                'js/tmz_storage.js',
                'js/tmz_itemData.js',
                'js/tmz_tagData.js',
                'js/tmz_itemCache.js',
                'js/tmz_siteView.js',
                'js/tmz_searchView.js',
                'js/tmz_detailView.js',
                'js/tmz_itemView.js',
                'js/tmz_gridView.js',
                'js/tmz_tagView.js',
                'js/tmz_filterPanel.js',
                'js/tmz_videoPanel.js',
                'js/tmz_amazon.js',
                'js/tmz_giantbomb.js',
                'js/tmz_metacritic.js',
                'js/tmz_wikipedia.js',
                'js/tmz_gametrailers.js',
                'js/tmz_steam.js',
                'js/tmz_gamestats.js',
                'js/tmz_ign.js',
                'js/tmz_releasedList.js',
                'js/tmz_itemLinker.js',
                'js/tmz_importView.js',
                'js/init.js'
            ],

            // less
            less: [
                'less/*.less'
            ]
        },
        // concat
        concat: {
            dist: {
                src: ['<config:src.gamedex>'],
                dest: 'dist/scripts.js'
            },
            lib: {
                src: ['<config:src.lib>'],
                dest: 'dist/lib.js'
            }
        },
        // minify
        min: {
            dist: {
                src: ['<banner:meta.banner>', '<config:concat.dist.dest>'],
                dest: 'dist/scripts.min.js'
            },
            lib: {
                src: ['<banner:meta.banner>', '<config:concat.dist.dest>'],
                dest: 'dist/lib.min.js'
            }
        },

        // less
        less: {
            all: {
                src: 'less/gamedex.less',
                dest: 'css/gamedex.css',
                options: {
                    compress: true
                }
            }
        },
        // watch js
        watch: {
            files: ['<config:src.gamedex>', '<config:src.less>'],
            tasks: 'concat min less'
        },

        uglify: {}

    });

    // Default task.
    grunt.registerTask('default', 'concatlib');

};
