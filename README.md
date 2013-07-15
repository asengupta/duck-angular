duck-angular
============

A container for bootstrapping and testing AngularJS views and controllers in memory: no browser or external process needed.

duck-angular is available as a Bower package. Install it using bower 'install duck-angular'.

Include it using script tags. Your controller/service/object initialisation scripts need to have run before you use Duck-Angular. Put them in script tags, or load them using a script loader like RequireJS or Inject.

Use it in your tests, like so:

    // Using Mocha-as-Promised in this example
    define(["app", "duckAngular"], function(Duck) { // app.js defines controllers, services, etc.
      describe("Some Page", function() {
        it("can show error message for non-numeric input", function() {
          var container = new Duck.Container();
          container.bootstrap("YourApp"); // Name of your module
          container.mvc("SomeController", "templates/some-template.html").then(function(mvc) {
            console.log("Loaded all the good stuff");
            var controller = mvc.controller;
            var view = mvc.view;
            var scope = mvc.scope;
            var dom = new Duck.DOM(view, scope);
            var interaction = new Duck.UIInteraction(dom);
            expect(dom.element("#errorMsg").css("display")).to.eql("none");
            var theBox = view.find("#someTextBox");
            dom.interactWith("#someTextBox", "Some Wrong Data");
            // For when you need to wait on some function anywhere to complete before making certain
            // assertions. The example below is for a function that returns a Q promise. For sync functions,
            // use waitForSync() instead of waitFor()
            return interaction.with("#submit_details").waitFor(scope, "submitDetails").then(function() {
                expect(dom.element("#errorMsg").css("display")).to.eql("");
            });
          });
        });
      });
    });
