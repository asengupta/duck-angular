define(['duck-angular', 'angular'], function(duckAngular, angular) {
  describe("duck-angular", function() {
    var builder;

    beforeEach(function() {
      var mockApp = angular.module('trivialTestApp', []);
      mockApp.controller('trivialController', function($scope) {
        $scope.foo = "bar";
      });

      builder = duckAngular.ContainerBuilder.build("trivialTestApp", mockApp);
    });

    it("should load a controller", function() {
      return builder.domMvc("trivialController", "test/trivialTest.html", {}).spread(function(dom, mvc) {
        expect(mvc.scope.foo).to.eql("bar");
      });

    });

    it("should load a view", function() {
      return builder.domMvc("trivialController", "test/trivialTest.html", {}).spread(function(dom, mvc) {
        expect(dom.element('div').text()).to.eql('bar');
      });
    });
  });

});