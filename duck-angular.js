// Duck-Angular MASTER
/*
The MIT License (MIT)

Copyright (c) 2013 Avishek Sen Gupta

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

//window.DUCK_DEBUG = true;
var requireDuck;
var logDebug = function(text) {
  if (window.DUCK_DEBUG)
    console.log("[Duck DEBUG] " + text);
};

// Adapted from https://github.com/asengupta/requirejs-q
function requireQQ(modules) {
  var deferred = Q.defer();
  logDebug("Starting to load libraries: " + modules);
  require(modules, function () {
    logDebug("Completed loading libraries: " + modules);
    deferred.resolve(arguments);
  }, function(err) {
    console.log("There was an error");
    console.log(err);
  });
  return deferred.promise;
}

var duckCtor = function (_, angular, Q, $) {
  var hackDependencies = {};

  var Container = function Container(injector, app, featureOptions) {
    featureOptions = featureOptions || {}
    logDebug("Feature Options is : " + JSON.stringify(featureOptions));
    if (featureOptions.baseUrl && featureOptions.textPluginPath) {
      logDebug("Configuring RequireJS with : " + featureOptions.baseUrl + ", " + featureOptions.textPluginPath);
      requireDuck = require.config({
        baseUrl: featureOptions.baseUrl,
        paths: { text: featureOptions.textPluginPath}
      });
    }

    var self = this;
    self.options = {};
    self.injector = injector;
    self.controllerProvider = self.injector.get("$controller");
    self.rootScope = self.injector.get("$rootScope");
    self.compileService = self.injector.get("$compile");
    self.templateCache = self.injector.get("$templateCache");
    self.viewProcessors = [];

    this.addViewProcessor = function(viewProcessor) {
      self.viewProcessors.push(viewProcessor);
    };

    this.addViewProcessors = function(viewProcessors) {
      _.each(viewProcessors, function(viewProcessor) {
        logDebug("Adding viewProcessor: " + viewProcessor);
        self.viewProcessors.push(viewProcessor);
      });
    };

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
      if (!multipleControllersFeature(featureOptions))
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

      var includedTemplateName = function(elementWithNgInclude) {
        var e = angular.element(elementWithNgInclude);
        if (e.attr("src"))
          return e.attr("src").replace("'", "").replace("'", "");
        return e.attr("ng-include").replace("'", "").replace("'", "");
      };

      var promises = _.map(includes, function (include) {
        var includeSource = includedTemplateName(include);
        logDebug("Resolving internal template: " + includeSource);

        var includePromise = self.templateCache.get(includeSource) ? Q([self.templateCache.get(includeSource)]) : requireQQ(["text!" + includeSource]);

        return includePromise.spread(function (sourceText) {
          logDebug("Finished loading internal template: " + includeSource);
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
        logDebug("Running pre-render block with scope: " + scope);
        preRenderBlock(self.injector, scope);
        logDebug("Finished Running pre-render block with scope: " + scope);
      }
      self.allPartialsLoadedDeferred = Q.defer();
      var c = self.numPartials(wrappingElement);
      return c.then(function (numberOfPartials) {
        self.numberOfPartials = numberOfPartials - 1;
        if (self.options.dontWait || !self.numberOfPartials || self.numberOfPartials === 0) {
          logDebug("All partials have been loaded.");
          self.allPartialsLoadedDeferred.resolve();
        }
        logDebug("Number of partials = " + self.numberOfPartials);
        var counter = 0;
        scope.$on("$includeContentLoaded", function () {
          logDebug("Loading a partial.");
          counter++;
          if (counter === self.numberOfPartials) {
            self.allPartialsLoadedDeferred.resolve();
          }
        });
      }).then(function () {
        logDebug("Binding template to scope");
        logDebug("Template is " + wrappingElement.html());
        var compiledTemplate = self.compileService(wrappingElement)(scope);
        applySafely(scope);
        logDebug("Compiled template is " + compiledTemplate.html());
        return compiledTemplate;
      });
    };

    var applySafely = function (scope) {
      if (!scope.$$phase) {
        logDebug("Running $digest loop");
        scope.$apply();
      }
    };

    var processView = function(viewHTML) {
      _.each(self.viewProcessors, function(viewProcessor) {
        logDebug("Processing view through " + viewProcessor);
        viewHTML = viewProcessor(viewHTML);
      });
      return viewHTML;
    };

    this.view = function (viewUrl, scope, preRenderBlock) {
      var deferred = Q.defer();
      logDebug("Loading " + viewUrl);
      require(["text!" + viewUrl], function (viewHTML) {
        logDebug("Loaded " + viewUrl);
        // HACK to make sure that ng-controller directives don't cause template to be eaten up
        if (!multipleControllersFeature(featureOptions)) {
          logDebug("Multiple controller support not enabled.");
          viewHTML = viewHTML.replace(/ng\-controller/g, "no-controller");
        } else {
          logDebug("Multiple controller support is enabled.");
        }
        viewHTML = processView(viewHTML);
        viewHTML = viewHTML.replace("ng-app", "no-app");
        self.compileTemplate(viewHTML, scope, preRenderBlock).then(function (compiledTemplate) {
          logDebug("Resolving view");
          deferred.resolve(compiledTemplate);
        });
      }, function (err) {
        console.log("Bad things happened");
        console.log(err);
      });
      return deferred.promise;
    };

    this.controller = function (controllerName, dependencies, isAsync, controllerLoadedPromise) {
      logDebug("Building controller");
      var controller;
      dependencies = dependencies || {};
      if (multipleControllersFeature(featureOptions)) {
        logDebug("Multiple controller support enabled, dependencies are: " + dependencies);
        hackDependencies = dependencies;
        hackDependencies.rootControllerName = controllerName;
        controller = self.controllerProvider(controllerName, { $scope: dependencies.$scope });
      } else {
        controller = self.controllerProvider(controllerName, dependencies);
      }
      if (!isAsync) {
        logDebug("Async convention disabled, resolving early.");
        return Q({});
      }
      logDebug("Async support enabled, searching for controller loaded promise");
      var deferred = Q.defer();
      controllerLoadedPromise =
      controllerLoadedPromise ? controllerLoadedPromise(controller) : controller.loaded;
      logDebug("Does controller loaded promise exist ? " + controllerLoadedPromise !== null);
      controllerLoadedPromise.then(function () {
        logDebug("Controller is loaded, resolving");
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
      dependencies = dependencies || {};
      return self.mvc(controllerName, viewUrl, dependencies,
          options).then(function (scopeViewController) {
            logDebug("About to initialise DuckDOM");
            var dom = new DuckDOM(scopeViewController.view, scopeViewController.scope);
            logDebug("Demo: " + scopeViewController.view.html());
            logDebug("Demo: " + dom.element(".side-modal-window-shade").html());
            return [dom, scopeViewController];
          });
    };

    this.mvc = function (controllerName, viewUrl, dependencies, options) {
      self.options = options || {dontWait: false, async: false, controllerLoadedPromise: null};
      self.options.preBindHook = self.options.preBindHook || function () {};
      self.options.preRenderHook = self.options.preRenderHook || function () {};
      dependencies = dependencies || {};
      var scope = self.newScope();
      logDebug("START Pre-bind hook");
      self.options.preBindHook(scope);
      logDebug("STOP Pre-bind hook");
      dependencies.$scope = _.extend(scope, dependencies.$scope || {});
      var controller = this.controller(controllerName, dependencies, self.options.async || false,
          self.options.controllerLoadedPromise);
      var template = this.view(viewUrl, scope, self.options.preRenderHook);
      return Q.spread([controller, template], function (controller, template) {
        logDebug("Controller and Template have been loaded.");
        return self.allPartialsLoadedDeferred.promise.then(function () {
          logDebug("All partial loads complete");
          return { controller: controller, view: template, scope: scope };
        });
      });
    };
  };

  var multipleControllersFeature = function(featureOptions) {
    return featureOptions && featureOptions.multipleControllers;
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
          logDebug("Caching template with URL " + templateUrl);
          $templateCache.put(templateUrl, templateText);
        });
        return self;
      });
    },

    cacheTemplates: function(app, templateMap) {
      if (_.isEmpty(templateMap)) return Q(this);
      var self = this;
      return Q.all(_.map(_.pairs(templateMap), function(templateKeyPair) {
        return self.cacheTemplate(app, templateKeyPair[0], templateKeyPair[1]);
      })).spread(function(bldr) {
        return bldr;
      });
    },

    withDependencies: function (appLevelDependencies) {
      this.dependencies = appLevelDependencies;
      return this;
    },

    build: function (moduleName, app, featureOptions) {
      var self = this;

      var mockModule = angular.module("lool", [moduleName, "ng", "ngSanitize"]);
      mockModule.config(function($provide) {
        $provide.provider("$rootElement", function () {
          this.$get = function () {
            return $("#Moaha");
          };
        });

        if (multipleControllersFeature(featureOptions)) {
          $provide.decorator("$controller", function($delegate) {
            return function(ctrlName, deps, later, ident) {
              var isRootController = ctrlName === hackDependencies.rootControllerName;
              var foundHackController = hackDependencies[ctrlName];
              var whichHackScope = isRootController ? hackDependencies.$scope
                  : foundHackController && foundHackController.$scope || null;
              var hackScope = {$scope: _.extend(deps.$scope, whichHackScope)};
              var hackDeps = _.extend({}, deps, foundHackController, hackScope);

              if (!isRootController && !foundHackController) {
                hackDeps = deps;
              }

              logDebug("Resolving " + (isRootController && "root ") + "controller " + ctrlName);

              return $delegate(ctrlName, hackDeps, later, ident);
            };
          });
        }

        _.each(_.keys(self.dependencies), function (appDependencyKey) {
          if (typeof self.dependencies[appDependencyKey] === "function") {
            logDebug("Using function to resolve dependency: " + self.dependencies[appDependencyKey]);

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
      return new Container(injector, mockModule, featureOptions);
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
      scope.$emit.apply(scope, arguments);
      applySafely();
    };

    function test() {
      console.log(arguments);
    }

    this.broadcast = function(ev, args) {
      scope.$broadcast(ev, args);
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

    this.on = function(selector, ev) {
      var defer = Q.defer();
      self.element(selector).on(ev, function() {
        defer.resolve();
      });
      return defer.promise;
    };

    this.interactWith = function (selector, value, promise) {
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
        else if (element.nodeName === "INPUT" && element.type === "button") {
          elements.trigger("click");
        }
        else if (element.nodeName === "INPUT" && element.type === "submit") {
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
        else if (element.nodeName === "A" || element.nodeName === "BUTTON" || element.nodeName === "LI") {
          elements.click();
        }
      });
      applySafely();
      if (promise) {
        return promise;
      }
      return Q(self);
    };

    this.apply = function () {
      applySafely();
    };

    var duckElement = {
      exists: function () {
        return this.size() > 0;
      },
      isVisible: function () {
        if(this.size() <=0){
          throw(new Error("Element does not exist"));
        }
        return !this.hasClass("ng-hide");
      },

      isHidden: function () {
        return !this.isVisible();
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
      logDebug("Selector is " + selector);
//      var element = angular.element(view.html()).find(selector);
      var element = view.find(selector);
      return  _.extend(element, duckElement);
    };
  };
  return { Container: Container, UIInteraction: DuckUIInteraction, DOM: DuckDOM, ContainerBuilder: ContainerBuilder };
};

if (typeof define !== "undefined") {
  console.log("RequireJS is present, defining AMD module");
  define(["underscore", "angular", "Q", "jquery"], duckCtor);
}
else {
  console.log("RequireJS is NOT present, defining globally");
  window.duckCtor = duckCtor;
}
