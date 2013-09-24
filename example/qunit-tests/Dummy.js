(function (w) {

"use strict";

w.App = w.App || {};

w.App.isTrue = function (possibleTrueValue) {
    return possibleTrueValue === true;
};

w.App.isFalse = function (possibleFalseValue) {
    return possibleFalseValue === false;
};

w.App.add = function (a, b) {
    return a + b;
};

}(window));