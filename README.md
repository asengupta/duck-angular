duck-angular
============

Guides to use this are at:

* [Part One](http://avishek.net/blog/?p=1202)
* [Part Two](http://avishek.net/blog/?p=1188)
* [Part Three](http://avishek.net/blog/?p=1225)
* [Part Four](http://avishek.net/blog/?p=1239)
* [Part Five: Testing Directives](http://avishek.net/blog/?p=1489)
* [A Quick Recap](http://avishek.net/blog/?p=1472)

An example AngularJS app using Duck-Angular is at https://github.com/asengupta/AngularJS-RequireJS-Seed in two combinations:

* [Mocha + RequireJS](https://github.com/asengupta/AngularJS-RequireJS-Seed/tree/master)
* [Jasmine + RequireJS](https://github.com/asengupta/AngularJS-RequireJS-Seed/tree/karma-jasmine)

An example which does not use RequireJS as part of the app is available at: [Angular-Toy](https://github.com/kylehodgson/angular-toy).

duck-angular is a container for bootstrapping and testing AngularJS views and controllers in memory: no browser or external process needed.

duck-angular is available as a Bower package. Install it using 'bower install duck-angular'.

Include it using RequireJS' define(). Your controller/service/object initialisation scripts need to have run before you use Duck-Angular. Put them in script tags, or load them using a script loader like RequireJS or Inject.
If you're not using RequireJS in your app, see the example at: [Angular-Toy](https://github.com/kylehodgson/angular-toy). 

Use it in your tests, like so:

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


Setup
---------------
If you intend to set up Duck manually in an environment where RequireJS is not available, you'll need to make sure that the following libraries are available to Duck.

* q.js
* require.js
* text.js
* underscore.js

On including Duck using script tags, window.duckCtor will be available to you. Initialise the application container, like so:

    var duckFactory = duckCtor(_, angular, Q, $);
    var builder = duckFactory.ContainerBuilder;
    var container = builder.build("MyModuleName", myModule, { baseUrl: "baseUrl/for/Duck/dependencies", textPluginPath: "path/to/text.js"});

##Container API

###mvc()

This method sets up a controller and a view, with dependencies that you can inject. Any dependencies not overridden are fulfilled using the application's default dependencies. It returns an object which contains the controller, the view, and the scope.

    var options = { 
      preBindHook: function(scope) {...}, // optional
      preRenderHook: function(injector, scope) {...}, // optional
      dontWait: false, // optional
      async: false, // optional
      controllerLoadedPromise: function(controller) {...} // optional, required if async is true
    };

    container.mvc(controllerName, viewUrl, dependencies, options).then(function(mvc) {
      var controller = mvc.controller;
      var view = mvc.view;
      var scope = mvc.scope;
      ...
    });

    // preBindHook and preRenderHook are optional.
    // dontWait is optional, and has a default value of false. Set it to true, if you do not want to wait for nested ng-include partial resolution.
    // async is optional, and has a default value of false. Set it to true, if your controller has to run asynchronous code to finish initialising. If asynchronous initialisation happens, Duck expects your controller to expose a promise whose fulfilment signals completion of controller setup.
    // controllerLoadedPromise is required if async is true. If not provided in this situation, it will assume the controller exposes promise called loaded.

###controller()


This method sets up only a controller without a view, with dependencies that you can inject. Any dependencies not overridden are fulfilled using the application's default dependencies. It returns the constructed controller.

    controller(controllerName, dependencies, isAsync, controllerLoadedPromise).then(function(controller) {
      ...
    });

    // isAsync is optional, and has a default value of false. Set it to true, if your controller has to run asynchronous code to finish initialising. If asynchronous initialisation happens, Duck expects your controller to expose a promise whose fulfilment signals completion of controller setup.
    // controllerLoadedPromise is required if isAsync is true. If not provided in this situation, it will assume the controller exposes promise called loaded.


##Interaction API

The DuckDOM/DuckUIInteraction API lets you interact with elements in your constructed view. This only makes sense when you've set up your context using the Container.mvc() method.

###element()

This lets you access any element inside the view using standard jQuery selectors/semantics.

    var DuckDOM = duckFactory.DOM;

    container.mvc(controllerName, viewUrl, dependencies, options).then(function(mvc) {
      var controller = mvc.controller;
      var view = mvc.view;
      var scope = mvc.scope;
      var dom = new DuckDOM(mvc.view, mvc.scope);
      expect(dom.element("#someElement").isHidden()).to.eq(true);
    });

###apply()

This lets you call Angular's $scope.$apply() method in a safe fashion.

###interactWith()

This lets you interact with elements whose controller behaviour is known to be synchronous. Note that $scope.$apply() is automatically invoked after each interaction, so there is no need to call it yourself.

    var DuckDOM = duckFactory.DOM;

    container.mvc(controllerName, viewUrl, dependencies, options).then(function(mvc) {
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

###with().waitFor()

This call lets you interact with elements whose controller behaviour is known to be asynchronous. In such cases, you want to wait for the asynchronous behaviour to complete before proceeding with test assertions. This method assumes that the asynchronous logic returns a promise whose fulfilment indicates the completion of the user action.

    var DuckDOM = duckFactory.DOM;
    var UIInteraction = Duck.UIInteraction;

    container.mvc(controllerName, viewUrl, dependencies, options).then(function(mvc) {
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
