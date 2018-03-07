# nodeDBManage
node-postgreSQL-异步-分批-数据处理

### 使用pg链接postgreSQL数据库

```javascript

const { Pool, Client } = require("pg");

//数据库配置项
const connectionString =
	"postgresql://dbuser:secretpassword@database.server.com:3211/mydb";

const pool = new Pool({
	connectionString: connectionString
});

//链接
pool.connect();

//查询
var querySQLString="SELECT u.*, NOW() req_tm FROM public." +
    table_name +
    " u" +
    " WHERE coalesce(handlestatus,-1) in (101, -1) AND submittimes<='2'" +
    " ORDER BY submittimes" +
    " LIMIT " +
    number;

var res = await pool.query(querySQLString);

//多列更新          
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

var dbres = await pool.query(updateSQLString, value);

```

### 数据并发处理

核心内容--并发--请查看index.js