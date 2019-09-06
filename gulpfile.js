var gulp = require('gulp');
var imagemin = require('gulp-imagemin');
var htmlhint = require("gulp-htmlhint");

var paths = {
  images: 'static/img/**/*'
};

// Copy all static images 
function images() {
  return gulp.src(paths.images)
    // Pass in options to the task 
    .pipe(imagemin({optimizationLevel: 5}))
    .pipe(gulp.dest('build/img'));
}

function lint() {
    return gulp.src('./public/**/*.html')
        .pipe(htmlhint());
}

// Rerun the task when a file changes 
function watch() {
  gulp.watch(paths.images, ['images']);
}

exports.images = images;
exports.lint = lint;
exports.watch = watch;

// The default task (called when you run `gulp` from cli) 
exports.default = gulp.series(gulp.parallel(images, lint));;
