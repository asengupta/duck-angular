define(["underscore", "angular", "Q"], function (_, angular, Q) {
  var bootstrap = function(moduleName, app) {
    var injector = angular.bootstrap("#summyElement", moduleName);
    return new Container(injector, app);
  };

  var Container = function Container(injector, app) {
    var self = this;
    self.injector = injector;
    self.controllerProvider = self.injector.get("$controller");
    self.rootScope = self.injector.get("$rootScope");
    self.compileService = self.injector.get("$compile");

    this.newScope = function () {
      return self.rootScope.$new();
    };

    this.createElement = function (viewHTML) {
      var wrappingElement = angular.element("<div></div>");
      wrappingElement.append(viewHTML);
      return wrappingElement;
    };

    this.removeElementsBelongingToDifferentScope = function (element) {
      element.find("[modal]").removeAttr("modal");
      element.find("[options]").removeAttr("options");
      element.find("[ng-controller]").remove();

      return element;
    };

    function requireQ(modules) {
      var deferred = Q.defer();
      require(modules, function () {
        deferred.resolve(arguments);
      });
      return deferred.promise;
    }

    this.numPartials = function num(element) {
      var includes = element.find("[ng-include]");
      if (includes.length === 0) {
        return Q.fcall(function () {
          return 1;
        });
      }

      var promises = _.map(includes, function (include) {
        var includeSource = angular.element(include).attr("src").replace("'", "").replace("'", "");
        var includePromise = requireQ(["text!" + includeSource]);
        return includePromise.spread(function (sourceText) {
          var child = self.removeElementsBelongingToDifferentScope(self.createElement(sourceText));
          return num(child);
        });
      });
      return Q.all(promises).then(function (counts) {
        return 1 + _.reduce(counts, function (sum, count) {
          return sum + count;
        }, 0);
      });
    };

    this.compileTemplate = function (viewHTML, scope, preRenderBlock) {
      var wrappingElement = self.removeElementsBelongingToDifferentScope(self.createElement(viewHTML));
      if (preRenderBlock) {
        preRenderBlock(self.injector, scope);
      }
      self.allPartialsLoadedDeferred = Q.defer();
      var c = self.numPartials(wrappingElement);
      return c.then(function (numberOfPartials) {
        self.numberOfPartials = numberOfPartials - 1;
        if (self.options.dontWait || !self.numberOfPartials || self.numberOfPartials === 0) {
          self.allPartialsLoadedDeferred.resolve();
        }
        var counter = 0;
        scope.$on("$includeContentLoaded", function () {
          counter++;
          if (counter === self.numberOfPartials) {
            self.allPartialsLoadedDeferred.resolve();
          }
        });
      }).then(function() {
          var compiledTemplate = self.compileService(wrappingElement)(scope);
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
      var deferred = Q.defer();
      require(["text!" + viewUrl], function (viewHTML) {
        self.compileTemplate(viewHTML, scope, preRenderBlock).then(function(compiledTemplate) {
          deferred.resolve(compiledTemplate);
        });
      });
      return deferred.promise;
    };

    this.controller = function (controllerName, dependencies) {
      var deferred = Q.defer();
      var controller = self.controllerProvider(controllerName, dependencies);
      controller.loaded.then(function () {
        deferred.resolve(controller);
      });
      return deferred.promise;
    };

    this.mvc = function (controllerName, viewUrl, dependencies, preRenderBlock, options) {
      self.options = options || {dontWait: false};
      dependencies = dependencies ? dependencies : {};
      var scope = self.newScope();
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
