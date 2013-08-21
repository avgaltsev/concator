var fs = require("fs");


function processPatterns(path, patterns) {
	
	var result = [];
	
	var starReplacement = "asd";
	
	patterns.forEach(function(pattern) {
		
		var include = (pattern[0] !== "!");
		
		include || (pattern = pattern.slice(1));
		
		pattern = pattern.replace(/\./g, "\\.").replace(/\*/g, starReplacement).replace(new RegExp(starReplacement + starReplacement, "g"), ".*").replace(new RegExp(starReplacement, "g"), "[^\/]*");
		
		pattern = "^" + path.replace(/\./g, "\\.") + "/" + pattern + "$";
		
		result.push({
			regexp: new RegExp(pattern),
			include: include
		});
		
	});
	
	return result;
	
}


function includeFile(path, patterns) {
	
	var result = false;
	
	patterns.forEach(function(pattern) {
		
		result = pattern.include ?
			(result || (pattern.regexp.test(path) && pattern.regexp.toString())) :
			(result && !pattern.regexp.test(path) && result);
		
	});
	
	return result;
	
}


function walk(path, patterns, callback) {
	
	var result = {};
	
	patterns.forEach(function(pattern) {
		
		if (pattern.include) {
			result[pattern.regexp.toString()] = [];
		}
		
	});
	
	fs.readdir(path, function(error, files) {
		
		var queueLength = files.length;
		
		files.forEach(function(file) {
			
			file = path + "/" + file;
			
			fs.stat(file, function(error, stats) {
				
				if (!error) {
					
					if (stats.isDirectory()) {
						
						walk(file, patterns, function(files) {
							
							for (var key in files) {
								result[key] = result[key].concat(files[key]);
							}
							
							if (!--queueLength) {
								callback(result);
							}
							
						});
						
					} else {
						
						var key = includeFile(file, patterns);
						
						if (key) {
							result[key].push(file);
						}
						
						if (!--queueLength) {
							callback(result);
						}
						
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


exports.concatenate = function(path, patterns, callback) {
	
	var cwd = process.cwd();
	
	fs.realpath(cwd + "/" + path, {}, function(err, resolvedPath) {
		
		if (err) {
			callback(err);
			return;
		}
		
		walk(resolvedPath, processPatterns(resolvedPath, patterns), function(files) {
			
			var list = [];
			var output = "";
			
			for (var section in files) {
				
				for (var file in files[section]) {
					
					list.push(files[section][file]);
					output += fs.readFileSync(files[section][file]);
					
				}
				
			}
			
			if (typeof callback === "string") {
				
				var outputStream = fs.createWriteStream(callback, {
					flags: "w",
					encoding: "utf8",
					mode: 0644
				});
				
				outputStream.on("error", function(e) {
					console.log(e);
				});
				
				outputStream.write(output);
				
				outputStream.end();
				
			} else {
				
				callback(undefined, list, output);
				
			}
			
		});
		
	});
	
}
