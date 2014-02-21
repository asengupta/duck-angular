duck-angular
============

Guides to use this are at:

* [Part One](http://avishek.net/blog/?p=1202)
* [Part Two](http://avishek.net/blog/?p=1188)
* [Part Three](http://avishek.net/blog/?p=1225)
* [Part Four](http://avishek.net/blog/?p=1239)
* [A Quick Recap](http://avishek.net/blog/?p=1472)

An example AngularJS app using Duck-Angular is at https://github.com/asengupta/AngularJS-RequireJS-Seed in two combinations:

* [Mocha + RequireJS](https://github.com/asengupta/AngularJS-RequireJS-Seed/tree/master)
* [Jasmine + RequireJS](https://github.com/asengupta/AngularJS-RequireJS-Seed/tree/karma-jasmine)

A container for bootstrapping and testing AngularJS views and controllers in memory: no browser or external process needed.

duck-angular is available as a Bower package. Install it using 'bower install duck-angular'.

Include it using RequireJS' define(). Your controller/service/object initialisation scripts need to have run before you use Duck-Angular. Put them in script tags, or load them using a script loader like RequireJS or Inject.

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

