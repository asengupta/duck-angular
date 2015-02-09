module.exports = function(config) {
  config.set({
    basePath: '',
    frameworks: ['requirejs', 'mocha', 'sinon', 'chai'],
    files: [
      'test/test-main.js',
      {pattern: 'node_modules/angular/lib/angular.min.js', included: false},
      {pattern: 'node_modules/underscore/underscore.js', included: false},
      {pattern: 'node_modules/q/q.js', included: false},
      {pattern: 'node_modules/jquery/dist/jquery.js', included: false},
      {pattern: 'node_modules/text/text.js', included: false},
      {pattern: 'test/*', included: false},
      {pattern: 'duck-angular.js', included: false}

    ],
    reporters: ['progress'],
    autoWatch: true,
    browsers: ['PhantomJS']
  });
};
