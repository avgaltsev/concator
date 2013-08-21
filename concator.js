var fs = require("fs");

var uglifyjs = require("uglify-js");


function includeFile(path, patternRegexps, callback) {
	
	var exclude = false;
	
	patternRegexps.excludes.forEach(function(patternRegexpsExclude) {
		
		exclude = exclude || patternRegexpsExclude.test(path);
		
	});
	
	if (exclude) {
		callback(false);
		return;
	}
	
	var include = false;
	var key = "";
	
	patternRegexps.includes.forEach(function(patternRegexpsInclude) {
		
		if (!include && patternRegexpsInclude.test(path)) {
			include = true;
			key = patternRegexpsInclude.toString();
		}
		
	});
	
	if (include) {
		callback(true, key);
	} else {
		callback(false);
	}
	
}


function walk(path, patternRegexps, callback) {
	
	var result = {};
	
	fs.readdir(path, function(error, files) {
		
		var queueLength = files.length;
		
		files.forEach(function(file) {
			
			file = path + "/" + file;
			
			fs.stat(file, function(error, stats) {
				
				if (!error) {
					
					if (stats.isDirectory()) {
						
						walk(file, patternRegexps, function(files) {
							
							for (var key in files) {
								
								if (result[key]) {
									result[key] = result[key].concat(files[key]);
								} else {
									result[key] = files[key];
								}
								
							}
							
							if (!--queueLength) {
								callback(result);
							}
							
						});
						
					} else {
						
						includeFile(file, patternRegexps, function(include, key) {
							
							if (include) {
								
								if (result[key]) {
									result[key].push(file);
								} else {
									result[key] = [file];
								}
								
							}
							
							if (!--queueLength) {
								callback(result);
							}
							
						});
						
					}
					
				} else {
					
					if (!--queueLength) {
						callback(result);
					}
					
				}
				
			});
			
		});
		
		if (!queueLength) {
			callback(result);
		}
		
	});
	
}


function compress(input) {
	
	var ast = uglifyjs.parser.parse(input);
	
	ast = uglifyjs.uglify.ast_mangle(ast);
	ast = uglifyjs.uglify.ast_squeeze(ast);
	
	return uglifyjs.uglify.gen_code(ast);
	
}


exports.build = function(path, patterns, output) {
	
	var cwd = process.cwd();
	
	path = fs.realpathSync(cwd + "/" + path);
	
	var patternRegexps = {
		excludes: [],
		includes: []
	};
	
	var starReplacement = "asd";
	
	patterns.forEach(function(pattern) {
		
		var regexps,
			regexp;
		
		if (pattern[0] === "!") {
			regexps = patternRegexps.excludes;
			pattern = pattern.slice(1);
		} else {
			regexps = patternRegexps.includes;
		}
		
		pattern = pattern.replace(/\./g, "\\.").replace(/\*/g, starReplacement).replace(new RegExp(starReplacement + starReplacement, "g"), ".*").replace(new RegExp(starReplacement, "g"), "[^\/]*");
		
		//if (pattern[0] === "/") {
			pattern = "^" + path.replace(/\./g, "\\.") + "/" + pattern + "$";
			//regexp = new RegExp((path + pattern).replace(/\./g, "\\.").replace(/\*\*/g, ".*").replace(/\*/g, "[^\/]*"));
		//} else {
		//	pattern = "^" + path.replace(/\./g, "\\.") + "/.*/" + pattern + "$";
			//regexp = new RegExp(".*" + pattern.replace(/\./g, "\\.").replace(/\*\*/g, ".*").replace(/\*/g, "[^\/]*"));
		//}
		
		regexp = new RegExp(pattern);
		
		regexps.push(regexp);
		
	});
	
	//console.log(patternRegexps);
	
	walk(path, patternRegexps, function(files) {
		
		var compiled = "";
		
		for (var section in files) {
			
			for (var file in files[section]) {
				
				compiled += fs.readFileSync(files[section][file]);
				
			}
			
		}
		
		var outputStream = fs.createWriteStream(output, {
			flags: "w",
			encoding: "utf8",
			mode: 0644
		});
		
		outputStream.on("error", function(e) {
			console.log(e);
		});
		
		outputStream.write(compress(compiled));
		
		outputStream.end();
		
	});
	
}
