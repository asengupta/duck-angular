// Adapted from https://github.com/asengupta/requirejs-q
function requireQ(modules) {
  var deferred = Q.defer();
  require(modules, function () {
    deferred.resolve(arguments);
  });
  return deferred.promise;
}

var duckCtor = function (_, angular, Q, $) {
  var Container = function Container(injector, app, pathOptions) {
    if (pathOptions) {
      require.config({
        baseUrl: pathOptions.baseUrl,
        paths: { text: pathOptions.textPluginPath}
      });
    }

    var self = this;
    self.options = {};
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

    this.get = function (dependencyName) {
      return injector.get(dependencyName);
    };

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
      }).then(function () {
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
        // HACK to make sure that ng-controller directives don't cause template to be eaten up
        viewHTML = viewHTML.replace("ng-controller", "no-controller");
        viewHTML = viewHTML.replace("ng-app", "no-app");
        self.compileTemplate(viewHTML, scope, preRenderBlock).then(function (compiledTemplate) {
          deferred.resolve(compiledTemplate);
        });
      }, function (err) {
        console.log("Bad things happened");
        console.log(err);
      });
      return deferred.promise;
    };

    this.controller = function (controllerName, dependencies, isAsync, controllerLoadedPromise) {
      var controller = self.controllerProvider(controllerName, dependencies);
      if (!isAsync) {
        return Q({});
      }
      var deferred = Q.defer();
      controllerLoadedPromise =
      controllerLoadedPromise ? controllerLoadedPromise(controller) : controller.loaded;
      controllerLoadedPromise.then(function () {
        deferred.resolve(controller);
      });
      return deferred.promise;
    };

    this.directiveTemplate = function (element) {
      var deferred = Q.defer();
      var scope = self.newScope();
      self.compileTemplate(element, scope).then(function (template) {
        deferred.resolve([scope, template]);
      });
      return deferred.promise;
    };

    this.domMvc = function (controllerName, viewUrl, dependencies, options) {
      return self.mvc(controllerName, viewUrl, dependencies,
          options).then(function (scopeViewController) {
            var dom = new DuckDOM(scopeViewController.view, scopeViewController.scope);
            return [dom, scopeViewController];
          });
    };

    this.mvc = function (controllerName, viewUrl, dependencies, options) {
      self.options = options || {dontWait: false, async: false, controllerLoadedPromise: null};
      self.options.preBindHook = self.options.preBindHook || function () {};
      self.options.preRenderHook = self.options.preRenderHook || function () {};
      dependencies = dependencies || {};
      var scope = self.newScope();
      self.options.preBindHook(scope);
      dependencies.$scope = dependencies.injectedScope || scope;
      var controller = this.controller(controllerName, dependencies, self.options.async || false,
          self.options.controllerLoadedPromise);
      var template = this.view(viewUrl, scope, self.options.preRenderHook);
      return Q.spread([controller, template], function (controller, template) {
        return self.allPartialsLoadedDeferred.promise.then(function () {
          return { controller: controller, view: template, scope: scope };
        });
      });
    };
  };

  var ContainerBuilder = {
    dependencies: {},
    originalDependenciesCache: {},
    originalProvide: null,
    getQ: function (url) {
      var defer = Q.defer();
      var req = new XMLHttpRequest();
      req.open("GET", url, true);
      req.onload = function (e) {
        var result = req.responseText;
        defer.resolve(result);
      };
      req.onerror = function (e) {
        console.error("Putting failed", e);
        defer.reject(e);
      };
      req.send();
      return defer.promise;
    },

    cacheTemplate: function (app, templateUrl, realTemplateUrl) {
      var self = this;
      return self.getQ(realTemplateUrl).then(function (templateText) {
        app.run(function ($templateCache) {
          $templateCache.put(templateUrl, templateText);
        });
      });
    },
    withDependencies: function (appLevelDependencies) {
      this.dependencies = appLevelDependencies;
      return this;
    },

    reset: function (app) {
    },

    buildRaw: function (moduleName, app, pathOptions) {
      var self = this;
      app.config(function ($provide) {
        self.originalProvide = $provide;
        $provide.provider("$rootElement", function () {
          this.$get = function () {
            return $("#Moaha");
          };
        });
      });
      var injector = angular.bootstrap($("#null" + new Date().getMilliseconds()), [moduleName]);
      self.originalModule = angular.copy(app);

      _.each(_.keys(this.dependencies), function (appDependencyKey) {
        if (typeof self.dependencies[appDependencyKey] === "function") {
          var v = self.dependencies[appDependencyKey](self.originalProvide, app);
        } else {
          self.originalProvide.provider(appDependencyKey, function () {
            this.$get = function () {
              return self.dependencies[appDependencyKey];
            };
          });
        }
      });
      return new Container(injector, app, pathOptions);
    },

    build: function (moduleName, app, pathOptions) {
      var self = this;
      var mockModule = angular.module("lool", [moduleName, "ng"]);
      mockModule.config(function($provide) {
        $provide.provider("$rootElement", function () {
          this.$get = function () {
            return $("#Moaha");
          };
        });

        _.each(_.keys(self.dependencies), function (appDependencyKey) {
          if (typeof self.dependencies[appDependencyKey] === "function") {
            var v = self.dependencies[appDependencyKey]($provide, mockModule);
          } else {
            $provide.provider(appDependencyKey, function () {
              this.$get = function () {
                return self.dependencies[appDependencyKey];
              };
            });
          }
        });
      });

      var injector = angular.bootstrap($("#null" + new Date().getMilliseconds()), ["lool"]);
      return new Container(injector, mockModule, pathOptions);
    }
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
        var originalPromise = originalFn.apply(o, arguments);

        function resolveOriginalFunction() {
          duckDom.apply();
          o[fn] = originalFn;
          deferred.resolve();
        }

        if (originalPromise && originalPromise.then) {
          originalPromise.then(function (result) {
            resolveOriginalFunction();
            return result;
          }, function (errors) {
            duckDom.apply();
            o[fn] = originalFn;
            deferred.reject(errors);
          });
        } else {
          resolveOriginalFunction();
        }
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
        try {
          scope.$apply();
        } catch (e) {
          console.log("Apply failed");
          console.log(e);
        }
      }
    };

    this.emit = function(ev, args) {
      scope.$emit(ev, args);
      applySafely();
    };

    this.applyAndDo = function (command) {
      var deferred = Q.defer();
      scope.$apply(function () {
        command();
        deferred.resolve();
      });
      return deferred.promise;
    };

    this.trigger = function(selector, event) {
      var elements = angular.element(selector, view);
      elements.trigger(event);
    };

    this.interactWith = function (selector, value) {
      var elements = angular.element(selector, view);

      _.each(elements, function (element) {
        if (element.nodeName === "TEXTAREA" || (element.nodeName === "INPUT" &&
                                                (element.type === "text" ||
                                                 element.type === "password" ||
                                                 element.type === "number" ||
                                                 element.type === "tel" ||
                                                 element.type === "email" ||
                                                 element.type === "date" ))) {
          elements.focus();
          elements.val(value).trigger("input");
        }
        else if (element.nodeName === "FORM") {
          var inputElement = angular.element("input[type='submit']");
          inputElement.submit();
        }
        else if (element.nodeName === "INPUT" &&
                 (element.type === "button" || element.type === "submit")) {
          if (elements.submit) elements.submit();
          elements.trigger("click");
        }
        else if (element.nodeName === "INPUT" && element.type === "checkbox" && value == null) {
          elements.click().trigger("click");
          elements.prop("checked", !elements.prop("checked"));
        }
        else if (element.nodeName === "INPUT" && element.type === "radio") {
          elements.attr("checked", elements.attr("checked") ? null : "checked").click();
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

    var duckElement = {
      isVisible: function () {
        return !this.hasClass("ng-hide");
      },

      isHidden: function () {
        return this.hasClass("ng-hide");
      },
      isFocused: function () {
        var deferred = Q.defer();
        this.on("focus", function () {
          deferred.resolve();
        });
        return deferred.promise;
      },
      isDisabled: function() {
        return this.attr("disabled") === "disabled" || this.attr("disabled") === "true";
      },
      isEnabled: function() {
        return !this.isDisabled();
      }
    };

    this.element = function (selector) {
      var element = angular.element(selector, view);
      return  _.extend(element, duckElement);
    };
  };
  return { Container: Container, UIInteraction: DuckUIInteraction, DOM: DuckDOM, ContainerBuilder: ContainerBuilder };
};

if (typeof define !== "undefined") {
  console.log("RequireJS is present, defining AMD module");
  define(["underscore", "angular", "q"], duckCtor);
}
else {
  console.log("RequireJS is NOT present, defining globally");
  window.duckCtor = duckCtor;
}
