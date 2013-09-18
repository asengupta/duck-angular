define(["underscore", "angular", "Q", "requirejs-q"], function (_, angular, Q, rq) {
  this.init = function(app, ctor) {
    if (!ctor.moduleName && !ctor.injector) {
      throw new Error("Either <moduleName> or <injector> should be specified.");
    }
    if (ctor.moduleName) return bootstrap(ctor.moduleName, app);
    return new Container(ctor.injector, app);    

  };

  var bootstrap = function(moduleName, app) {
    var injector = angular.bootstrap("#summyElement", moduleName);
    return new Container(injector, app);
  };

  var Container = function Container(injector, app) {
    var self = this;
    var controllerProvider = injector.get("$controller");
    var compileService = injector.get("$compile");

    var newScope = function () {
      return rootScope.$new();
    };

    var asDOM = function (viewHTML) {
      var wrappingElement = angular.element("<div></div>");
      wrappingElement.append(viewHTML);
      return wrappingElement;
    };

    var numberOfPartials = function num(element) {
      var includes = element.find("[ng-include]");
      if (includes.length === 0) {
        return Q.fcall(function () {
          return 1;
        });
      }

      var promises = _.map(includes, function (include) {
        var includeSource = angular.element(include).attr("src").replace("'", "").replace("'", "");
        var includePromise = rq(["text!" + includeSource]);
        return includePromise.spread(function (sourceText) {
          var child = asDOM(sourceText));
          return num(child);
        });
      });

      return Q.all(promises).then(function (counts) {
        return 1 + _.reduce(counts, function (sum, count) {
          return sum + count;
        }, 0);
      });
    };

    var resolvePartials = function(partialCount, scope) {
      if (self.options.dontWait || !partialCount || partialCount === 0) {
          self.allPartialsLoadedDeferred.resolve();
        }
        var counter = 0;
        scope.$on("$includeContentLoaded", function () {
          counter++;
          if (counter === partialCount) {
            self.allPartialsLoadedDeferred.resolve();
          }
        });
    };

    var compileTemplate = function (viewHTML, scope, preRenderBlock) {
      var wrappingElement = asDOM(viewHTML));
      if (preRenderBlock) {
        preRenderBlock(injector, scope);
      }
      self.allPartialsLoadedDeferred = Q.defer();
      var c = numberOfPartials(wrappingElement);
      return c.then(function (partialCount) {
        return resolvePartials(partialCount - 1, scope);
      }).then(function() {
          var compiledTemplate = compileService(wrappingElement)(scope);
          applySafely(scope);
          return compiledTemplate;
        });
    };

    var applySafely = function (scope) {
      if (!scope.$$phase) {
        scope.$apply();
      }
    };

    this.view = function (viewUrl, scope, preRenderBlock) {
      return rq(["text!" + viewUrl]).spread(function(viewHTML) {
        return compileTemplate(viewHTML, scope, preRenderBlock);
      });
    };

    this.controller = function (controllerName, dependencies) {
      var controller = controllerProvider(controllerName, dependencies);
      return Q.fcall(function() {return controller;});
    };

    this.mvc = function (controllerName, viewUrl, dependencies, preRenderBlock, options) {
      self.options = options || {dontWait: false};
      dependencies = dependencies ? dependencies : {};
      var scope = newScope();
      dependencies.$scope = scope;
      var controller = this.controller(controllerName, dependencies);
      var template = this.view(viewUrl, scope, preRenderBlock);
      return Q.spread([controller, template], function (controller, template) {

        return self.allPartialsLoadedDeferred.promise.then(function () {
          return { controller: controller, view: template, scope: scope };
        });
      });
    };
  };

  var DuckUIInteraction = function DuckUIInteraction(duckDom) {
    var self = this;
    this.with = function (selector, value) {
      self.interaction = function () {
        duckDom.interactWith(selector, value);
      };
      return self;
    };

    this.run = function () {
      self.interaction();
      return self;
    };

    this.waitFor = function (o, fn) {
      var deferred = Q.defer();
      var originalFn = o[fn];
      o[fn] = function () {
        return originalFn.apply(o, arguments).then(function (result) {
          duckDom.apply();
          deferred.resolve();
          return result;
        }, function (errors) {
          duckDom.apply();
          deferred.reject(errors);
        });
      };
      self.run();
      return deferred.promise;
    };

    this.waitForSync = function (o, fn) {
      var deferred = Q.defer();
      var originalFn = o[fn];
      o[fn] = function () {
        var result = originalFn.apply(o, arguments);
        duckDom.apply();
        deferred.resolve();
        return result;
      };
      self.run();
      return deferred.promise;
    };
  };

  var DuckDOM = function DuckDOM(view, scope) {
    var self = this;
    var applySafely = function () {
      if (!scope.$$phase) {
        scope.$apply();
      }
    };
    this.interactWith = function (selector, value) {
      var elements = angular.element(selector, view);

      _.each(elements, function (element) {
        if (element.nodeName === "INPUT" && (element.type === "text" || element.type === "password")) {
          elements.focus();
          elements.val(value).trigger("input");
        }
        else if (element.nodeName === "INPUT" && (element.type === "button" || element.type === "submit")) {
          elements.submit().trigger("click");
        }
        else if (element.nodeName === "INPUT" && element.type === "checkbox" && value == null) {
          elements.click().trigger("click");
          elements.prop("checked", !elements.prop("checked"));
        }
        else if (element.nodeName === "INPUT" && element.type === "radio") {
          elements.prop("checked", !elements.prop("checked"));
          elements.trigger("change");
        }
        else if (element.nodeName === "INPUT" && element.type === "checkbox" && value != null) {
          while (elements.prop("checked") != value) {
            elements.click().trigger("click");
            elements.prop("checked", !elements.prop("checked"));
          }
        }
        else if (element.nodeName === "SELECT") {
          elements.prop("selectedIndex", value);
          elements.trigger("change");
        }
        else if (element.nodeName === "A" || element.nodeName === "BUTTON") {
          elements.click();
        }
      });
      applySafely();
      return self;
    };

    this.apply = function () {
      applySafely();
    };

    this.element = function (selector) {
      return angular.element(selector, view);
    };
  };
  return { Container: Container, UIInteraction: DuckUIInteraction, DOM: DuckDOM, bootstrap: bootstrap };
});
