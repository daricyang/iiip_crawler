(function(exports){

/*
	options: {
		 method  : 'GET'/'POST'
		,headers : {}
		,payload : 'content string' 
	}
	callback(err,body)
*/

var http_agent = function(url,option,callback){
	if(typeof window === 'undefined'){
		//in nodejs
		var fetch = require('fetch').fetchUrl;
		fetch(url,option,function(err,meta,body){
			if(err) callback(err);
			else callback(err,body.toString());
		});
	}else{
		//in browser
		if(option.headers){
			option.headers.Cookie=option.cookies.join(';');
			chrome.webRequest.onBeforeSendHeaders.addListener(
				function(details) {
					var exist=false;
					for (var i = 0; i < details.requestHeaders.length; ++i) {
				    	  	if (option.headers[details.requestHeaders[i].name]) {
							details.requestHeaders[i].value=option.headers[details.requestHeaders[i].name];
				   	   	}
				    	}
					if(option.headers.Referer&&option.headers.Referer.length){
						for (var i = 0; i < details.requestHeaders.length; ++i) {
							if (details.requestHeaders[i].name === 'Referer') {
							    exists = true;
							    if(details.requestHeaders[i].value!=option.headers.Referer){
							    	details.requestHeaders[i].value =option.headers.Referer ;
						            }
							    break;
							}
				    		}
						if(!exist){
							details.requestHeaders.push({name:'Referer',value:option.headers.Referer});
						}
					}
					return {requestHeaders: details.requestHeaders};
					},
					{urls: [url]},
					["blocking", "requestHeaders"]
			);
		}
		var arg = {
			 url   : url
			,success : function(data){
				callback(null,data);		
			}
		};
		if(option.method) arg.type = option.method;
		if(option.payload) arg.data = option.payload;
		$.ajax(arg).fail(function(jqXHR,msg){
			callback(msg,null);		
		});
	}
}

exports.http_agent = http_agent;
})(typeof exports === 'undefined'? this['./http_agent']={}: exports);

