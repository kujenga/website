var gulp = require('gulp');
var imagemin = require('gulp-imagemin');
var html5Lint = require('gulp-html5-lint');

var paths = {
  images: 'static/img/**/*'
};

// Copy all static images 
gulp.task('images', function() {
  return gulp.src(paths.images)
    // Pass in options to the task 
    .pipe(imagemin({optimizationLevel: 5}))
    .pipe(gulp.dest('build/img'));
});

gulp.task('lint', function() {
    return gulp.src('./public/**/*.html')
        .pipe(html5Lint());
});

// Rerun the task when a file changes 
gulp.task('watch', function() {
  gulp.watch(paths.images, ['images']);
});

// The default task (called when you run `gulp` from cli) 
gulp.task('default', ['watch', 'lint', 'images']);