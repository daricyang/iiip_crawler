var mongo=require('mongodb');
var tools =  require('./tools');
function Cookie(config){
	var _self = this;
	_self.config = tools.load({
		ip : "127.0.0.1",
		dbName:'people',
		coll4qq:'c_login_qqcookie',
		coll4weibo:'c_login_cookie',
	},config);

	_self.getCookie=function(arg,callback){
		var client=new mongo.Db(_self.config.dbName,new mongo.Server(_self.config.ip,27017),{fsync:true});
		function do_callback(err,data){
			client.close();
			if(err) callback(err);
			else callback(null,data);
		}
		client.open(function(err){
			if(err) do_callback(err);
			else	client.collection(_self.config.coll4weibo,function(err,coll){
					if(err) callback(err);
					else	coll.find({'status':'available'}).toArray(function(err,data){
							if(err)	do_callback(err);				
							else{
								do_callback(null,data[parseInt(Math.random()*data.length)]);
							}
					});
			});
		});
	};

	_self.get_qq_cookie=function(arg,callback){
		var client=new mongo.Db(_self.config.dbName,new mongo.Server(_self.config.ip,27017),{fsync:true});
		function do_callback(err,data){
			client.close();
			if(err) callback(err);
			else callback(null,data);
		}
		client.open(function(err){
			if(err)	do_callback(err);
			else{
				client.collection(_self.config.coll4qq,function(err,coll){
					if(err) do_callback(err);
					else	coll.find({'status':'available'}).toArray(function(err,data){
						if(err)	do_callback(err);				
						else	do_callback(null,data[parseInt(Math.random()*data.length)]);
					});
				});
			}
		});
	};
	
}
exports.Cookie=Cookie;


function test(){
	var cookie=new Cookie();
	cookie.get_qq_cookie("",function(err,data){
		if(err) console.log(err);
		else console.log(data);
	});
}
//test();
