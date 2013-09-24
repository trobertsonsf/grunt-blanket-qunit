(function (w) {
"use strict";

var App;

module("Dummy Test", {
    setup: function () {
        App = w.App;
    },
    teardown: function () {
        App = null;
    }

});


test("m:isTrue", function () {
    strictEqual(App.isTrue(true),true);
    strictEqual(App.isTrue("true"),false);
});

test("m:isFalse", function () {
    strictEqual(App.isFalse(false), true);
    strictEqual(App.isFalse("false"), false);
});

test("m:add", function () {
    strictEqual(App.add(1, 2), 3);

});

}(window));