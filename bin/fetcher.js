(function(exports){
		var http_agent=require('./http_agent').http_agent;
		var login={};
		//todo: may need to add failure check, what if the cookies fail during the 12 hours?
		var get_cookie=function(base_url,type,callback){
			var time_slice=50;
			if(login.time&&login.type==type)
				time_slice=login.time;
			if(time_slice>=50){
				var url=base_url+'get_cookie/'+type;
				http_agent(url,{},function(err,data){
					try{
						login.time=1;
						login.type=type;
						var cookie=JSON.parse(data).cookie;
						login.cookie=cookie;
						callback(null,login);
					}catch(e){
						callback(e);
					}
				});
			}else{
				++login.time;
				callback(null,login);
			}
		}
		var agent=function(cookie,url,host,referer,callback){
			function do_callback(err,data){
				if(err) callback(err,null);
				else callback(null,data);
			}
			if(cookie==='undefined') do_callback('cannot get cookie',null);
			else{
				if(cookie!=null)	var cookies=cookie.split(';');
				http_agent(url,{
						headers:{
							'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
							'Accept-Charset':'GBK,utf-8;q=0.7,*;q=0.3',
							'Accept-Encoding':'gzip,deflate,sdch',
							'Accept-Language':'zh-CN,zh;q=0.8',
							'Cache-Control':'max-age=0',
							'Connection':'keep-alive',
							'Host':host,
							'User-Agent':'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.4 (KHTML, like Gecko) Chrome/22.0.1229.95 Safari/537.4',
						},
						cookies:cookies
					},function(err,data){
						do_callback(err,data);
					}
				);
			}
		};

		var fetch = function(base_url,url,callback){
			console.log(url);
			if(url.match("weibo.com")){
				get_cookie(base_url,'sina',function(err,login){
					if(err) {
						callback(err,null)
					}
					else{
						var host=url.replace(/http.*\/\/(.*?)\/.*/,'$1');
						console.log(host);
						agent(login.cookie,url,host,'',function(err,data){
							if(err) callback(err);
							else{
								callback(null,data);
							}
						});
					}    
				});
			}else{
				agent(null,url,callback);
			}
		}	
		exports.fetch=fetch;


		function test(){
				fetch("http://127.0.0.1:8890/","http://weibo.com/3203359902/AeUyN6MfJ?type=comment&page=2",function(err,data){
					if(err) console.log(err);
					console.log(data);
				});

		}
//	test();
//	test();
})(typeof exports === 'undefined'? this['./fetcher']={}: exports);
