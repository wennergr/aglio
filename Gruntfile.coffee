async = require 'async'

module.exports = (grunt) ->
    grunt.initConfig
        pkg: grunt.file.readJSON 'package.json'
        coffeelint:
            options:
                indentation:
                    value: 4
                max_line_length:
                    value: 120
                    level: 'warn'
            src:
                expand: true
                src: ['src/**/*.coffee', 'test/**/*.coffee']
        coffee:
            src:
                expand: true
                cwd: 'src'
                src: ['**/*.coffee']
                dest: 'lib'
                ext: '.js'
            tests:
                expand: true
                cwd: 'test'
                src: ['**/*.coffee']
                dest: 'test-js'
                ext: '.js'
        mochacov:
            test:
                options:
                    reporter: 'spec'
                    grep: grunt.option('grep')
                src: 'test-js/**/*.js'
            html:
                options:
                    reporter: 'html-cov'
                    output: 'coverage.html'
                src: 'test-js/**/*.js'
            reportcoverage:
                options:
                    coveralls:
                        serviceName: 'travis-ci'
                src: 'test-js/**/*.js'

    grunt.loadNpmTasks 'grunt-coffeelint'
    grunt.loadNpmTasks 'grunt-contrib-coffee'
    grunt.loadNpmTasks 'grunt-mocha-cov'
    grunt.loadNpmTasks 'grunt-npm-install'

    grunt.registerTask 'gen-examples', 'Generate an example for each theme', ->
        done = @async()

        aglio = require './lib/main'

        render = (template, done) ->
            console.log "Generating examples/#{template}.html"
            aglio.renderFile 'example.md', "examples/#{template}.html", template, (err) ->
                if err then return done(err)
                done()

        aglio.getTemplates (err, templates) ->
            async.each templates, render, done


    grunt.registerTask 'compile', ['coffeelint', 'coffee']
    grunt.registerTask 'test', ['compile', 'mochacov:test']
    grunt.registerTask 'coverage', ['compile', 'mochacov:html']
    grunt.registerTask 'coveralls', ['compile', 'mochacov:reportcoverage']
    grunt.registerTask 'examples', ['compile', 'gen-examples']
    grunt.registerTask 'default', ['npm-install', 'compile']
