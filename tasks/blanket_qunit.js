// grunt-blanket-qunit 0.2.0
//
// Copyright (C) 2013 Dave Cadwallader, Model N, Inc.
// Distributed under the MIT License
//
// Documentation and full license available at:
// https://github.com/ModelN/grunt-blanket-qunit
//
// Based on grunt-contrib-qunit
// https://github.com/gruntjs/grunt-contrib-qunit
// Copyright (c) 2012 "Cowboy" Ben Alman, contributors

'use strict';

module.exports = function(grunt) {

    var ok = true;

    // Nodejs libs.
    var path = require('path');

    // External lib.
    var phantomjs = require('grunt-contrib-qunit/node_modules/grunt-lib-phantomjs').init(grunt);

    var totals = {
        totalLines: 0,
        coveredLines: 0,
        moduleTotalStatements : {},
        moduleTotalCoveredStatements : {}
    };

    // Keep track of the last-started module, test and status.
    var currentModule, currentTest, status, coverageThreshold, modulePattern, modulePatternRegex;
    // Keep track of the last-started test(s).
    var unfinished = {};

    // Get an asset file, local to the root of the project.
    var asset = path.join.bind(null, __dirname, '..');

    // Allow an error message to retain its color when split across multiple lines.
    var formatMessage = function(str) {
        return String(str).split('\n').map(function(s) { return s.magenta; }).join('\n');
    };

    // Keep track of failed assertions for pretty-printing.
    var failedAssertions = [];
    var logFailedAssertions = function() {
        var assertion;
        // Print each assertion error.
        while (assertion = failedAssertions.shift()) {
            grunt.verbose.or.error(assertion.testName);
            grunt.log.error('Message: ' + formatMessage(assertion.message));
            if (assertion.actual !== assertion.expected) {
                grunt.log.error('Actual: ' + formatMessage(assertion.actual));
                grunt.log.error('Expected: ' + formatMessage(assertion.expected));
            }
            if (assertion.source) {
                grunt.log.error(assertion.source.replace(/ {4}(at)/g, '  $1'));
            }
            grunt.log.writeln();
        }
    };

    // QUnit hooks.
    phantomjs.on('qunit.moduleStart', function(name) {
        unfinished[name] = true;
        currentModule = name;
    });

    phantomjs.on('qunit.moduleDone', function(name/*, failed, passed, total*/) {
        delete unfinished[name];
    });

    phantomjs.on('qunit.log', function(result, actual, expected, message, source) {
        if (!result) {
            failedAssertions.push({
                actual: actual, expected: expected, message: message, source: source,
                testName: currentTest
            });
        }
    });

    phantomjs.on('qunit.testStart', function(name) {
        currentTest = (currentModule ? currentModule + ' - ' : '') + name;
        grunt.verbose.write(currentTest + '...');
    });

    phantomjs.on('qunit.testDone', function(name, failed/*, passed, total*/) {
        // Log errors if necessary, otherwise success.
        if (failed > 0) {
            // list assertions
            if (grunt.option('verbose')) {
                grunt.log.error();
                logFailedAssertions();
            } else {
                grunt.log.write('F'.red);
            }
        } else {
            grunt.verbose.ok().or.write('.');
        }
    });

    var reportFile = function( data,options) {
        var ret = {
            coverage: 0,
            hits: 0,
            misses: 0,
            sloc: 0
        };
        data.source.forEach(function(line, num){
            num++;
            if (data[num] === 0) {
                ret.misses++;
                ret.sloc++;
            } else if (data[num] !== undefined) {
                ret.hits++;
                ret.sloc++;
            }
        });
        ret.coverage = ret.hits / ret.sloc * 100;

        return [ret.hits,ret.sloc];

    };

    var printPassFailMessage = function(name, numCovered, numTotal, threshold, printPassing) {
        var percent = (numCovered / numTotal) * 100;
        var pass = (percent >= threshold);

        var result = pass ? "PASS" : "FAIL";

        var percentDisplay = Math.floor(percent);
        if (percentDisplay < 10) {
            percentDisplay = "  " + percentDisplay;
        } else if (percentDisplay < 100) {
            percentDisplay = " " + percentDisplay;
        }

        var msg = result + " [" + percentDisplay + "%] : " + name + " (" + numCovered + " / " + numTotal + ")";

        status.blanketTotal++;
        if (pass) {
            status.blanketPass++;
            if (printPassing || grunt.option('verbose')) {
                grunt.log.writeln(msg.green);
            }
        } else {
            ok = false;
            status.blanketFail++;
            grunt.log.writeln(msg.red);
        }

    };

    phantomjs.on('blanket:fileDone', function(thisTotal, filename) {
        if (status.blanketPass === 0 && status.blanketFail === 0 ) {
            grunt.log.writeln();
        }

        var coveredLines = thisTotal[0];
        var totalLines = thisTotal[1];

        printPassFailMessage(filename, coveredLines, totalLines, coverageThreshold);

        totals.totalLines += totalLines;
        totals.coveredLines += coveredLines;

        if (modulePatternRegex) {
            var moduleName = filename.match(modulePatternRegex)[1];
            if(!totals.moduleTotalStatements.hasOwnProperty(moduleName)) {
                totals.moduleTotalStatements[moduleName] = 0;
                totals.moduleTotalCoveredStatements[moduleName] = 0;
            }

            totals.moduleTotalStatements[moduleName] += totalLines;
            totals.moduleTotalCoveredStatements[moduleName] += coveredLines;
        }
    });

    phantomjs.on('qunit.done', function(failed, passed, total, duration) {
        phantomjs.halt();
        status.failed += failed;
        status.passed += passed;
        status.total += total;
        status.duration += duration;
        // Print assertion errors here, if verbose mode is disabled.
        if (!grunt.option('verbose')) {
            if (failed > 0) {
                grunt.log.writeln();
                logFailedAssertions();
            }
        }
    });

    // Re-broadcast qunit events on grunt.event.
    phantomjs.on('qunit.*', function() {
        var args = [this.event].concat(grunt.util.toArray(arguments));
        grunt.event.emit.apply(grunt.event, args);
    });

    // Built-in error handlers.
    phantomjs.on('fail.load', function(url) {
        phantomjs.halt();
        grunt.verbose.write('Running PhantomJS...').or.write('...');
        grunt.log.error();
        grunt.warn('PhantomJS unable to load "' + url + '" URI.');
    });

    phantomjs.on('fail.timeout', function() {
        phantomjs.halt();
        grunt.log.writeln();
        grunt.warn('PhantomJS timed out, possibly due to a missing QUnit start() call.');
    });

    // Pass-through console.log statements.
    phantomjs.on('console', console.log.bind(console));

    grunt.registerMultiTask('blanket_qunit', 'Run BlanketJS coverage and QUnit unit tests in a headless PhantomJS instance.', function() {
        // Merge task-specific and/or target-specific options with these defaults.
        var options = this.options({
            // Default PhantomJS timeout.
            timeout: 5000,
            // QUnit-PhantomJS bridge file to be injected.
            inject: asset('node_modules/grunt-contrib-qunit/phantomjs/bridge.js'),
            // Explicit non-file URLs to test.
            urls: [],
            threshold: 20
        });

        // Combine any specified URLs with src files.
        var urls = options.urls.concat(this.filesSrc);

        // This task is asynchronous.
        var done = this.async();

        // Reset status.
        status = {failed: 0, passed: 0, total: 0, duration: 0, blanketTotal: 0, blanketPass: 0, blanketFail: 0};

        coverageThreshold = grunt.option('threshold') || options.threshold;

        modulePattern = grunt.option('modulePattern') || options.modulePattern;
        if (modulePattern) {
            modulePatternRegex = new RegExp(modulePattern);
        }

        // Process each filepath in-order.
        grunt.util.async.forEachSeries(urls, function(url, next) {
                    var basename = path.basename(url);
                    grunt.verbose.subhead('Testing ' + url).or.write('Testing ' + url);

                    // Reset current module.
                    currentModule = null;

                    // Launch PhantomJS.
                    grunt.event.emit('qunit.spawn', url);
                    phantomjs.spawn(url, {
                        // Additional PhantomJS options.
                        options: options,
                        // Do stuff when done.
                        done: function(err) {
                            if (err) {
                                // If there was an error, abort the series.
                                done();
                            } else {
                                // Otherwise, process next url.
                                next();
                            }
                        }
                    });
                },
                // All tests have been run.
                function() {

                    grunt.log.writeln();
                    grunt.log.writeln("Per-File Coverage Results: (" + coverageThreshold + "% minimum)");
                  
                    if (status.blanketFail > 0) {
                        var failMsg = "FAIL : " + (status.blanketFail + "/" + status.blanketTotal + " files failed coverage");
                        grunt.log.write(failMsg.red);
                        grunt.log.writeln();
                        ok = false;
                    } else {
                        var blanketPassMsg = "PASS : " + status.blanketPass + " files passed coverage ";
                        grunt.log.write(blanketPassMsg.green);
                        grunt.log.writeln();
                    }

                    var moduleThreshold = grunt.option('moduleThreshold') || options.moduleThreshold;

                    if (moduleThreshold) {

                        grunt.log.writeln();

                        grunt.log.writeln("Per-Module Coverage Results: (" + moduleThreshold + "% minimum)");

                        if (modulePatternRegex) {
                            for (var thisModuleName in totals.moduleTotalStatements) {
                                if (totals.moduleTotalStatements.hasOwnProperty(thisModuleName)) {

                                    var moduleTotalSt = totals.moduleTotalStatements[thisModuleName];
                                    var moduleTotalCovSt = totals.moduleTotalCoveredStatements[thisModuleName];

                                    printPassFailMessage(thisModuleName, moduleTotalCovSt, moduleTotalSt, moduleThreshold, /*printPassing*/true);
                                }
                            }
                        }
                    }

                    var globalThreshold = grunt.option('globalThreshold') || options.globalThreshold;

                    if (globalThreshold) {
                        grunt.log.writeln();
                        grunt.log.writeln("Global Coverage Results: (" + globalThreshold + "% minimum)");
                        printPassFailMessage("global", totals.coveredLines, totals.totalLines, globalThreshold, /*printPassing*/true);
                    }
                    grunt.log.writeln();

                    grunt.log.write("Unit Test Results: ");

                    if (status.failed > 0) {
                        var failMsg2 = (status.failed + '/' + status.total + ' assertions failed (' +
                                status.duration + 'ms)');
                        grunt.log.write(failMsg2.red);
                        grunt.log.writeln();
                        ok = false;
                    } else if (status.total === 0) {
                        var failMsg3 = ('0/0 assertions ran (' + status.duration + 'ms)');
                        grunt.log.write(failMsg3.red);
                        grunt.log.writeln();
                        ok = false;
                    } else {
                        grunt.verbose.writeln();
                        var passMsg = status.total + ' tests passed (' + status.duration + 'ms)';
                        grunt.log.write(passMsg.green);
                        grunt.log.writeln();
                    }

                    grunt.log.writeln();

                    if (!ok) {
                        grunt.warn("Issues were found.");
                    } else {
                        grunt.log.ok("No issues found.");
                    }

                    done();
                });
    });

};
