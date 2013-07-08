duck-angular
============

A container for bootstrapping and testing AngularJS views and controllers in memory: no browser or external process needed.

duck-angular is available as a Bower package. Install it using bower 'install duck-angular'.

Include it using script tags. Your controller/service/object initialisation scripts need to have run before you use Duck-Angular. Put them in script tags, or load them using a script loader like RequireJS or Inject.

Use it in your tests, like so:

    define(["app"], function() { // app.js defines controllers, services, etc.
      describe("Some Page", function() {
        it("can show error message for non-numeric input", function() {
          var container = new Container();
          container.bootstrap("YourApp"); // Name of your module
          container.mvc("SomeController", "templates/some-template.html").then(function(mvc) {
            console.log("Loaded all the good stuff");
            var controller = mvc.controller;
            var view = mvc.view;
            var scope = mvc.scope;
            var dom = new DuckDOM(view, scope);
            expect(dom.element("#errorMsg").css("display")).to.eql("none");
            var theBox = view.find("#someTextBox");
            dom.interactWith("#someTextBox", "Some Wrong Data");
            dom.interactWith("#submit_details");
            expect(dom.element("#errorMsg").css("display")).to.eql("");
          });
        });
      });
    });