require('babel-register')
const gulp    = require('gulp')
const path    = require('path')
const babel   = require('gulp-babel')
const clean   = require('gulp-clean')
const mocha   = require('gulp-mocha')
const concat  = require('gulp-concat')
const clc     = require('cli-color')
const nodemon = require('gulp-nodemon')
const fs      = require('fs')

const main       = 'index.js'
const buildDir   = 'build'
const srcDir     = 'src'
const testDir    = 'test'
const distDir    = 'dist'
const sources    = [path.join(srcDir, '**', '*.js')]
const tests      = [path.join(testDir, '**', '*.js')]
const buildTests = tests.map(v => path.join(buildDir, v))
const buildFiles = path.join(buildDir, '**', '*.*')
const dists      = [path.join(distDir, '**', '*.js')]

gulp.task('default', ['build'])

gulp.task('clean', ['clean:src', 'clean:test'])
gulp.task('clean:src', function () {
  return gulp.src(path.join(buildDir, srcDir), {read: false})
    .pipe(clean())
})
gulp.task('clean:test', function () {
  return gulp.src(path.join(buildDir, testDir), {read: false})
    .pipe(clean())
})

gulp.task('build', ['build:src', 'build:test'])
gulp.task('build:src', ['clean:src'], function () {
  return gulp.src(sources)
    .pipe(babel())
    .pipe(gulp.dest(path.join(buildDir, srcDir)))
    .pipe(gulp.dest(path.join(distDir)))
})
gulp.task('build:test', ['clean:test'], function () {
  return gulp.src(tests)
    .pipe(babel())
    .pipe(gulp.dest(path.join(buildDir, testDir)))
})

gulp.task('test', ['build'], function () {
  gulp.src(buildTests)
    .pipe(mocha({
      reporter: 'dot'
    }))
})
gulp.task('test:force', ['build'], function () {
  gulp.src(buildTests)
    .pipe(mocha({
      reporter: 'dot'
    }))
    .on('error', function (e) {
      if (typeof e.stack === 'undefined') return
      console.log(clc.red(`[ERROR] ${e.stack}`))
      this.emit(e)
    })
})
gulp.task('watch:test', ['test:force'], function () {
  gulp.watch([].concat(sources, tests), ['test:force'])
})
gulp.task('watch:build', ['build'], function () {
  gulp.watch([].concat(sources, tests), ['build'])
})
gulp.task('server', ['build:src'], function () {
  nodemon({
    script: path.join(buildDir, srcDir, 'index.js'),
    ext: 'js',
    ignore: ['gulpfile.js'].concat(buildFiles, tests, dists),
    env: {
      'NODE_ENV': 'development'
    },
    tasks: ['build:src']
  })
})
gulp.task('indexing', function () {
  var indexes     = {}, stats, ignore = [path.join(srcDir, 'index.js')]
  const readDir   = function (dir) {
    fs.readdirSync(path.join(dir)).forEach(function (file) {
      if (ignore.indexOf(path.join(dir, file)) >= 0) {
        return false
      }
      stats = fs.statSync(path.join(dir, file))
      if (stats.isDirectory()) {
        readDir(path.join(dir, file))
      } else if (stats.isFile()) {
        if (file.match(/^_/)) {
          return false
        }
        parseFile(`${dir}/${file}`)
      }
    })
  }
  const Str = require('./src/utils/str').default
  const parseFile = function (file) {
    var parts = file.split('/'), node = indexes
    parts.forEach(function (part) {
      if (part === srcDir) {
        return false
      }
      if (part.length === 2) {
        part = part.toUpperCase()
      } else {
        part = Str.ucfirst(part)
      }
      if (part.match(/(\.js)$/)) {
        part = require('./' + path.join.apply(null, parts)).default.name
        parts[0] = ''
        node[part] = path.join.apply(null, parts)
      } else if (node[part] === undefined) {
        node[part] = {}
      }
      node = node[part]
    })
  }
  readDir(srcDir)

  const $exports = 'var $exports = ' + JSON.stringify(indexes, null, ' ') + ';'
  var content    = fs.readFileSync(path.join('index.js'), {encoding: 'utf8'})
  content        = content.replace(/\/\/ AUTO GENERATED ==>((\n.*\n?)*)\/\/ <== AUTO GENERATED/,
    '// AUTO GENERATED ==>' + "\n" + $exports + "\n" + '// <== AUTO GENERATED')
  fs.writeFileSync(path.join('index.js'), content, {encoding: 'utf8'})
})
