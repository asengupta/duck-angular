define(['duck-angular', 'angular', 'jquery'], function(duckAngular, angular) {
  describe("duckElement", function() {
    var duckDom;

    beforeEach(function() {
      var mockApp = angular.module('foo', []);
      mockApp.controller('bar', function($scope) {});

      duckDom = duckAngular
        .ContainerBuilder.build("foo", mockApp)
        .domMvc("bar", "test/duckElement.html", {'$scope': {}});
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

      it("raises exception for missing element", function() {
        return duckDom.spread(function(dom, mvc) {
          expect(function() {dom.element('.kittens-rule').isVisible()}).to.throw("Element does not exist");
        });
      });

      it("raises exception for missing element", function() {
        return duckDom.spread(function(dom, mvc) {
          expect(function() {dom.element('.kittens-rule').isHidden()}).to.throw("Element does not exist");
        });
      });
    });
  });
});
