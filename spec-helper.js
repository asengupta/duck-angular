define(["duckAngular", "underscore"], function (Duck, _) {
  var mother = {};
  var Container = Duck.Container;

  mother.createController = function createController(controllerName, dependencies) {
    return initApp().spread(function (injector, app) {
      mother.injector = injector;
      var container = new Container(injector, app);
      var resourceBundleFactory = container.injector.get("ngI18nResourceBundle");

      return resourceBundleFactory.get("en").then(function (resourceBundle) {
        var controller = container.controller(controllerName, dependencies);
        dependencies.$scope.resourceBundle = resourceBundle.data;
        mother.resourceBundle = resourceBundle.data;
        return controller;
      });
    });
  };

  mother.createMvc = function createMvc(controllerName, templateUrl, dependencies, options) {
    return initApp().spread(function (injector, app) {
      var container = new Container(injector, app);
      var resourceBundleFactory = container.injector.get("ngI18nResourceBundle");
      disableSessionSync(container);
      return resourceBundleFactory.get("en").then(function (resourceBundle) {
        return container.mvc(controllerName, templateUrl, dependencies, _.extend(options || {}, {preBindHook: function (scope) {
          scope.resourceBundle = resourceBundle.data;
        }})).then(function (mvc) {
              mvc.injector = injector;
              mvc.scope.$apply();
              return mvc;
            });
      });
    });
  };

  mother.compileDirective = function (rawElement) {
    return initApp().spread(function (injector, app) {
      var container = new Container(injector, app);
      var compile = container.injector.get("$compile");
      var scope = container.injector.get("$rootScope");

      var element = compile(rawElement)(scope);
      return [scope, element]
    });
  };

  mother.getDependency = function (name) {
    return mother.injector.get(name);
  }

  return mother;
});
