'use strict';

require('babel/register');

var fs = require('fs');

var gulp = require('gulp');
var del = require('del');
var concat = require('gulp-concat');
var babel = require('gulp-babel');
var sourcemaps = require('gulp-sourcemaps');
var mocha = require('gulp-mocha');
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');
var toc = require('marked-toc');

gulp.task('readme:toc', function (cb) {
  var file = fs.readFileSync('README.md', 'utf8');
  // Generate a TOC
  var toced = toc.insert(file);
  fs.writeFileSync('README.md', toced);
  cb();
});

gulp.task('clean:all', function (cb) {
  del(['lib/node/**', 'lib/browser/**', 'etc/**'], cb);
});

gulp.task('build:node', ['clean:all'], function () {
    return gulp.src(['src/**/*.js'])
      .pipe(babel({modules:'common'}))
      .pipe(gulp.dest('lib/node'));
});

gulp.task('lint', ['build:node'], function () {
  return gulp.src(['src/**/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter(stylish));
});

gulp.task('test:node', ['lint'], function () {
  return gulp.src('test/**/*.spec.js')
    .pipe(mocha());
});

gulp.task('watch', function() {
    gulp.watch(['src/**', 'test/**', 'index.js'], ['test:node']);
    gulp.watch(['README.md'], ['readme:toc']);
});

gulp.task('default', ['test:node', 'readme:toc']);
