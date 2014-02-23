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
