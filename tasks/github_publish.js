/*
 * grunt-github-publish
 * https://github.com/chemerisuk/grunt-github-publish
 *
 * Copyright (c) 2013 Maksim Chemerisuk
 * Licensed under the MIT license.
 */

// 1. try to create a tag for new version
// 2. update package.json and bower.json
// 3. commit them into master
// 4. checkout gh-pages
// 5. merge it with master
// 6. update current version tag
// 7. push all into origin
// 8. push a new tag to origin

var exec = require('child_process').exec;

module.exports = function(grunt) {
  'use strict';

  grunt.registerTask('github_publish', 'Helps to publish new repo versions on github', function(version) {
    var options = this.options({
      src: ['src/*'],
      dest: 'dist/',
      bower: 'bower_components/'
    });

    var updateBranches = [
      // add any new files that were created
      'git add -A',
      // commit all changes
      'git commit -am "version ' + version + '"',
      // checkout pages branch
      'git checkout gh-pages',
      // merge with master
      'git merge master --no-commit'
    ].join(' && ');

    var finishBranches = [
      // add any files that may have been created
      'git add -A',
      // commit all changes
      'git commit -am "version ' + version + '"',
      // checkout pages branch
      'git checkout master',
      // update version tag
      'git tag -af v' + version + ' -m "version ' + version + '"',
      // push file changed
      'git push origin --all',
      // push new tag
      'git push origin --tags'
    ].join(' && ');

    grunt.registerTask('updateJSON', function(filename) {
      var json = grunt.file.readJSON(filename);

      json.version = version;

      grunt.file.write(filename, JSON.stringify(json, null, 2));
    });

    grunt.registerTask('processSources', function() {
      if (grunt.file.exists(options.dest)) {
        grunt.file.delete(options.dest);
      }

      grunt.file.mkdir(options.dest);

      grunt.file.expandMapping(options.src, options.dest, {flatten: true}).forEach(function(filePair) {
        grunt.file.copy(filePair.src, filePair.dest, {
          encoding: grunt.file.defaultEncoding,
          process: function(content, filename) {
            return grunt.template.process(
              '/**\n' +
              ' * @file ' + filename + '\n' +
              ' * @version ' + version + ' <%= grunt.template.today("isoDateTime") %>\n' +
              ' * @overview <%= pkg.description %>\n' +
              ' * @copyright <%= pkg.author %> <%= grunt.template.today("yyyy") %>\n' +
              ' * @license <%= pkg.license %>\n' +
              ' * @see <%= pkg.repository.url %>\n' +
              ' */\n') + content;
          }
        });
      });
    });

    grunt.registerTask('runShell', function(cmd) {
      var cb = this.async();
      var cp = exec(cmd, function(err) {
        if (err) grunt.warn(err);

        cb();
      }.bind(this));

      cp.stdout.pipe(process.stdout);
      cp.stderr.pipe(process.stderr);
    });

    grunt.task.run([
      'updateJSON:package.json',
      'updateJSON:bower.json',
      'processSources',
      'runShell:' + updateBranches,
      'runShell:bower update',
      'runShell:' + finishBranches
    ]);
  });
};
