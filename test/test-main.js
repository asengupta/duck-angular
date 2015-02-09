var tests = [];
for (var file in window.__karma__.files) {
  if (window.__karma__.files.hasOwnProperty(file)) {
    if (/spec\.js$/.test(file)) {
      tests.push(file);
    }
  }
}

requirejs.config({
  // Karma serves files from '/base'
  baseUrl: '/base',

  paths: {
    'angular': 'node_modules/angular/lib/angular.min',
    'underscore': 'node_modules/underscore/underscore',
    'Q': 'node_modules/q/q',
    'jquery': 'node_modules/jquery/dist/jquery',
    'text': 'node_modules/text/text'
  },

  shim: {
    'underscore': {
      exports: '_'
    },
    'angular': {
      exports: 'angular'
    }
  },


  deps: tests,
  callback: window.__karma__.start
});
