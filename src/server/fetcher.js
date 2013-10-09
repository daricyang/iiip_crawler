(function(exports){
		var http_agent=require('./http_agent').http_agent;
		var login={};
		//todo: may need to add failure check, what if the cookies fail during the 12 hours?
		var get_cookie=function(base_url,last_require_time,type,callback){
			var time_slice=25;
			if(last_require_time){
				var cur_time=new Date().getHours();
				if(cur_time<last_require_time)
					time_slice=24+cur_time-last_require_time;
				else
					time_slice=cur_time-last_require_time;
			}
			if(time_slice>12){
				var url=base_url+'get_cookie/'+type;
				http_agent(url,{},function(err,data){
					try{
						last_require_time=new Date().getHours();
						var cookie=JSON.parse(data).cookie;
						callback(null,cookie);
					}catch(e){
						callback(e);
					}
				});
			}else{
				callback();
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
						//	'Referer':referer,
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
			if(url.match("weibo.com")){
				get_cookie(base_url,login.time,'sina',function(err,cookie){
					if(err) {
						callback(err,null)
					}
					else{
						if(cookie!=null||cookie!==undefined){
							login.cookie=cookie;
						}
						var host="weibo.com";
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
				fetch("http://127.0.0.1:8890/","http://weibo.com/p/1005051967046183/follow",function(err,data){
					if(err) console.log(err);
					console.log(data);
				});
		}
	test();
})(typeof exports === 'undefined'? this['./fetcher']={}: exports);
