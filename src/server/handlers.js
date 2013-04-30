var logger = require('log4js').getLogger(__filename.replace(/.*\/([^\/]+).js/,'$1'));
var mongo = require('mongodb');
var tools = require('./tools');
var pool  = require('generic-pool');
var async = require('async');

function MongoSaver(config){
	this.config = tools.load({
		 name 	: 'MongoSaver'
		,dbName : 'test'
		,collectionName : 'weibo'
	},config);
}
MongoSaver.prototype.save = function(items,callback){
	this.saveToCollection(this.config.collectionName,items,callback);
}
MongoSaver.prototype.saveToCollection=function(collection,items,callback){
	var _self=this;
	var client=new mongo.Db(_self.config.dbName,new mongo.Server('127.0.0.1',27017),{fsync:true});
	function do_callback(err){
		client.close();
		if(err) logger.error(err);
		if(callback) callback(err);
	}
	client.open(function(err){
		if(err) do_callback(err);
		client.collection(_self.config.collectionName,function(err,collection){
			if(err)	do_callback(err);
			else{
				async.every(items,function(item,done){
						collection.insert(item,function(err){
							if(err) do_callback(err);
							else done(true);
						});	
					},function(all){do_callback();}
				);
			}	
		});
	});
}

var Batch = require('./batch_operator');
var weiboSaver = new MongoSaver({dbName:'people',collectionName:'weibo'});
var weiboSaverBatch = new Batch({
	 name : "weiboPeopleSaver"
	,op  : weiboSaver.save.bind(weiboSaver)
});
var pageSaver = new MongoSaver({dbName:'pagebase',collectionName:'weibo'});
var pageSaverBatch = new Batch({
	 name : "weiboPageSaver"		
	,op : pageSaver.save.bind(pageSaver)
});

/*-------------tencent method----------*/
var tencentSaver=new MongoSaver({dbName:'pagebase',collectionName:'tencent'});
var tencentSaverBatch=new Batch({
	name:"tencentPageSaver",
	op:tencentSaver.save.bind(tencentSaver)
});
/*------------end tencent method--------*/
var save = function(data,callback){
	//logger.debug(data);
	var fs = require('fs');
	fs.writeFileSync('save.html',data.html);
	callback(null,{'__self__':[]});
}

var redis=require('redis-node');
var redisClient = redis.createClient();
var async = require('async');
//var $ = require('jquery');
/*
 * data => { extra:obj url:"url" , html:"html" , href:["href"]}
 * callback => function( err
 * 						,next=>[
 * 							{
 * 								 handler : "handlerName"
 * 								,extra 	 : extra
 * 								,urls	 : ["urls"]
 * 							}
 * 						]
 * 				)
 * */
/*---------------tencent method---------------*/
var tencentPeople=function(data,callback,finish){
	_self=this;
	var user=data.url.replace(/u=(.*?)&&/,'$1');
	var nexts=[];
	var extract_pages=function(done){
		if(data.url.match(/\/following.php/)){
			var nextObjs=[];
			var names=data.html.match(/\"name\"\:\".*?\"/g);
			var fans_count=data.html.match(/\"count\"\:.*?\}/g);
			if(names&&names.length>0){	
				for(var i=0;i<names.length;i++){
					var name=names[i].replace(/\"name\"\:\"(.*?)\"/g,'$1');
					var following=fans_count[i].replace(/\".*?following\"\:(.*?)\,.*?\}/,'$1');
					var follower=fans_count[i].replace(/\".*?follower\"\:(.*?)\}/,'$1');
					var obj={name:name,following:following,follower:follower};
					nextObjs.push(obj);
				}
				names=null;fans_count=null;

				_self.flush=async.queue(function(urls,done){
	 	                       callback(null,[{
				                       handler : 'tencent_people'
		                                       ,urls    : urls.nexts
		                        }],function(){
						done();
					});
				},100);

			
				async.filter(nextObjs,
					function(user,callback){
						redisClient.sadd('tencent',user.name,function(err,res){
							callback(res);
						});
					},
					function(results){
						results.forEach(function(u){
							nexts.push('http://1.t.qq.com/home_userinfo.php?u='+u.name);
							for(var j=1;j<=Math.ceil(parseInt(u.following)/15.0);j++){
								nexts.push('http://1.t.qq.com/asyn/following.php?u='+u.name+'&&time=&page='+j+'&id=&apiType=4&apiHost=http%3A%2F%2Fapi.t.qq.com&_r=1365666653702');
								if(nexts.length>=10){
									_self.flush.push({nexts:nexts});
									nexts=[];
								}else{
									continue;
								}
							}
							_self.flush.push({nexts:nexts});
							nexts=[];
						});
						done();
					}	
				);
			}else done();
		}else	done();

	}
	
	extract_pages(function(){
		tencentSaverBatch.push({url:data.url,html:data.html,time:(new Date().getTime())});
		finish();
	});
};
exports.tencentPeople=tencentPeople;
/*--------------end tencent method------------*/

exports.weiboPeople = function(data,callback,finish){
	_self=this;
	var user = data.url.replace(/http.*\/\/[^\/]*\/([0-9]*)\/.*/,'$1');
	var nexts = [];
	//extract all user id
	var getUsers = function(done){
		if(data.url.match(/follow/)|| data.url.match(/fans/) ){
			_self.flush=async.queue(function(urls,done){
		                callback(null,[{
 	        		               handler : 'weibo_people'
                		               ,urls    : urls.nexts
   	        		 		}]
						,function(){
							done();
						}
					);
			},100);
			var users = {};
			data.href.forEach(function(href){
				if(href.match(/http:\/\/weibo.com\/[0-9]*\/.*/)){
					var u = href.replace(/http:\/\/weibo.com\/([0-9]*)\/.*/,"$1");
					users[u] = 1;
				}
			});
			delete users[user];
			users = tools.allkeys(users);
			//check if already crawled, if not, generate new urls
			async.filter(users
				,function(item,callback){
					var ret = redisClient.sadd('weibo:users',item,function(err,succ){
						callback(succ);
					});
				},function(results){
					results.forEach(function(u){
						var base = 'http://weibo.com/'+u;
						nexts.push(base + '/info');	
						nexts.push(base + '/follow');	
						nexts.push(base + '/fans');	
					});
					if(nexts.length){
						_self.flush.push({nexts:nexts});
						nexts=[];
					}
					done();
				}
			);
		}else{	done();	}
	}
	// get the next page links
	var getNexts = function(done){
		if(data.url.match(/follow$/)||data.url.match(/fans$/)){
			_self.flush=async.queue(function(urls,done){
		                callback(null,[{
 	        		               handler : 'weibo_people'
                		               ,urls    : urls.nexts
   	        		 		}]
						,function(){
							done();
						}
					);
			},100);

			var reg = new RegExp(data.url+'\\?.*page=([0-9]*)');
			var maxPage = 1;
			data.href.forEach(function(href){
				var ma = href.match(reg);
				if(ma){	
					maxPage = Math.max(maxPage,ma[1]);	
				}
			});
			var base = data.url + '?page=';
			for(var i=2;i<=maxPage;++i){
				nexts.push(base+i);
				if(nexts.length>=10){
					_self.flush.push({nexts:nexts});
					nexts=[];
				}else{
					continue;
				}
			}
			if(nexts.length){
				_self.flush.push({nexts:nexts});
				nexts=[];
			}
			done();
		}else{	done();	}
	}
	//extract user infomation if needed
	var getInfo = function(done){
		if(false && data.url.match(/.*info$/)){
			var reg = /<script>STK && STK.pageletM && STK.pageletM.view\((.*)\)<\/script>/g ;
			var ma = data.html.match(reg);
			var info = {uid:user,time:(new Date().getTime())};
			ma.forEach(function(s){
				var obj = JSON.parse(s.replace(reg,"$1"));
				if(obj.pid == "pl_profile_infoBase" && obj.html){
					var dom = $(obj.html);
					info.base = {};
				}else if(obj.pid == "pl_profile_infoCareer" && obj.html){
				}else if(obj.pid == "pl_profile_infoTag" && obj.html){
				}else if(obj.pid == "pl_profile_infoEdu" && obj.html){
				}else if(obj.pid == "pl_profile_infoGrow" && obj.html){
				}
			});
			weiboSaverBatch.push(info);
			done();
		}else{	done();	}
	}
	async.parallel({
			 getInfo  : getInfo
			,getNexts : getNexts
			,getUsers : getUsers	
		},function(err,results){
			pageSaverBatch.push({url:data.url,html:data.html,time:(new Date().getTime())});
			finish();
		}
	);
}



var client = new mongo.Db('pagebase', new mongo.Server("127.0.0.1",27017),{fsync:true});
var mongoBatchSaver = async.cargo(function(items,done){
	client.open(function(err){
		async.every(items,function(item,done){
			client.collection(item.collection,function(err,collection){
				delete item.collection;
				collection.insert(item,function(err){
					done(!err);
				});		
			});		
		},function(result){
			client.close();
			done();
		});
	});		
});

exports.saver = function(data,callback){
	var toSave = {url:data.url,html:data.html,time:new Date().getTime(),collection:data.extra};	
	mongoBatchSaver.push(toSave);
	callback(null,[]);
}

function test(){
	var pageSaver = new MongoSaver({dbName:'test',collectionName:'weibo'});
	var pageSaverBatch = new Batch({
		 name : "weiboPageSaverTest"		
		,op : pageSaver.save.bind(pageSaver)
	});
	pageSaverBatch.push({url:"url",html:"html"});
}
//test();
