var async = require('async');
var Worker = require('./worker').Worker;

function main(){	
//	var worker = new Worker({base_url:"http://192.168.235.2:8890/", parallel:5 });
	worker=new Worker({parallel:5});
	worker.onClick();
}

main();
