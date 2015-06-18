var gulp = require('gulp');

var html5Lint = require('gulp-html5-lint');
 
gulp.task('html5-lint', function() {
    return gulp.src('./public/*.html')
        .pipe(html5Lint());
});
