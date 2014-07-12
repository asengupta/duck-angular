duck-angular
============

Guides to use this are at:

* [Part One](http://avishek.net/blog/?p=1202)
* [Part Two](http://avishek.net/blog/?p=1188)
* [Part Three](http://avishek.net/blog/?p=1225)
* [Part Four](http://avishek.net/blog/?p=1239)
* [Part Five: Testing Directives](http://avishek.net/blog/?p=1489)
* [A Quick Recap](http://avishek.net/blog/?p=1472)

An example AngularJS app using RequireJS and Duck-Angular is at https://github.com/asengupta/AngularJS-RequireJS-Seed in two combinations:

* [Mocha + RequireJS](https://github.com/asengupta/AngularJS-RequireJS-Seed/tree/master)
* [Jasmine + RequireJS](https://github.com/asengupta/AngularJS-RequireJS-Seed/tree/karma-jasmine)

An example which does not use RequireJS as part of the app is available at: [Angular-Toy](https://github.com/kylehodgson/angular-toy).

duck-angular is a container for bootstrapping and testing AngularJS views and controllers in memory: no browser or external process needed.

Setup
------

duck-angular is available as a Bower package. Install it using 'bower install duck-angular'.

If you intend to set up Duck manually in an environment where RequireJS is not available, you'll need to make sure that the following libraries are available to Duck.

* q.js
* require.js
* text.js
* underscore.js
* jquery.js

If you are using RequireJS in your app, Duck will detect it and attempt to load "angular", "underscore", "jquery", and "Q".

Your controller/service/object initialisation scripts need to have run before you use Duck-Angular. Put them in script tags, or load them using a script loader like RequireJS or Inject.
If you're not using RequireJS in your app, see the example at: [Angular-Toy](https://github.com/kylehodgson/angular-toy). 
Here is an example taken from the [AngularJS-RequireJS Seed app](https://github.com/asengupta/AngularJS-RequireJS-Seed)

    // Using Mocha-as-Promised in this example
    it("can reflect data that is refreshed asynchronously", function () {
      return mother.createMvc("route2Controller", "../templates/route2.html", {}).then(function (mvc) {
        var dom = new DuckDOM(mvc.view, mvc.scope);
        var interaction = new UIInteraction(dom);
        expect(dom.element("#data")[0].innerText).to.eql("Some Data");
        dom.interactWith("#changeLink");
        expect(dom.element("#data")[0].innerText).to.eql("Some New Data");
        return interaction.with("#refreshLink").waitFor(mvc.scope, "refreshData").then(function() {
          expect(dom.element("#data")[0].innerText).to.eql("Some Data");
        });
      });
    });


If using RequireJS, including duck-angular as a dependency will expose duckCtor as a parameter you use in your tests.
If including duck-angular using script tags, window.duckCtor will be available to you.

Initialise the application container, like so:

    var duckFactory = duckCtor(_, angular, Q, $);
    var builder = duckFactory.ContainerBuilder;
    var container = builder.withDependencies(appLevelDependencies).build("MyModuleName", myModule, { baseUrl: "baseUrl/for/Duck/dependencies", textPluginPath: "path/to/text.js", multipleControllers: true});

The withDependencies(...) call is optional, unless you want to inject some dependency which the controller does not use directly.

The third parameter has the key `multipleControllers`. Unless specified, this is false. Setting this to true, allows us to inject dependencies not only into the top-level controller, but also on any nested controllers.

##ContainerBuilder API

###withDependencies()

This method allows you to specify module-level dependencies, i.e., dependencies which will be overridden for the entire module. The dependencies are specified as simple key-value pairs, with the key reflecting the actual name of the Angular dependency. If the value is an object, it will be specified configured in Angular's DI via a provider. If the value is a function, it will be executed with two parameters, $provide and the module. This lets the developer override the dependency in whatever fashion is most appropriate. The function returns the `builder` object, so it can be chained, until `build()` is called. The exception is when `cacheTemplate()` or `cacheTemplates()` is called, in which case it returns a promise with the `builder` object, which you can continue to chain as usual. See [cacheTemplate()](#cacheTemplateSection).

<a name="cacheTemplateSection"></a>###cacheTemplate()

This is specifically to prevent template load errors when we specify templateUrl values for directives. This preloads the templateUrl into Angular's template cache. Note that this returns a promise. You will need to wait for the promise to be fulfilled, either right after the point of the call, or before the start of the test. Here's an example of how you could do this:

    var setup = function(appLevelDependencies) {
      return buildContainer(appLevelDependencies).then(function (container) {
        return container.domMvc("ControllerName", "path/to/view", controllerDependencies)
      });
    };
     
    var buildContainer = function (appLevelDependencies) {
      var builder = duckFactory.ContainerBuilder;
      return builder.withDependencies(appLevelDependencies).
          cacheTemplate(moduleUnderTest, "declared/path/to/directive/template", "actual/path/to/template").
          then(function (bldr) {
            return bldr.build("Cinnamon", cinnamon,
                {baseUrl: "/base", textPluginPath: "src/javascript_tests/lib/text"});
          });
    };

###cacheTemplates()

If you're caching multiple templates, it's somewhat inconvenient to have to chain multiple promises for all the templates. This method lets you cache multiple templates, which you pass in as a map, keyed to the template URLs. The example below reproduces the relevant part of the single-template example above.

     
    var buildContainer = function (appLevelDependencies) {
      var builder = duckFactory.ContainerBuilder;
      return builder.withDependencies(appLevelDependencies).
          cacheTemplates(moduleUnderTest, {
                                            "declared/path/to/directive/templateOne": "actual/path/to/template/One",
                                            "declared/path/to/directive/templateTwo": "actual/path/to/template/Two"
                                         }).
          then(function (bldr) {
            return bldr.build("Cinnamon", cinnamon,
                {baseUrl: "/base", textPluginPath: "src/javascript_tests/lib/text"});
          });
    };

Note that it is entirely possible for the declared `templateUrl` to be the same as the path to access it; however, it may be different if you're using a test runner like Karma, which could serve static assets from a different path. This also allows a cheap form of URL rewriting if the path to your template does not match the path it actually is served from, like in Karma.


###build()

This method will construct and return the Container. It takes in 3 parameters:
* Module name: The module name will be the module under test.
* Module object: This is the actual module object that will be bootstrapped.
* Feature options: This option is required when the application is not using RequireJS. Because Duck-Angular uses the text plugin to load resources like views, it needs to know the path to the text plugin. This is where you specify both the baseUrl, and the path to the text plugin, like so:

Assuming you have text.js somewhere, simply specify that and the baseUrl.

     var container = builder.withDependencies(appLevelDependencies).build("MyModuleName", myModule, { baseUrl: "baseUrl/for/Duck/dependencies", textPluginPath: "path/to/text.js"});

This method returns a Container object, whose API is discussed below.

The feature options object also supports setting the `multipleControllers` option, which controls whether you can inject dependencies only into the top-level controller, or into nested controllers as well. This is discussed in the notes under `domMvc()` and `mvc()`.

The dependencies are injected using an overriding module which is constructed dynamically. This preserves the original module's dependencies.

##Container API

###mvc(controllerName, viewUrl, [dependencies], [options])

This method sets up a controller and a view, with dependencies that you can inject. Any dependencies not overridden are fulfilled using the application's default dependencies. It returns an object which contains the controller, the view, and the scope.

    var options = { 
      preBindHook: function(scope) {...}, // optional
      preRenderHook: function(injector, scope) {...}, // optional
      dontWait: false, // optional
      async: false, // optional
      controllerLoadedPromise: function(controller) {...} // optional, required if async is true
    };

    return container.mvc(controllerName, viewUrl, dependencies, options).then(function(mvc) {
      var controller = mvc.controller;
      var view = mvc.view;
      var scope = mvc.scope;
      ...
    });

    // preBindHook and preRenderHook are optional.
    // dontWait is optional, and has a default value of false. Set it to true, if you do not want to wait for nested ng-include partial resolution.
    // async is optional, and has a default value of false. Set it to true, if your controller has to run asynchronous code to finish initialising. If asynchronous initialisation happens, Duck expects your controller to expose a promise whose fulfilment signals completion of controller setup.
    // controllerLoadedPromise is required if async is true. If not provided in this situation, it will assume the controller exposes promise called loaded.

###controller(controllerName, [dependencies], [isAsync], [controllerLoadedPromise])

This method sets up only a controller without a view, with dependencies that you can inject. Any dependencies not overridden are fulfilled using the application's default dependencies. It returns the constructed controller.

    return controller(controllerName, dependencies, isAsync, controllerLoadedPromise).then(function(controller) {
      ...
    });

    // isAsync is optional, and has a default value of false. Set it to true, if your controller has to run asynchronous code to finish initialising. If asynchronous initialisation happens, Duck expects your controller to expose a promise whose fulfilment signals completion of controller setup.
    // controllerLoadedPromise is required if isAsync is true. If not provided in this situation, it will assume the controller exposes promise called `loaded`.

###domMvc(controllerName, viewURL, [controllerDependencies], [options])
This is a convenience wrapper over the mvc() method. It also constructs a new DuckDOM object (discussed in the DuckDOM Interaction API), and returns both the DuckDOM object, and the MVC object, in that order.

If you're using this method, remember to use spread() on the promise, instead of then() to spread the return value over the argument list, like so:

    return container.domMvc(controllerName, viewUrl, dependencies, options).spread(function(dom, mvc) {
      ...
    };


###Important Notes about mvc() and domMvc():

The latest version of Duck-Angular has initial support for nested controllers. To allow independent injection for each controller, you need to set the `multipleControllers` key in the `featureOptions` parameter in the `build()` method to *true*, like so:

    var container = builder.withDependencies(appLevelDependencies).build("MyModuleName", myModule, { baseUrl: "baseUrl/for/Duck/dependencies", textPluginPath: "path/to/text.js", multipleControllers: true});

####When `multipleControllers` is `false` or unspecified
The structure of the `dependencies` parameter only supports injecting dependencies for the top-level controller, like so:

    var controllerDependencies = { 
      // Top-level controller dependencies
    };

####When `multipleControllers` is `true`
The structure of the `dependencies` parameter is different in this scenario. If you have 3 controllers (one root, and 2 nested), your dependencies object will have this structure:


    var controllerDependencies = {controller1: { 
                                  //...Controller1 dependencies
                                            },
                              controller2: { 
                                  //...Controller2 dependencies
                              },
                              controller3: { 
                                  //...Controller3 dependencies
                              },
                             };

You can still specify an optional $scope field directly inside `controllerDependencies`; this will become the scope of the root controller. This will be removed in future versions.

###get(dependencyName)

This method lets you retrieve any wired Angular dependency by name, like so:

    container.get("$http")

###addViewProcessor(function(viewHTML) {...})
This lets you add a function which gives you the opportunity to do some preprocessing on the top-level view HTML when it's initially loaded.

    var buildContainer = function (appLevelDependencies, controllerDependencies) {
      var builder = duckFactory.ContainerBuilder;
      return builder.withDependencies(appLevelDependencies).
          cacheTemplates(moduleUnderTest, {
                                            "declared/path/to/directive/template/One": "actual/path/to/template/One",
                                            "declared/path/to/directive/template/Two": "actual/path/to/template/Two"
                                         })
          .then(function (bldr) {
            return bldr.build("Cinnamon", cinnamon,
                {baseUrl: "/base", textPluginPath: "src/javascript_tests/lib/text"});
          })
          .then(function (container) {
            container.addViewProcessor(function(viewHTML) { /* Processor code */ });
            return container.domMvc("controllerName", "path/to/view", controllerDependencies);
          });
    };

###addViewProcessors([function(html) {...}, function(html) {...}, ...])
This is simply a convenience function for passing in an array of view processors.

##Interaction API

The DuckDOM/DuckUIInteraction API lets you interact with elements in your constructed view. This only makes sense when you've set up your context using the Container.mvc() method.

###element(selector)

This lets you access any element inside the view using standard jQuery selectors/semantics.

    var DuckDOM = duckFactory.DOM;

    return container.mvc(controllerName, viewUrl, dependencies, options).then(function(mvc) {
      var controller = mvc.controller;
      var view = mvc.view;
      var scope = mvc.scope;
      var dom = new DuckDOM(mvc.view, mvc.scope);
      expect(dom.element("#someElement").isHidden()).to.eq(true);
    });

###apply()

This lets you call Angular's $scope.$apply() method in a safe fashion.

###on(selector, event)

This lets you create a promise for an event on an element specified by the selector. This allows you to use promise notation without having to resort to callback mechanics.

###interactWith(selector, [value], [promise])

This lets you interact with elements whose controller behaviour is known to be synchronous. Note that $scope.$apply() is automatically invoked after each interaction, so there is no need to call it yourself.

    var DuckDOM = duckFactory.DOM;

    return container.mvc(controllerName, viewUrl, dependencies, options).then(function(mvc) {
      var controller = mvc.controller;
      var view = mvc.view;
      var scope = mvc.scope;
      var dom = new DuckDOM(mvc.view, mvc.scope);

      dom.interactWith("#emailAddress", "mojo@mojo.com");
      expect(dom.element("#emailAddress").val()).to.eq("mojo@mojo.com");
    });

The interactWith() method is 'overloaded' to understand what type of element you are interacting with, so you can simply pass the second parameter where appropriate. For example:

    dom.interactWith("#someButton");
    dom.interactWith("#someDropdown", 2);
    dom.interactWith("#textField", "Some Text");
    dom.interactWith("#someRadio", true);

The interactWith() method can also take a third parameter `promise`, which it returns untouched, such that subsequent code can be chained asynchronously if needed. For example:

      return dom.interactWith("#emailAddress", "mojo@mojo.com", dom.on("#someElement", "someEvent"))
        .then(function() {
          // More assertions
        });

###with().waitFor()

This call lets you interact with elements whose controller behaviour is known to be asynchronous. In such cases, you want to wait for the asynchronous behaviour to complete before proceeding with test assertions. This method assumes that the asynchronous logic returns a promise whose fulfilment indicates the completion of the user action.

    var DuckDOM = duckFactory.DOM;
    var UIInteraction = Duck.UIInteraction;

    return container.mvc(controllerName, viewUrl, dependencies, options).then(function(mvc) {
      var controller = mvc.controller;
      var view = mvc.view;
      var scope = mvc.scope;
      var dom = new DuckDOM(mvc.view, mvc.scope);
      var interaction = new UIInteraction(dom);
        return interaction.with("#refreshLink").waitFor(mvc.scope, "refreshData").then(function() {
          expect(dom.element("#data")[0].innerText).to.eql("Some Data");
        });
    });

The above example assumes that there is a method refreshData() present on the scope which returns a promise to indicate completion of the asynchronous code. The rest of the assertions will only continue after this promise as been fulfilled.

###trigger()

This is merely a wrapper over jQuery's trigger() method, for firing events on elements. If you're using the interaction API, you merely need to write something like this:

     dom.trigger("#someId", "someEvent");
     
     
License
----------

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
