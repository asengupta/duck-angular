(function (duckChai) {
  "use strict";

  // Module systems magic dance.

  if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
    // NodeJS
    module.exports = duckChai();
  } else if (typeof define === "function" && define.amd) {
    // AMD
    define(["jquery"], function ($) {
      return function (chai, utils) {
        return duckChai(chai, utils, $);
      };
    });
  } else {
    // Other environment (usually <script> tag): plug in to global chai instance directly.
    chai.use(duckChai());
  }
}(function duckChai(chai, utils, $) {

  var states = {
    visible: function(obj){
      return obj.isVisible();
    },
    hidden: function(obj){
      return obj.isHidden();
    },
    focused: function(obj) {
      return obj.isFocused();
    },
    disabled: function(obj){
      return obj.isDisabled();
    },
    enabled: function(obj){
      return obj.isEnabled();
    },
    removed: function(obj){
      return obj.isRemoved();
    }
  };

  $.each(states, function(stateName, stateObj){
    chai.Assertion.addProperty(stateName, function () {
      var elString = "dom.element('"+this._obj.selector+"')";
      this.assert(stateObj(this._obj), 'expected '+elString+' to be '+stateName, 'expected '+elString+' to not be '+stateName);
    });
  });
}));
