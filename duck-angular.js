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

	this.controller = function(controllerName, scope) {
		return self.controllerProvider(controllerName, {$scope: scope});
	};

	this.view = function(viewUrl, controller, scope) {
		var deferred = Q.defer();
		var childScope = self.rootScope;
		require(["text!" + viewUrl], function(viewHTML) {
			var wrappingElement = angular.element("<div></div>");
			wrappingElement.append(viewHTML);
			wrappingElement.data("$ngControllerController", controller);

			var compiledTemplate = self.compileService(wrappingElement.contents())(scope);
			scope.$apply();
			deferred.resolve(compiledTemplate);
		});
		return deferred.promise;
	};

	this.mvc = function(controllerName, viewUrl) {
		var scope = self.newScope();
		var controller = self.controller(controllerName, scope);
		return this.view(viewUrl, controller, scope).then(function(compiledTemplate) {
			console.log("Controller is " + controller);
			console.log(compiledTemplate);
			console.log("Scope is " + scope);
			return { controller: controller, view: compiledTemplate, scope: scope };
		});
	};
};

var DuckDOM = function DuckDOM(view, scope) {
	this.interactWith = function(selector, value) {
		var elements = angular.element(selector, view);

		_.each(elements, function(element) {
			if (element.nodeName === "INPUT" && element.type === "text") {
				elements.val(value).trigger("input");
			}
			else if (element.nodeName === "INPUT" && element.type === "button") {
				elements.submit();
			}
		});
		scope.$apply();
		console.log("Elements are: ");
		console.log(elements);
	};

	this.element = function(selector) {
		return angular.element(selector, view);
	};
};