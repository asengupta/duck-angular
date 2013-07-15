var Container = function Container() {
	var self = this;
	this.bootstrap = function(moduleName) {
		if (!angular) throw new Error("AngularJS not available. STOP.");
		if (!require) throw new Error("RequireJS not available. STOP.");
		if (!_) throw new Error("Underscore not available. STOP.");

		self.injector = angular.bootstrap("#dummyElement", [moduleName]);
		self.controllerProvider = self.injector.get("$controller");
      	self.rootScope = self.injector.get("$rootScope");
      	self.compileService = self.injector.get("$compile");
	};

	this.newScope = function() {
		return self.rootScope.$new();
	};

	this.controller = function(controllerName, mocks) {
		return self.controllerProvider(controllerName, mocks);
	};

	this.view = function(viewUrl, controller, scope) {
		var deferred = Q.defer();
		var childScope = self.rootScope;
		require(["text!" + viewUrl], function(viewHTML) {
			var wrappingElement = angular.element("<div></div>");
			wrappingElement.append(viewHTML);
			wrappingElement.data("$ngControllerController", controller);
			var compiledTemplate = self.compileService(wrappingElement)(scope);
			scope.$apply();
			deferred.resolve(compiledTemplate);
		});
		return deferred.promise;
	};

	this.mvc = function(controllerName, viewUrl, mocks) {
    mocks = mocks ? mocks : {};
		var scope = self.newScope();
    mocks.$scope = scope;

		var controller = self.controller(controllerName, mocks);
		return this.view(viewUrl, controller, scope).then(function(compiledTemplate) {
			return { controller: controller, view: compiledTemplate, scope: scope };
		});
	};
};

var DuckInteraction = function DuckInteraction(interaction) {
  this.do = interaction;

  this.waitFor = function(o, fn) {
    this.waitingFor = function(then) {
      var deferred = Q.defer();
      var originalFn = o[fn];
      o[fn] = function() {
        return originalFn.apply(o, arguments).then(function(result) {
          try {
            then();
            deferred.resolve();
          } catch(e) {
            deferred.reject(e);
          } finally {
            return result;
          }
        });
      };
      return deferred.promise;
    };
    return this;
  };

  this.after =  function(then) {
    var interactionPromise = this.waitingFor(then);
    this.do();
    return interactionPromise;
  }
};

var DuckDOM = function DuckDOM(view, scope) {
  var self = this;
	this.interactWith = function(selector, value) {
		var elements = angular.element(selector, view);

		_.each(elements, function(element) {
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

  this.interactAndWait = function(selector, value) {
    return new DuckInteraction(function() {
      self.interactWith(selector, value);
      return this;
    });
  };

	this.element = function(selector) {
		return angular.element(selector, view);
	};

  this.assertAfter = function(o, fn, assertBlock) {
    var deferred = Q.defer();
    var originalFn = o[fn];
    o[fn] = function() {
        return originalFn.apply(o, arguments).then(function(result) {
          try {
            assertBlock();
            deferred.resolve();
          } catch(e) {
            deferred.reject(e);
          } finally {
            return result;
          }
        });
    };

    return deferred.promise;
  }
};