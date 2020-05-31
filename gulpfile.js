const gulp = require('gulp');
const imagemin = require('gulp-imagemin');
const htmlhint = require('gulp-htmlhint');
const rev = require('gulp-rev');
const revRewrite = require('gulp-rev-rewrite');
const revDel = require('gulp-rev-delete-original');

const paths = {
  target: 'app/public',
  images: 'static/img/**/*',
};

// Pre-processing

// Copy all static images
function images() {
  return (
    gulp
      .src(paths.images)
      // Pass in options to the task
      .pipe(imagemin({ optimizationLevel: 5 }))
      .pipe(gulp.dest('build/img'))
  );
}

function lint() {
  return gulp.src(`${paths.target}/**/*.html`).pipe(htmlhint());
}

// Rerun the task when a file changes
function watch() {
  gulp.watch(paths.images, ['images']);
}

// Post-processing

// Revision the static assets to eliminate issues with GitHub pages not
// updating files with small changes.
function revision() {
  return gulp
    .src(`${paths.target}/**/*.{css,js}`)
    .pipe(rev())
    .pipe(revDel())
    .pipe(gulp.dest(paths.target))
    .pipe(rev.manifest('rev-manifest.json'))
    .pipe(gulp.dest(paths.target));
}

// Re-write HTML files to update references to the files that have had their
// names changed to hashes.
function rewrite() {
  const manifest = gulp.src(`${paths.target}/rev-manifest.json`);
  return gulp
    .src(`${paths.target}/**/*.html`)
    .pipe(revRewrite({ manifest }))
    .pipe(gulp.dest(paths.target));
}

// Tasks

exports.images = images;
exports.lint = lint;
exports.watch = watch;

// Pre-processing steps that formulate assets as input to Hugo.
exports.pre = gulp.series(gulp.parallel(images, lint));
// Post-processing steps that re-write assets built with Hugo.
exports.post = gulp.series(revision, rewrite);

// The default task (called when you run `gulp` from cli)
exports.default = exports.pre;
