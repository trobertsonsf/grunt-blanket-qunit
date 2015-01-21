'use strict';

var f = function(){
	var sonarResults = {};

	return {
		addResult : function(fileName, data) {
			sonarResults[fileName] =  data;
		},
		saveReport : function(outputDir, stripFilePrefix){
			stripFilePrefix = /^\/jmvc\//; //TODO acutally use the parameters
	        var keys = Object.getOwnPropertyNames(sonarResults);
    	    var outputFile = '/tmp/coverage.lcov'; //TODO acutally use the parameters
        	var fs = require('fs');
        	fs.writeFileSync(outputFile, '');
        	keys.forEach(function(k){
            	var file = k.replace(stripFilePrefix, '');
            	var data = sonarResults[k];
            	fs.appendFileSync(outputFile, 'SF:'+file+'\n');

	            data.forEach(function(line, num){
	                num++;
	                if(data[num] !== undefined && data[num] !== null && data[num] !== '' ){
	                    fs.appendFileSync(outputFile, 'DA:' + num + ',' + data[num] + '\n');
	                }
	            });
	            fs.appendFileSync(outputFile, 'end_of_record\n');
	        });
		}
	};
};
 
module.exports = f();