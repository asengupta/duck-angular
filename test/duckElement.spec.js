define(['duck-angular', 'angular'], function(duckAngular, angular) {
  describe("duckElement", function() {
    var duckDom;

    beforeEach(function() {
      var mockApp = angular.module('foo', []);
      mockApp.controller('bar', function($scope) {});

      duckDom = duckAngular
        .ContainerBuilder.build("foo", mockApp)
        .domMvc("bar", "test/duckElement.html", {});
    });

    describe('.isVisible()', function() {
      it("returns true for visible element", function() {
        return duckDom.spread(function(dom, mvc) {
          expect(dom.element('#visible-element').isVisible()).to.be.true;
        });
      });

      it("returns false for hidden element", function() {
        return duckDom.spread(function(dom, mvc) {
          expect(dom.element('#hidden-element').isVisible()).to.be.false;
        });
      });

      it("returns false for missing element", function() {
        return duckDom.spread(function(dom, mvc) {
          expect(dom.element('.kittens-rule').isVisible()).to.be.false;
        });
      });
    });
  });

});