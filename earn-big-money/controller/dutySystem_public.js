var db = require('./DBController_public');
var utils = require('./Utils_public')

var dutySystem = function() {
	this.version = "1.0.0";

	// 用于创建任务
	this.createDuty = function(req, res, next) {
		// 首先判断用户是否存在，余额够不够，然后再更新事务表和用户表，事务用户表
		tdid = ""
		if (req.session.user == null) {
			res.status(400);
			res.send({
				"msg": "Not Log in"
			});
		}
		else {
			let strc = db.getSQLObject();
			strc["query"] = 'select';
			strc["tables"] = "userInfo";
			strc["data"] = {
				"umoney": 0
			};//传入一个结构体
			strc["where"]["condition"] = [
				"uid  = " + db.typeTransform(req.session.user.uid)
			];
			db.ControlAPI_obj(strc, (resultFromDatabase)=>{
				console.log(resultFromDatabase[0]); // 取下标为0即可
				if (resultFromDatabase == null) {
					res.status(400);
					res.send({"msg": "用户不存在"});
				}
				else {
					if (resultFromDatabase[0].umoney < req.body.accepters*req.body.money) {
						res.status(400);
						res.send({"msg":"余额不足"});
					}
					else {
						//更新事务信息
						strc["query"] = 'insert';
						strc["tables"] = "duty";
						tdid = (req.session.user.uid).toString() + "_" + utils.getMilliseconds().toString()
						strc["data"] = {
							"did": tdid,
							"dtitle": req.body.title,
							"dsponsor": req.session.user.uid,
							"daccepters": req.body.accepters,
							"dcontent": req.body.content,
							"dstartTime": req.body.starttime,
							"dendTime": req.body.endtime,
							"dmoney": req.body.money,
							"dtype": req.body.type
						};//传入一个结构体
						db.ControlAPI_obj(strc, (resultFromDatabase1)=>{
							//console.log(resultFromDatabase1); // 取下标为0即可
							if (resultFromDatabase1 == null) {
								res.status(400);
								res.send({"msg" : "任务ID重复"});
							}
							else {
								//更新用户信息
								strc["tables"] = "userInfo";
								strc["query"] = 'update';
								strc["data"] = {
									"umoney": resultFromDatabase[0].umoney - req.body.accepters * req.body.money
								};//传入一个结构体
								db.ControlAPI_obj(strc, (resultFromDatabase2)=>{
									if (resultFromDatabase2 == null) {
										res.send({"msg": "Failed in creating a duty."});
									}
									else {
										//更新用户-事务表
										strc["query"] = 'insert';
										strc["tables"] = "userDuty";
										strc["data"] = {
											"uid": req.session.user.uid,
											"did": tdid,
											"status": 'published',
											"type": 'sponsor'
										};//传入一个结构体
										db.ControlAPI_obj(strc, (resultFromDatabase3)=>{
											if (resultFromDatabase3 == null) {
												res.send({"msg": "Failed in creating a duty."});
											}
											else {
												res.send({"msg": "success."});
											}
										});
									}
								});
							}
						});//回调函数，
					}
				}
			});//回调函数，
		}
	}
	
	// 用于领取任务
	this.acceptDuty = function(req, res, next){
		if (req.session.user == null) {
			res.status(400);
			res.send({
				"msg": "Not Log in"
			});
		}
		else {
			//首先判断用户id和事务id是否存在，以及当前是否到达了人数上限，以及用户是否参加过同类活动，然后更新事务表和用户事务表
			let strc = db.getSQLObject();
			strc["query"] = 'select';
			strc["tables"] = "userInfo";
			strc["data"] = {
				"uid": 0
			};//传入一个结构体
			strc["where"]["condition"] = ["uid = " + req.session.user.uid];
			db.ControlAPI_obj(strc, (resultFromDatabase)=>{
				//console.log(resultFromDatabase[0]); // 取下标为0即可
				if (resultFromDatabase == null || resultFromDatabase.length == 0) {
					res.send({"msg":"用户不存在"});
				}
				else {
					strc["tables"] = "duty";
					strc["data"] = {
						"curaccepters": 0,
						"daccepters": 0
					};//传入一个结构体
					strc["where"]["condition"] = ["did = " + db.typeTransform(req.body.did)];
					db.ControlAPI_obj(strc, (resultFromDatabase1)=>{
						//console.log(resultFromDatabase1); // 取下标为0即可
						if (resultFromDatabase == null || resultFromDatabase.length == 0) {
							res.send({"msg" : "任务ID不存在"});
						}
						else {
							if (resultFromDatabase1[0].curaccepters >= resultFromDatabase1[0].accepters) {
								res.send({"msg" : "任务人数已满"});
							}
							else {
								strc["query"] = 'insert';
								strc["tables"] = "userDuty";
								strc["data"] = {
									"uid": req.session.user.uid,
									"did": req.body.did,
									"status": "accepted",
									"type": "accepter"
								};//传入一个结构体
								db.ControlAPI_obj(strc, (resultFromDatabase2)=>{
									//console.log(resultFromDatabase2); // 取下标为0即可
									if (resultFromDatabase2 == null) {
										res.send({"msg" : "任务不可重复认领"});
									}
									else {
										strc["query"] = 'update';
										strc["tables"] = "duty";
										strc["data"] = {
											"curaccepters": resultFromDatabase1[0].curaccepters+1
										};//传入一个结构体
										strc["where"]["condition"] = ["did = "+ db.typeTransform(req.body.did)];
										db.ControlAPI_obj(strc, (resultFromDatabase3)=>{
											if (resultFromDatabase3 == null) {
												res.send({"msg": "Failed in taking a duty."});
											}
											else {
												res.send({"msg": "success."});
											}
										});
									}
								});//回调函数，
							}
						}
					});//回调函数，
				}
					
			});//回调函数，		
		}
	}

	// 用于查询任务
	this.queryDuty = function(req, res, next){
		let strc = db.getSQLObject();
		console.log(req.query.did)
		strc["query"] = 'select';
		strc["tables"] = "duty";
		strc["data"] = {
			"did": db.typeTransform(req.body.did),
			"dtitle": req.body.title,
			"dsponsor": req.body.id,
			"daccepters": req.body.accepters,
			"curaccepters": req.body.accepters,
			"dmodifyTime": req.body.accepters,
			"dcontent": req.body.content,
			"dstartTime": req.body.starttime,
			"dendTime": req.body.endtime,
			"dmoney": req.body.money,
			"dtype": req.body.type
		};
		strc["where"]["condition"] = ["did = "+db.typeTransform(req.query.did)];
		db.ControlAPI_obj(strc, (resultFromDatabase)=>{
			//console.log(resultFromDatabase[0]); // 取下标为0即可
			if (resultFromDatabase == null || resultFromDatabase.length == 0) {
				res.send({ "msg": "Failed in finding this duty."})
			}
			else {
				res.send({ 
					"msg": "success.",
					"info": resultFromDatabase[0]
				});
			}
		});//回调函数，
	}
	
	// 用于更新任务
	this.updateDuty = function(req, res, next) {
		//如果对money或uaccepter进行更新的话，首先看是否已经有人接受，如果有人接受的话就不能改，如果想提高价格的话，要看余额够不够
		if (req.session.user == null) {
			res.status(400);
			res.send({
				"msg": "Not Log in"
			});
		}
		else {
			let strc = db.getSQLObject();
			strc["query"] = 'select';
			strc["tables"] = "userInfo";
			strc["data"] = {
				"uid": 0,
				"umoney": 0
			};//传入一个结构体
			strc["where"]["condition"] = ["uid = "+req.session.user.uid];
			db.ControlAPI_obj(strc, (resultFromDatabase)=>{
				console.log(resultFromDatabase[0]); // 取下标为0即可
				if (resultFromDatabase == null || resultFromDatabase.length == 0) {
					res.send({"msg": "用户不存在"})
				}
				else {
					strc["query"] = 'select';
					strc["tables"] = "duty";
					strc["data"] = {
						"dsponsor": 0,
						"dmoney": 0,
						"daccepters": 0,
						"curaccepters": 0
					};//传入一个结构体
					strc["where"]["condition"] = ["did = "+db.typeTransform(req.body.did)];
					db.ControlAPI_obj(strc, (resultFromDatabase1)=>{
						newmoney = null
						newaccepter = null
						if (!(resultFromDatabase == null || resultFromDatabase.length == 0)){
							if (req.body.money !== null) {
								newmoney = req.body.money;
							}
							if (req.body.accepters != null) {
								newaccepter = req.body.accepters;
							}
						}
						console.log(resultFromDatabase1)
						if (resultFromDatabase == null || resultFromDatabase.length == 0) {
							res.send({"msg": "事务id不存在"});
						}
						else if (resultFromDatabase1[0].dsponsor != req.session.user.uid) {
							// console.log(resultFromDatabase1[0].dsponsor)
							// console.log(req.body.id)
							// console.log(typeof(resultFromDatabase1[0].dsponsor))
							// console.log(typeof(req.body.id))
							res.send({"msg": "你不是事务的发起者，无更改权限"});
						}
						else if (resultFromDatabase1[0].curaccepters > 0) {
							res.send({"msg": "任务已经有人认领，不可更改"});
						}
						else if (newmoney*newaccepter - resultFromDatabase1[0].dmoney*resultFromDatabase1[0].daccepters > resultFromDatabase[0].umoney) {
							res.send({"msg": "余额不足"});
						}
						else {
							strc["query"] = 'update';
							strc["tables"] = "duty";
							strc["data"] = {};
							if (req.body.title != null) {
								strc["data"]["dtitle"] = req.body.title;
							}
							if (req.body.accepters != null) {
								strc["data"]["daccepters"] = req.body.accepters;
							}
							if (req.body.content != null) {
								strc["data"]["dcontent"] = req.body.content;
							}
							if (req.body.startTime != null) {
								strc["data"]["dstartTime"] = req.body.startTime;
							}
							if (req.body.endTime != null) {
								strc["data"]["dendTime"] = req.body.endTime;
							}
							if (req.body.money != null) {
								strc["data"]["dmoney"] = req.body.money;
							}
							console.log(strc["data"])
							strc["where"]["condition"] = ["did = "+db.typeTransform(req.body.did)];
							db.ControlAPI_obj(strc, (resultFromDatabase2)=>{
								console.log(resultFromDatabase2)
								if (resultFromDatabase2 !== null) {
									strc["tables"] = "userInfo";
									strc["query"] = 'update';
									strc["data"] = {
										"umoney": resultFromDatabase[0].umoney-newmoney*newaccepter + resultFromDatabase1[0].dmoney*resultFromDatabase1[0].daccepters
									};//传入一个结构体
									strc["where"]["condition"] = ["uid = "+req.session.user.uid];
									db.ControlAPI_obj(strc, (resultFromDatabase3)=>{
										console.log(resultFromDatabase3)
										if (resultFromDatabase3 !== null) {
											res.send({"msg": "Success"});
										}
										else {
											res.send({"msg": "Failed in modification."});
										}
									});//回调函数，
								}
								else {
									res.send({"msg": "Failed in modification."});
								}
							});//回调函数，
						}
					});
				}
			});
		}
	}
	
	
	// 用于删除任务
	this.deleteDuty = function(req, res, next) {
		//首先看是否已经有人接受，如果有人接受的话就不能删，然后还要更新回去价格，从userduty里面删对应的表
		if (req.session.user == null) {
			res.status(400);
			res.send({
				"msg": "Not Log in"
			});
		}
		else {
			let strc = db.getSQLObject();
			strc["query"] = 'select';
			strc["tables"] = "userInfo";
			strc["data"] = {
				"uid": req.body.id,
				"umoney": req.body.id
			};//传入一个结构体
			strc["where"]["condition"] = ["uid = "+req.session.user.uid];
			db.ControlAPI_obj(strc, (resultFromDatabase)=>{
				console.log(resultFromDatabase[0]); // 取下标为0即可
				if (resultFromDatabase == null || resultFromDatabase.length == 0) {
					res.send({"msg": "用户不存在"})
				}
				else {
					strc["tables"] = "duty";
					strc["data"] = {
						"dsponsor": req.body.id,
						"dmoney": req.body.id,
						"daccepters": req.body.id,
						"curaccepters": req.body.id
					};//传入一个结构体
					strc["where"]["condition"] = ["did = "+db.typeTransform(req.body.did)];
					db.ControlAPI_obj(strc, (resultFromDatabase1)=>{
						console.log(resultFromDatabase1)
						if (resultFromDatabase1[0] == null) {
							res.send({"msg": "事务id不存在"});
						}
						else if (resultFromDatabase1[0].dsponsor != req.session.user.uid) {
							// console.log(resultFromDatabase1[0].dsponsor)
							// console.log(req.body.id)
							// console.log(typeof(resultFromDatabase1[0].dsponsor))
							// console.log(typeof(req.body.id))
							res.send({"msg": "你不是事务的发起者，无删除权限"});
						}
						else if (resultFromDatabase1[0].curaccepters > 0) {
							res.send({"msg": "任务已经有人认领，不可删除"});
						}
						else {
							strc["query"] = 'delete';
							strc["tables"] = "duty";
							strc["where"]["condition"] = ["did = "+db.typeTransform(req.body.did)];
							db.ControlAPI_obj(strc, (resultFromDatabase2)=>{
								console.log(resultFromDatabase2)
								if (resultFromDatabase2 !== null) {
									strc["tables"] = "userDuty";
									strc["query"] = 'delete';
									strc["where"]["condition"] = ["did = "+db.typeTransform(req.body.did)];
									db.ControlAPI_obj(strc, (resultFromDatabase3)=>{
										console.log(resultFromDatabase3)
										if (resultFromDatabase3 !== null) {
											strc["tables"] = "userInfo";
											strc["query"] = 'update';
											strc["data"] = {
												"umoney": resultFromDatabase[0].umoney + resultFromDatabase1[0].dmoney*resultFromDatabase1[0].daccepters
											};//传入一个结构体
											strc["where"]["condition"] = ["uid = "+req.session.user.uid];
											db.ControlAPI_obj(strc, (resultFromDatabase4)=>{
												console.log(resultFromDatabase4)
												if (resultFromDatabase4 !== null) {
													res.send({"msg": "Success"});
												}
												else {
													res.send({"msg": "Failed in deleting a duty."});
												}
											});//回调函数，
										}
										else {
											res.send({"msg": "Failed in deleting a duty."});
										}
									});//回调函数，
								}
								else {
									res.send({"msg": "Failed in deleting a duty."});
								}
							});//回调函数，
						}
					});
				}
			});
		}
	}

	this.screenDuty = function(req, res, next) {
		let strc = db.getSQLObject();
		selects = req.query.select.split(',');
		sorts = req.query.sortBy.split(',');
		strc["query"] = 'select';
		strc["tables"] = "duty";
		strc["data"] = {
			"did": 0,
			"dtitle": 0,
			"dsponsor": 0,
			"daccepters": 0,
			"curaccepters": 0,
			"dmodifyTime": 0,
			"dcontent": 0,
			"dstartTime": 0,
			"dendTime": 0,
			"dmoney": 0,
			"dtype": 0
		};
		conditions = []
		for (var i  = 0; i < selects.length; i = i+2) {
			conditions.push("d"+selects[i]+" = "+db.typeTransform(selects[i+1]));
		}
		strc["where"]["condition"] = conditions;
		strc["options"]["limit"] = (req.query.pageNumber-1)*req.query.countPerPage+","+req.query.countPerPage;
		// strc["options"]["offset"] = (req.query.pageNumber-1)*req.query.countPerPage;
		strc["options"]["order by"] = sorts[1]+" "+sorts[3];
		db.ControlAPI_obj(strc, (resultFromDatabase)=>{
			console.log(resultFromDatabase); // 取下标为0即可
			if (resultFromDatabase == undefined) {
				res.send({ "msg": "Failed in screening.."})
			}
			else {
				res.send({"count": resultFromDatabase.length, "content": resultFromDatabase});
			}
		});//回调函数，
	}
}

module.exports = new dutySystem();
