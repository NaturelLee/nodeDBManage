var md5 = require("md5");
var rest = require("restling");
var Promise = require("bluebird");
var Stopwatch = require("hrstopwatch");

var table_name = "postgresql_table_name";

const { Pool, Client } = require("pg");

const connectionString =
	"postgresql://dbuser:secretpassword@database.server.com:3211/mydb";

const pool = new Pool({
	connectionString: connectionString
});
pool.connect();

// const client = new Client({
//   connectionString: connectionString
// });
// client.connect();
//查询表有多少行
// pool.query('SELECT count(*) from public.table_name');

/**
 * batchsize: 一次数据库循环处理多少条?
 * netbatchsize: 多少个网络并发?//在batchsize为1的条件下，越多效率越高
 * totalLimit: 最多处理多少条
 *可以比实际的数量多，而实际应该选取并发送的数据要由SELECT条件判断筛选
 *需要详细设置满足的条件才能保证每条数据不被重复提交
 *此方法可以自动提交上次没有成功提交的数据
 */
async function NewAwait(batchsize, netbatchsize, totalLimit) {
	var total = 0;

	//totalLimit 由于加count, totalLimit 是非严格限制.
	var count = batchsize;
	while (count > 0 && total < totalLimit) {
		//用完清空
		var res = { rows: [] };
		try {
			var res = await pool.query(
				"SELECT u.*, NOW() req_tm FROM public." +
					table_name +
					" u" +
					// 过滤掉不能处理, 及不需要!!重复!!处理的那些记录!!!!
					" WHERE coalesce(handlestatus,-1) in (101, -1) AND submittimes<='2'" +
					// 重复提交的往后排，如果不进行排列顺序，会重复提交的,可以加上次数判断
					" ORDER BY submittimes" +
					" LIMIT " +
					batchsize
			);
			// where 条件, order by 条件仔细推敲.
		} catch (err) {
			console.error("query error:", err);
		}
		//获取此次数据的条数
		var count = res.rows.length;
		console.log("row count:", count);

		var promises = [];
		for (var i = 0; i < count; i++) {
			var rowone = res.rows[i];
			//total+i为第几条数据index
			var one = update(rowone);
			promises.push(one);
			//当是最后一条或者promises的长度和设置的并发数相等时,并发promises
			//并发上传数据
			if (i == count - 1 || promises.length === netbatchsize) {
				var a = await Promise.all(promises);
				//使用之后清空
				promises = [];
			}
		}

		total += count;
	}
	//返回total作为的index判断现在处理的是第几条数据,从0开始
	return total;
}

/**
 * 数据上传更新
 */
async function update(data) {
	// var indexPhone=data.phone;
	// Data: {"success":"false","errMsg":"性别不能为空","errCode":"204","prodId":"0","brandName":"","bxtypeName":"","
	// bxExpire":"","bxArticle":[],"resultUrl":""}
	let updateSQLString =
		"UPDATE public." +
		table_name +
		" SET(success,errcode,errmsg,prodid,brandname," +
		"bxtypename,bxexpire,bxarticle,resulturl,submittimes,backtime,requesttime,handlestatus," +
		"handlestatusinfo) " +
		"=($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)" +
		" WHERE phone='" +
		phone +
		"'";
	var value = data;

	try {
		console.log("start update:", data.index);
		var dbres = await pool.query(updateSQLString, value);
		console.log(
			"END---第" +
				data.index +
				"条数据更新成功! phone:" +
				phone +
				"---" +
				data.requestTime
		);
		return dbres;
	} catch (err) {
		console.error("ERR第" + data.index + "条数据更新出错!", err);
		return "error";
	}
}
