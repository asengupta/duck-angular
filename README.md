duck-angular
============

A container for bootstrapping and testing AngularJS views and controllers in memory: no browser or external process needed.

duck-angular is available as a Bower package. Install it using bower 'install duck-angular'.

Use it in your tests, like so:

          container.bootstrap("YourApp"); // Name of your module
          container.mvc("SomeController", "templates/some-template.html").then(function(mvc) {
            console.log("Loaded all the good stuff");
            var controller = mvc.controller;
            var view = mvc.view;
            var scope = mvc.scope;
            expect(angular.element(view.find("#errorMsg")[0].outerHTML)[0].style.cssText).to.eql("display: none;");
            var theBox = view.find("#someTextBox");
            var dom = new DuckDOM(view, scope);
            dom.interactWith("#someTextBox", "Some Wrong Data");
            dom.interactWith("#submit_details");
            expect(angular.element(view.find("#errorMsg")[0].outerHTML)[0].style.cssText).to.eql("");
          });
