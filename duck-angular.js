define(["underscore", "angular"], function (_, angular) {
  var Container = function Container() {
    var self = this;
    this.bootstrap = function (moduleName) {
      self.injector = angular.bootstrap("#dummyElement", [moduleName]);
      self.controllerProvider = self.injector.get("$controller");
      self.rootScope = self.injector.get("$rootScope");
      self.compileService = self.injector.get("$compile");
    };

    this.newScope = function () {
      return self.rootScope.$new();
    };

    this.controller = function (controllerName, dependencies) {
      return self.controllerProvider(controllerName, dependencies);
    };

    this.view = function (viewUrl, controller, scope) {
      var deferred = Q.defer();
      var childScope = self.rootScope;
      require(["text!" + viewUrl], function (viewHTML) {
        var wrappingElement = angular.element("<div></div>");
        wrappingElement.append(viewHTML);
        wrappingElement.data("$ngControllerController", controller);
        var compiledTemplate = self.compileService(wrappingElement)(scope);
        scope.$apply();
        deferred.resolve(compiledTemplate);
      });
      return deferred.promise;
    };

    this.mvc = function (controllerName, viewUrl, dependencies) {
      dependencies = dependencies ? dependencies : {};
      var scope = self.newScope();
      dependencies.$scope = scope;

      var controller = self.controller(controllerName, dependencies);
      return this.view(viewUrl, controller, scope).then(function (compiledTemplate) {
        return { controller: controller, view: compiledTemplate, scope: scope };
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
    this.interactWith = function (selector, value) {
      var elements = angular.element(selector, view);

      _.each(elements, function (element) {
        if (element.nodeName === "INPUT" && element.type === "text") {
          elements.val(value).trigger("input");
        }
        else if (element.nodeName === "INPUT" && element.type === "button") {
          elements.submit();
        }
        else if (element.nodeName === "INPUT" && element.type === "checkbox") {
          elements.click().trigger("click");
        }
        else if (element.nodeName === "SELECT") {
          angular.element(elements[0].options[value]).attr("selected", true);
          elements.trigger("change");
        }
      });
      scope.$apply();
      return self;
    };

    this.apply = function () {
      scope.$apply();
    };

    this.element = function (selector) {
      return angular.element(selector, view);
    };
  };
  return { Container: Container, UIInteraction: DuckUIInteraction, DOM: DuckDOM };
});