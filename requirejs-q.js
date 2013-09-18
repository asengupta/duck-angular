define(["Q"], function(Q) {
    return function requireQ(modules, req) {
      var deferred = Q.defer();
      req = req || require;
      req(modules, function () {
        deferred.resolve(arguments);
      });
      return deferred.promise;
    }
});
