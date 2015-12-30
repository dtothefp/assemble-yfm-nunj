import through from 'through2';
import matter from 'parser-front-matter';
import assemble from 'assemble-core';
import nunjucks from 'nunjucks';
import consolidate from 'consolidate';
import path from 'path';

const isDev = process.argv.indexOf('watch') !== -1;
const app = assemble({reload: false});

/**
 * Load data and utility function onto the assemble context
 */
app.data({
  title: 'Bloooppp',
  layouts(fp) {
    return `${path.join(process.cwd(), 'templates/layouts', fp)}.html`;
  }
});

/**
 * Configure the nunjucks object before templating with consolidate.js
 */
const njInstance = nunjucks.configure({
  watch: false,
  noCache: true
});

/**
 * tell assemble to use nunjucks for HTML files
 */
app.engine('.html', consolidate.nunjucks);

/**
 * Parse the YML front matter
 */
app.onLoad(/\.(?:hbs|md|html)$/, (file, next) => {
  matter.parse(file, next);
});

/**
 * Temporary render hook for adding Flux props
 * to Assemble template context
 */
app.preRender(/\.(?:hbs|md|html)$/, (file, next) => {
  console.log('Append Pre-Render Data Before Merge', file.data);

  file.data = Object.assign({}, file.data, {
    title: 'From Pre-Render',
    custom_stuff: 'Custom stuff from Pre-Render'
  });

  console.log('Append Pre-Render Data After Merge', file.data);
  next();
});

/**
 * Store templates on the assemble cache by dirname and basename
 */
app.option('renameKey', (fp) => {
  const [dirname] = path.dirname(fp).split('/').slice(-1);
  const [basename] = path.basename(fp).split('.');
  return `${dirname}/${basename}`;
});

/**
 * Make a `build` task for all html in the `templates/pages` directory
 */
app.task('build', () => {
  return app.src('./templates/pages/**/*.html')
    .pipe(through.obj(function(file, enc, cb) {
      file.data = {title: 'blaahhhhh'}
      this.push(file);
      cb();
    }))
    .pipe(app.renderFile())
    .pipe(app.dest('dist'))
    .on('error', (err) => {
      console.error('Error [assemble]: build');
    })
    .on('data', (file) => {
      console.log('data', file.path);
    })
    .on('end', () => {
      console.log('ended');
    });
});

/**
 * Make a `watch` task to rebuild upon template changes
 */
app.task('watch', ['build'], () => {
  app.watch('templates/**/*.html', ['build']);
});


/**
 * Run the build similar to `gulp.run`
 */
app.build(isDev ? ['watch'] : ['build'], (err) => {
  if (err) {
    console.error('[assemble]: run');
  }

  console.log('Build `dist/index.html` inspect the text in <h1>');
});
