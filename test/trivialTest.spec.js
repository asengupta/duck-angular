define(['duck-angular', 'angular', 'jquery'], function(duckAngular, angular) {
  describe("duck-angular", function() {
    var duckDom;

    beforeEach(function() {
      var mockApp = angular.module('trivialTestApp', []);
      mockApp.controller('trivialController', function($scope) {
        $scope.foo = "bar";
      });

      duckDom = duckAngular
        .ContainerBuilder.build("trivialTestApp", mockApp)
        .domMvc("trivialController", "test/trivialTest.html", {'$scope': {}});
    });

    it("should load a controller", function() {
      return duckDom.spread(function(dom, mvc) {
        expect(mvc.scope.foo).to.eql("bar");
      });

    });

    it("should load a view", function() {
      return duckDom.spread(function(dom, mvc) {
        expect(dom.element('div').text()).to.eql('bar');
      });
    });
  });

});
