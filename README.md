## 基于链家开发的前端监控系统, 工业级项目

### 一、开发流程

![链家前端监控系统流程](https://p.ipic.vip/7no008.jpg)

1. 浏览器通过 sdk 将日志上报到 nginx 服务器
2. server 解析访问日志 进行清洗和过滤 生成 json 然后写入数据库
3. server 通过接口提供数据
4. client 通过接口提供界面

### 二、使用技术

1. client 客户端 提供界面（基于 vue+webpack 开发）
2. sdk 开发工具包 API 灯塔 封装链家 数据上报
3. server 服务端 写入库指令 提供接口

4. redis 可以实现高速读写 做缓存 主要用于报警
5. nginx 负责提供上报 我们要把上报的数据发给 nginx 负责记录日志
6. mysql 项目里所有的监控 用户 报警 都是放在 mysql 里

### 三、 系统关键设计说明

#### 3.1 安装

##### 3.1.1 安装 mysql

- [mysql](https://dev.mysql.com/downloads/mysql/)

##### 3.1.2 安装 redis

- [redis](https://redis.io/)

##### 3.1.3 安装 nginx

- [nginx](http://nginx.org/en/download.html)

#### 3.2 配置 nginx

##### 3.2.1 nginx.conf

```js
http {
    include       mime.types;
    default_type  application/octet-stream;

    log_format  main '$time_iso8601	-	-	$remote_addr	$http_host	$status	$request_time	$request_length	$body_bytes_sent	15d04347-be16-b9ab-0029-24e4b6645950	-	-	9689c3ea-5155-2df7-a719-e90d2dedeb2c 937ba755-116a-18e6-0735-312cba23b00c	-	-	$request_uri	$http_user_agent	-	sample=-&_UC_agent=-&device_id=-&-	-	-	-';
    server {
        listen       80;
        server_name  localhost;
        if ($time_iso8601 ~ "^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})") {
         set $year $1;
         set $month $2;
         set $day $3;
         set $hour $4;
         set $minute $5;
        }
        access_log  /opt/homebrew/etc/nginx/logs/$year$month-$day-$hour-$minute.log  main;

        location / {
            root   /opt/homebrew/etc/nginx/www;
            index  index.html index.htm;
        }

        location /gif {
            root   /opt/homebrew/etc/nginx/www;
            autoindex on;  # 启用目录列表，如果不需要可以删除此行
        }

        error_page   500 502 503 504  /50x.html;
        location = /50x.html {
            root   html;
        }
    }
}
```

##### 3.2.2 字段含义

| 字段             | 含义                            |
| :--------------- | :------------------------------ |
| $time_iso8601    | 服务器时间的ISO 8610格式        |
| $remote_addr     | 客户端地址                      |
| $http_host       | 主机名                          |
| $status          | HTTP响应代码                    |
| $request_time    | 处理客户端请求使用的时间        |
| $request_length  | 请求的长度                      |
| $body_bytes_sent | 传输给客户端的字节数            |
| $request_uri     | 包含一些客户端请求参数的原始URI |
| $http_user_agent | 客户端用户代理                  |

#### 3.3 下载项目

```shell
git clone https://github.com/RicardoPang/pf-front-monitor.git
```

#### 3.4 埋点上报

##### 3.4.1 安装

```shell
cd monitor/sdk
npm install
```

##### 3.4.2 配置

````js
window.dt && dt.set({
  pid: 'template', // [必填]项目id,
  uuid: 'uuid', // [可选]设备唯一id, 用于计算uv数&设备分布. 一般在cookie中可以取到, 没有uuid可用设备macidfa/imei替代. 或者在storage的key中存入随机数字, 模拟设备唯一id.
  ucid: 'ucid', // [可选]用户ucid, 用于发生异常时追踪用户信息, 一般在cookie中可以取到, 没有可传空字符串
  is_test: true, // 是否为测试数据, 默认为false(测试模式下打点数据仅供浏览, 不会展示在系统中)
  record: {
    time_on_page: true, // 是否监控用户在线时长数据, 默认为true
    performance: true, // 是否监控页面载入性能, 默认为true
    js_error: true, //  是否监控页面报错信息, 默认为true
    // 配置需要监控的页面报错类别, 仅在js_error为true时生效, 默认均为true(可以将配置改为false, 以屏蔽不需要报的错误类别)
    js_error_report_config: {
      ERROR_RUNTIME: true, // js运行时报错
      ERROR_SCRIPT: true, // js资源加载失败
      ERROR_STYLE: true, // css资源加载失败
      ERROR_IMAGE: true, // 图片资源加载失败
      ERROR_AUDIO: true, // 音频资源加载失败
      ERROR_VIDEO: true, // 视频资源加载失败
      ERROR_CONSOLE: true, // vue运行时报错
      ERROR_TRY_CATCH: true, // 未catch错误
      // 自定义检测函数, 上报前最后判断是否需要报告该错误
      // 回调函数说明
      // 传入参数 => 
      //            desc:  字符串, 错误描述
      //            stack: 字符串, 错误堆栈信息
      // 返回值 =>  
      //            true  : 上报打点请求
      //            false : 不需要上报
      checkErrrorNeedReport: function(desc, stack){
        return true
      }
    }
  },
  // 业务方的js版本号, 会随着打点数据一起上传, 方便区分数据来源
  // 可以不填, 默认为1.0.0
  version: '1.0.0',
  // test.com/detail/1.html
  // test.com/detail/2.html
  // test.com/detail/3.html
  // 这种页面来说, 虽然url不同, 但他们本质上是同一个页面
  // 因此需要业务方传入一个处理函数, 根据当前url解析出真实的页面类型
  getPageType: function(location){ return `${location.host}${location.pathname}` }
})
````

##### 3.4.3 监控类型

1.  time_on_page(用户在线时长统计)

   ```js
   // 用户在线时长统计
   const OFFLINE_MILL = 15 * 60 * 1000 // 15分钟不操作认为不在线
   const SEND_MILL = 5 * 1000 // 每5s打点一次
   
   let lastTime = Date.now()
   window.addEventListener('click', () => {
     // 检查是否监控用户在线时长
     const isTimeOnPageFlagOn = _.get(
       commonConfig,
       ['record', 'time_on_page'],
       _.get(DEFAULT_CONFIG, ['record', 'time_on_page'])
     )
     const isOldTimeOnPageFlagOn = _.get(commonConfig, ['online'], false)
     const needRecordTimeOnPage = isTimeOnPageFlagOn || isOldTimeOnPageFlagOn
     if (needRecordTimeOnPage === false) {
       debugLogger(`config.record.time_on_page值为false, 跳过停留时长打点`)
       return
     }
   
     const now = Date.now();
     const duration = now - lastTime;
     if (duration > OFFLINE_MILL) {
       lastTime = Date.now()
     } else if (duration > SEND_MILL) {
       lastTime = Date.now()
       debugLogger('发送用户留存时间埋点, 埋点内容 => ', { duration_ms: duration })
       // 用户在线时长
       log.product(10001, { duration_ms: duration });
     }
   }, false)
   
   {
       "d": {
           "type": "product",
           "code": 10001,
           "detail": {
               "duration_ms": 21553
           },
           "extra": {}
       }
   }
   ```

2.  performance(页面载入性能) 

   ```js
   // sdk\src\index.js
   window.onload = () => {
     // 检查是否监控性能指标
     const isPerformanceFlagOn = _.get(
       commonConfig,
       ['record', 'performance'],
       _.get(DEFAULT_CONFIG, ['record', 'performance'])
     )
     const isOldPerformanceFlagOn = _.get(commonConfig, ['performance'], false)
     const needRecordPerformance = isPerformanceFlagOn || isOldPerformanceFlagOn
     if (needRecordPerformance === false) {
       debugLogger(`config.record.performance值为false, 跳过性能指标打点`)
       return
     }
   
     const performance = window.performance
     if (!performance) {
       // 当前浏览器不支持
       console.log('你的浏览器不支持 performance 接口')
       return
     }
     const times = performance.timing.toJSON()
   
     debugLogger('发送页面性能指标数据, 上报内容 => ', {
       ...times,
       url: `${window.location.host}${window.location.pathname}`
     })
   
     log('perf', 20001, {
       ...times,
       url: `${window.location.host}${window.location.pathname}`
     })
   }
   
   {
       "d": {
           "type": "perf",
           "code": 20001,
           "detail": {
               "connectStart": 1592020165386,
               "navigationStart": 1592020165383,
               "loadEventEnd": 0,
               "domLoading": 1592020165401,
               "secureConnectionStart": 0,
               "fetchStart": 1592020165386,
               "domContentLoadedEventStart": 1592020165630,
               "responseStart": 1592020165393,
               "responseEnd": 1592020165394,
               "domInteractive": 1592020165630,
               "domainLookupEnd": 1592020165386,
               "redirectStart": 0,
               "requestStart": 1592020165387,
               "unloadEventEnd": 1592020165398,
               "unloadEventStart": 1592020165397,
               "domComplete": 1592020165630,
               "domainLookupStart": 1592020165386,
               "loadEventStart": 1592020165630,
               "domContentLoadedEventEnd": 1592020165630,
               "redirectEnd": 0,
               "connectEnd": 1592020165386,
               "url": "localhost:9000/"
           },
           "extra": {}
       }
   }
   ```

3. js_error(页面报错)

   | 错误类型        | 含义             |
   | :-------------- | :--------------- |
   | ERROR_RUNTIME   | js运行时报错     |
   | ERROR_SCRIPT    | js资源加载失败   |
   | ERROR_IMAGE     | 图片资源加载失败 |
   | ERROR_AUDIO     | 音频资源加载失败 |
   | ERROR_VIDEO     | 视频资源加载失败 |
   | ERROR_CONSOLE   | vue运行时报错    |
   | ERROR_TRY_CATCH | 未catch错误      |

   ```js
   // error_runtime
   window.addEventListener('error', function (event) {
       // 过滤 target 为 window 的异常，避免与上面的 onerror 重复
       var errorTarget = event.target
       if (errorTarget !== window && errorTarget.nodeName && LOAD_ERROR_TYPE[errorTarget.nodeName.toUpperCase()]) {
         handleError(formatLoadError(errorTarget))
       } else {
         // onerror会被覆盖, 因此转为使用Listener进行监控
         let { message, filename, lineno, colno, error } = event
         handleError(formatRuntimerError(message, filename, lineno, colno, error))
       }
   }, true)
   
   function formatRuntimerError (message, source, lineno, colno, error) {
     return {
       type: ERROR_RUNTIME,
       desc: message + ' at ' + source + ':' + lineno + ':' + colno,
       stack: error && error.stack ? error.stack : 'no stack' 
     }
   }
   
   {
       "d": {
           "type": "error",
           "code": 7,
           "detail": {
               "error_no": "页面报错_JS_RUNTIME_ERROR",
               "url": "localhost:9000/"
           },
           "extra": {
               "desc": "Uncaught ReferenceError: a is not defined at http://localhost:9000/:53:21",
               "stack": "ReferenceError: a is not defined\n    at http://localhost:9000/:53:21"
           }
       }
   }
   
   // load_error
   function formatLoadError (errorTarget) {
     return {
       type: LOAD_ERROR_TYPE[errorTarget.nodeName.toUpperCase()],
       desc: errorTarget.baseURI + '@' + (errorTarget.src || errorTarget.href),
       stack: 'no stack'
     }
   }
   
   {
       "d": {
           "type": "error",
           "code": 7,
           "detail": {
               "error_no": "页面报错_CONSOLE_ERROR",
               "url": "localhost:9000/"
           },
           "extra": {
               "desc": "vue error"
           }
       }
   }
   
   // ERROR_TRY_CATCH
   function exec(){
       throw new Error('未捕获错误');
   }
   window.dt.tryJS.wrap(exec);
   exec._wrapped();
   
   {
       "d": {
           "type": "error",
           "code": 7,
           "detail": {
               "error_no": "页面报错_TRY_CATCH_ERROR",
               "url": "localhost:9000/"
           },
           "extra": {
               "desc": "未捕获错误",
               "stack": "Error: 未捕获错误\n    at Function.exec (http://localhost:9000/:56:17)\n    at Function.func._wrapped (webpack-internal:///./src/js-tracker/try.js:31:21)\n    at http://localhost:9000/:59:14"
           }
       }
   }
   ```

4. 手工上报

   ```js
   //错误上报
   export const Elog = log.error = (code, detail, extra) => {
     return log('error', code, detail, extra)
   }
   //产品数据上报
   export const Plog = log.product = (code, detail, extra) => {
     return log('product', code, detail, extra)
   }
   //普通信息上报
   export const Ilog = log.info = (code, detail, extra) => {
     return log('info', code, detail, extra)
   }
   
   window.dt.product(19999, {}, {})
   
   {
       "d": {
           "type": "product",
           "code": 19999,
           "detail": {},
           "extra": {}
       }
   }
   ```

#### 3.5 数据处理

##### 3.5.1 安装server

```shell
cd server 
npm install
```

##### 3.5.2 配置

1. 配置mysql

   ```js
   // server\src\configs\mysql.js
   const development = {
     host: '127.0.0.1',
     port: '3306',
     user: 'root',
     password: '5f8b8a5d650637f8',
     database: 'platform'
   }
   ```

2. 配置redis

   ```js
   // server\src\configs\redis.js
   const development = {
     host: '127.0.0.1',
     port: '6379'
   }
   ```

##### 3.5.3 数据存储

1. 表名

   - 所有表都以`t_`开头
   - 原始表添加`_o`后缀，即`t_o_`
   - 结果表添加`-r`后续，即`t_r_`
   - 表名、字段名默认使用下划线方式命名，不区分大小写
   - 数据库编码字符集为`utf8mb4`
   - 记录ID用`unsigned bigint`
   - 如果字段名有关键字，需要加`_c`前缀
   - 所有表中必须有`update_time` 和`create_time`字段

2. 数据库表

   t_o_project 项目名

   | 字段                                                         | 备注 |
   | :----------------------------------------------------------- | :--- |
   | `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT '项目id' |      |
   | `display_name` varchar(50) NOT NULL DEFAULT '' COMMENT '项目名称' |      |
   | `project_name` varchar(50) NOT NULL DEFAULT '' COMMENT '项目代号(替代项目id, 方便debug)' |      |
   | `c_desc` varchar(100) NOT NULL DEFAULT '' COMMENT '备注信息' |      |
   | `rate` int(10) NOT NULL DEFAULT '10000' COMMENT '数据抽样比率' |      |
   | `is_delete` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否已删除(1 => 是, 0 => 否)' |      |
   | `create_ucid` varchar(20) NOT NULL DEFAULT '' COMMENT '创建人ucid' |      |
   | `update_ucid` varchar(20) NOT NULL DEFAULT '' COMMENT '更新人ucid' |      |
   | `create_time` bigint(20) NOT NULL DEFAULT '0' COMMENT '数据库创建时间' |      |
   | `update_time` bigint(20) NOT NULL DEFAULT '0' COMMENT '数据库更新时间' |      |

   ![image-20240907100940357](https://p.ipic.vip/h6obxd.png)

##### 3.5.4 指令

```shell
node dist/fee.js -h
Usage:
  command [arguments] [options]

Global Options:
  --env                            Set NODE_ENV before running the commands
  --no-ansi                        Disable colored output

Available Commands:
 Command
  Command:Demo                     解析nginx日志, 分析pv
 CreateCache
  CreateCache:UpdatePerOneMinute   [每10分钟执行一次] 主动调用方法, 更新Redis缓存, 每10分钟更新一次
 Parse
  Parse:Device                     [按天] 解析nginx日志, 分析指定时间范围Device
  Parse:MenuClick                  [按天] 解析nginx日志, 用户点击情况
  Parse:Monitor                    [按分钟] 解析nginx日志, 分析Monitor
  Parse:Performance                [按小时] 解析nginx日志, 分析分钟级别的指定时间范围内的性能指标
  Parse:TimeOnSiteByHour           [按小时] 解析nginx日志, 分析记录指定时间范围内用户停留时长
  Parse:UV                         [按小时] 解析nginx日志, 分析记录指定时间范围内的uv
  Parse:UserFirstLoginAt           [按天] 解析nginx日志, 记录用户首次登陆时间
 SaveLog
  SaveLog:Nginx                    每一分钟读取Nginx日志文件，并解析
 Summary
  Summary:Error                    [按分钟/按小时/按天] 根据历史数据, 汇总分析错误数
  Summary:HttpError                [按天/按月] 基于数据表做统计, 统计http error分布情况
  Summary:NewUser                  [按小时/按天/按月] 根据历史数据, 汇总分析记录指定时间范围内的新增用户数
  Summary:Performance              [按小时/按天/按月] 根据历史数据, 汇总分析记录指定时间范围内的性能指标数据
  Summary:SystemBrowser            [按月] 基于数据库统计浏览器占比
  Summary:SystemDevice             [按月] 基于数据库统计设备占比
  Summary:SystemOS                 [按月]基于数据库统计操作系统占比
  Summary:SystemRuntimeVersion     [按月] 基于数据库统计浏览器占比
  Summary:TimeOnSite               [按天/按月] 根据历史数据, 汇总分析记录指定时间范围内用户停留时长
  Summary:UV                       [按小时/按天/按月] 根据历史数据, 汇总分析记录指定时间范围内的uv
 Task
  Task:Manager                     任务调度主进程, 只能启动一次
 Utils
  Utils:CleanOldLog                只保留当前月内数据, 每月20号之后自动删除上个月数据
  Utils:GenerateSQL                生成项目在指定日期范围内的建表SQL
  Utils:TemplateSQL                生成项目在指定日期范围内的建表SQL
  Utils:Test                       专业粘贴调试代码
  Utils:TestUC                     测试UC接口
 WatchDog
  WatchDog:Alarm                   [根据报警配置] 监测每一条报警配置对应的项目错误
  WatchDog:Saas                    [按分钟] 检查最近5分钟内错误数是否超出阈值, 自动报警
```

##### 3.5.5 初始化数据库

- 创建`platform`数据库
- `npm run watch`
- `node dist/fee.js Utils:GenerateSQL 1 '2024-09' '2024-09' > init.sql`

```sql
# id, 抽样比率, 项目名(展示), 项目id, 负责人信息
REPLACE INTO `t_o_project` (`id`, `rate`, `display_name`, `project_name`, `c_desc`, `is_delete`, `create_ucid`, `update_ucid`, `create_time`, `update_time`) VALUES (1, 100, '示例项目', 'template', '负责人', 0, '', '', 0, 0);
```

##### 3.5.6 SaveLog:Nginx

- 每一分钟读取Nginx日志文件，并解析

server\src\library\nginx\index.js

```js
let logPath = appConfig.absoluteLogPath
```

server\src\configs\app.js

```js
const development = {
  name: 'fee监控平台开发环境',
  port: 3000,
  proxy: false,
  absoluteLogPath: path.resolve(__dirname, '../../', 'log')
}
node dist/fee.js SaveLog:Nginx
收到数据, 当前共记录1/1条数据
清洗后的日志路径 /Users/pangjianfeng/code/pf-front-monitor/server/log/nginx/raw/month_202409/day_07/10/33.log
清洗后的日志路径 /Users/pangjianfeng/code/pf-front-monitor/server/log/nginx/json/month_202409/day_07/10/33.log
{
    "type": "perf",
    "code": 20001,
    "detail": {
        "connectStart": 1725676421000,
        "navigationStart": 1725676420946,
        "secureConnectionStart": 0,
        "fetchStart": 1725676420950,
        "domContentLoadedEventStart": 1725676421121,
        "responseStart": 1725676421029,
        "domInteractive": 1725676421121,
        "domainLookupEnd": 1725676421000,
        "responseEnd": 1725676421029,
        "redirectStart": 0,
        "requestStart": 1725676421000,
        "unloadEventEnd": 0,
        "unloadEventStart": 0,
        "domLoading": 1725676421038,
        "domComplete": 1725676421134,
        "domainLookupStart": 1725676421000,
        "loadEventStart": 1725676421134,
        "domContentLoadedEventEnd": 1725676421121,
        "loadEventEnd": 0,
        "redirectEnd": 0,
        "connectEnd": 1725676421000,
        "url": "localhost:9000/"
    },
    "extra": {

    },
    "common": {
        "pid": "template",
        "uuid": "uuid0.35271629115544845",
        "ucid": "ucid0.685760818101578",
        "is_test": true,
        "record": {
            "time_on_page": true,
            "performance": true,
            "js_error": true,
            "js_error_report_config": {
                "ERROR_RUNTIME": true,
                "ERROR_SCRIPT": true,
                "ERROR_STYLE": true,
                "ERROR_IMAGE": true,
                "ERROR_AUDIO": true,
                "ERROR_VIDEO": true,
                "ERROR_CONSOLE": true,
                "ERROR_TRY_CATCH": true
            }
        },
        "version": "1.0.0",
        "test": "b47ca710747e96f1c523ebab8022c19e9abaa56b",
        "timestamp": 1725676421135,
        "runtime_version": "1.0.0",
        "sdk_version": "1.0.40",
        "page_type": "localhost:9000/"
    },
    "md5": "79037d010c76d8c7cd27f69b0bea4147",
    "project_id": 1,
    "project_name": "template",
    "time": 1725676421,
    "ua": {
        "ua": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
        "browser": {
            "name": "Chrome",
            "version": "127.0.0.0",
            "major": "127"
        },
        "engine": {
            "name": "Blink",
            "version": "127.0.0.0"
        },
        "os": {
            "name": "Mac OS",
            "version": "10.15.7"
        },
        "device": {
            "vendor": "Apple",
            "model": "Macintosh"
        },
        "cpu": {

        }
    },
    "ip": "59.109.146.215",
    "country": "中国",
    "province": "北京",
    "city": "北京"
}
```

##### 3.5.7 Parse:Performance 

- [按小时] 解析nginx日志, 分析分钟级别的指定时间范围内的性能指标

```js
node dist/fee.js Parse:Performance 2024-09-07_10:33  2024-09-07_10:33
{
  [项目ID,url,指标,汇总的时间]:{
    [国家,省,市],value：{指标和:614,pv和:1}
  }
}
{
  [1,"localhost:9000/","tcp_connect_ms","2024-09-07_10:33"]:{
    ["中国","北京","北京"],value：{"sum_indicator_value":614,"pv":1}
  }
}
```

##### 3.5.8 Summary:Performance

- [按小时/按天/按月] 根据历史数据, 汇总分析记录指定时间范围内的性能指标数据

```js
node dist/fee.js Summary:Performance "2024-09-07 10" hour
node dist/fee.js Summary:Performance 2024-09-07 day
node dist/fee.js Summary:Performance 2024-09 month
```

##### 3.5.9 Parse:TimeOnSiteByHour

- [按小时] 解析nginx日志, 分析记录指定时间范围内用户停留时长
- t_r_city_distribution_1_202006
- t_r_duration_distribution

```js
node dist/fee.js SaveLog:Nginx
node dist/fee.js Parse:TimeOnSiteByHour "2024-09-07 10:33"  "2024-09-07 10:33"
```

##### 3.5.10 Summary:TimeOnSite

- [按小时] 解析nginx日志, 分析记录指定时间范围内用户停留时长
- t_r_duration_distribution

```js
node dist/fee.js Summary:TimeOnSite "2024-09 07"  day
node dist/fee.js Summary:TimeOnSite "2024-09"  month
```

##### 3.5.11 Parse:Monitor

- [按分钟] 解析nginx日志, 分析Monitor
- t_o_monitor_1_202006
- t_o_monitor_ext_1_202006

```js
node dist/fee.js Parse:Monitor "2024-09-07 10:33"  "2024-09-07 10:33"
```

#####  3.5.12 Summary:Error 

- [按分钟/按小时/按天] 根据历史数据, 汇总分析错误数

- t_r_error_summary_1_202006

  ```js
  node dist/fee.js Summary:Error "2024-09-07 10:33"  minute
  node dist/fee.js Summary:Error "2024-09-07 10" hour
  node dist/fee.js Summary:Error "2024-09-07" day
  ```

##### 3.5.13 Parse:Device

- [按天] 解析nginx日志, 分析指定时间范围Device
- t_o_system_collection_1

```js
node dist/fee.js Parse:Device "2024-09-07 10:33"  "2024-09-07 10:33"
projectMap={
  1:{
    "2020-06":{
      "uuid":{
        "browser":"Mobile Safari"
      }
    }
  }
}
```

##### 3.5.14 Summary

- Summary:SystemBrowser [按月] 基于数据库统计浏览器占比
- Summary:SystemDevice [按月] 基于数据库统计设备占比
- Summary:SystemOS [按月]基于数据库统计操作系统占比
- Summary:SystemRuntimeVersion [按月] 基于数据库统计浏览器占比
- t_r_system_browser
- t_r_system_device
- t_r_system_os
- t_r_system_runtime_version

```js
node dist/fee.js Summary:SystemBrowser "2024-09"  month
node dist/fee.js Summary:SystemDevice "2024-09"  month
node dist/fee.js Summary:SystemOS "2024-09"  month
node dist/fee.js Summary:SystemRuntimeVersion "2024-09"  month
```

#### 3.6 计划任务

- server\src\commands\task\manage.js

##### 3.6.1 任务执行周期

```js
1.  每分钟一次(准实时)
    1.  原始数据入库
        1.  错误数据入库(延迟2分钟)
    2.  按分钟统计
        1.  错误数据统计(延迟2分钟)
2.  每10分钟一次
    1.  原始数据入库
        1.  uv
        2.  页面性能指标
        3.  用户停留时长
    2.  按小时统计
        1.  uv
        2.  新用户数
        3.  页面性能指标
        4.  错误数据统计
3.  每小时一次
    1.  原始数据入库
        1.  设备数据
        2.  用户点击
        3.  首次登陆用户
    2.  按天统计(当天)
        1.  uv
        2.  新用户数
        3.  页面性能指标
        4.  错误数据统计
        5.  用户停留时长
4.  每六小时一次
    1.  按天统计(昨日)
        1.  uv
        2.  新用户数
        3.  页面性能指标
        4.  错误数据统计
        5.  用户停留时长
    2.  按月统计
        1.  uv
        2.  新用户数
        3.  页面性能指标
        4.  错误数据统计
        5.  用户停留时长
        6.  操作系统分布
        7.  设备分布
        8.  浏览器分布
```

##### 3.6.2 执行任务

```shell
node dist/fee.js Task:saveLog
```

```js
async handle (args, options) {
  let that = this
  schedule.scheduleJob('0 */1 * * * * *', function () {
    that.log('registerTaskRepeatPer1Minute 开始执行')
    that.execCommand('SaveLog:Nginx', []);
  })
}
```

```js
*  *  *  *  *  *
┬ ┬ ┬ ┬ ┬ ┬
│ │ │ │ │  |
│ │ │ │ │ └ day of week (0 - 7) (0 or 7 is Sun)
│ │ │ │ └───── month (1 - 12)
│ │ │ └────────── day of month (1 - 31)
│ │ └─────────────── hour (0 - 23)
│ └──────────────────── minute (0 - 59)
└───────────────────────── second (0 - 59, OPTIONAL)
```

#### 3.7 前台展示

##### 3.7.1 启动接口

```shell
node dist/app.js
```

![image-20240907105028730](https://p.ipic.vip/0y1om6.png)

##### 3.7.2 启动前台

```shell
cd client
npm i 
npm run start
```

##### 3.7.3 前端应用

client\src\router\index.js

```js
const token = getToken();
if (!token && to.name !== LOGIN_PAGE_NAME) {
    // 未登录且要跳转的页面不是登录页
    next({
      name: LOGIN_PAGE_NAME // 跳转到登录页
    })
}
```

server\src\routes\api\user\index.js

```js
const register = RouterConfigBuilder.routerConfigBuilder('/api/user/register', RouterConfigBuilder.METHOD_TYPE_POST, async (req, res) => {
  const body = _.get(req, ['body'], {})
}
```

server\src\model\project\user.js

```js
async function register (account, userInfo) {
  const tableName = getTableName();  // t_o_user
}
```

##### 3.7.3 页面性能

http://localhost:8080/project/1/monitor/performance

###### 3.7.3.1 urlList

- 用来提供某时间范围内的URL性能列表，因为在查看性能指标的时候会按页面的URL来进行，所以在页面的初始阶段会提供一个接口函数来获取 这些性能指标对应的URL列表

client\src\view\performance\index.vue

```js
    async getUrlList (params = {}) {
      const {
        st,
        et,
        summaryBy
      } = params
      const res = await fetchUrlList({
        st: st || +this.dateRange[0],
        et: et || +this.dateRange[1],
        summaryBy: summaryBy || 'minute'
      })
      this.urlData = (res.data || []).map((item, index) => ({
        name: item
      }))
      this.url = _.get(this, ['urlData', 0, 'name'], '')
      this.getTimeDetail()
      this.getTimeLine()
      if (this.urlColumns) {
        this.urlLoading = false
      }
    },
```

client\src\api\performance\index.js

```js
export const fetchUrlList = (params) => {
  return axios.request({
    url: `project/${getProjectId()}/api/performance/url_list`,
    method: 'get',
    params: {
      ...params
    }
  })
}
Request URL: http://localhost:3000/project/1/api/performance/url_list?st=1591977600000&et=1592051809707&summaryBy=minute
```

server\src\routes\api\performance\index.js

```js
let urlList = RouterConfigBuilder.routerConfigBuilder('/api/performance/url_list', RouterConfigBuilder.METHOD_TYPE_GET, async (req, res) => {
  let projectId = _.get(req, ['fee', 'project', 'projectId'], 0);
  console.log('projectId ',projectId);
  let request = _.get(req, ['query'], {})
  // 获取开始&结束时间
  let startAt = _.get(request, ['st'], 0)
  let endAt = _.get(request, ['et'], 0)
  const summaryBy = _.get(request, 'summaryBy', '')
  if (_.includes([DATE_FORMAT.UNIT.DAY, DATE_FORMAT.UNIT.HOUR, DATE_FORMAT.UNIT.MINUTE], summaryBy) === false) {
    res.send(API_RES.showError(`summaryBy参数不正确`))
    return
  }

  const currentStamp = moment().unix()

  if (startAt) {
    startAt = _.floor(startAt / 1000)
  } else {
    startAt = currentStamp
  }
  if (endAt) {
    endAt = _.ceil(endAt / 1000)
  } else {
    endAt = currentStamp
  }
  let urlList = await MPerformance.getDistinctUrlListInRange(projectId, MPerformance.INDICATOR_TYPE_LIST, startAt, endAt, summaryBy)
  res.send(API_RES.showResult(urlList))
}
)
```

server\src\model\parse\performance.js

```js
async function getDistinctUrlListInRange (projectId, indicatorList, startAt, endAt, countType = DATE_FORMAT.UNIT.MINUTE) {
   for (let tableName of tableNameList) {
    console.log('tableName,countType,indicatorList,countAtTimeList',tableName,countType,indicatorList,countAtTimeList);
    let rawRecordList = await Knex
      .distinct(['url'])
      .from(tableName)
      .where({
        count_type: countType
      })
      .whereIn('indicator', indicatorList)
      .whereIn('count_at_time', countAtTimeList)
      .catch((e) => {
        Logger.warn('查询失败, 错误原因 =>', e)
        return []
      })
    for (let rawRecord of rawRecordList) {
      if (_.has(rawRecord, ['url'])) {
        let url = _.get(rawRecord, ['url'])
        urlList.push(url)
      }
    }
  }
}
// performance distinctUrlList["localhost:9000/"]
```

###### 3.7.3.2 lineChartData

- 在获取 URL之后，根据对应的时间参数提供参数时间范围内的提定URL下面的所有指标折线图

client\src\view\performance\index.vue

```js
async getTimeDetail (params = {}) {
      const {
        st,
        et,
        url,
        summaryBy
      } = params
      const res = await fetchTimeDetail({
        st: st || +this.dateRange[0],
        et: et || +this.dateRange[1],
        url: url || this.url,
        summaryBy: summaryBy || 'hour'
      })
      const dv = new DataSet.View().source(res.data)
      dv.transform({
        type: 'rename',
        map: {
          dns_lookup_ms: 'DNS查询耗时',
          response_request_ms: '请求响应耗时',
          dom_parse_ms: 'DOM解析耗时',
          response_transfer_ms: '内容传输耗时',
          load_resource_ms: '资源加载耗时',
          dom_ready_ms: 'DOM_READY_耗时',
          first_render_ms: '首次渲染耗',
          first_response_ms: '首次可交互耗时',
          first_tcp_ms: '首包时间耗时',
          load_complete_ms: '页面完全加载耗时',
          ssl_connect_ms: 'SSL连接耗时',
          tcp_connect_ms: 'TCP链接耗时'
        }
      })
      dv.transform({
        type: 'fold',
        fields: [
          'DNS查询耗时',
          '请求响应耗时',
          'DOM解析耗时',
          '内容传输耗时',
          '资源加载耗时',
          'DOM_READY_耗时',
          '首次渲染耗',
          '首次可交互耗时',
          '首包时间耗时',
          '页面完全加载耗时',
          'SSL连接耗时',
          'TCP链接耗时'
        ],
        key: 'type',
        value: 'ms'
      })
      const data = dv.rows
      this.lineData = data
      const scale = [{
        dataKey: 'ms',
        sync: true,
        alias: 'ms',
        formatter: (value) => value + ' ms'
      }, {
        dataKey: 'index_timestamp_ms',
        type: 'time',
        tickCount: 10,
        mask: 'MM-DD HH:mm'
      }]
      this.lineScale = scale
      if (this.lineData && this.lineScale) {
        this.isSpinShowDetail = false
      }
    },
export const fetchTimeDetail = (params) => {
  return axios.request({
    url: `project/${getProjectId()}/api/performance/url/line_chart`,
    method: 'get',
    params: {
      ...params
    }
  })
}
http://localhost:3000/project/1/api/performance/url/line_chart?st=1591977600000&et=1592053122452&url=localhost:9000%2F&summaryBy=hour
```

server\src\routes\api\performance\index.js

```js
let lineChartData = RouterConfigBuilder.routerConfigBuilder('/api/performance/url/line_chart', RouterConfigBuilder.METHOD_TYPE_GET, async (req, res) => {
  let projectId = _.get(req, ['fee', 'project', 'projectId'], 0)
  let request = _.get(req, ['query'], {})
  res.send(API_RES.showResult(resultList))
}
)
```

server\src\model\parse\performance.js

```js
async function getDistinctUrlListInRange (projectId, indicatorList, startAt, endAt, countType = DATE_FORMAT.UNIT.MINUTE) {
```

###### 3.7.3.3 urlOverview

- 在获取 URL之后，可以根据此接口提供的时间范围指定的URL的各项指标平均值

client\src\view\performance\index.vue

```js
async getTimeLine (params = {}) {
      const {st,et} = params
      const res = await fetchTimeLine({
        st: st || +this.dateRange[0],
        et: et || +this.dateRange[1],
        url: this.url,
        summaryBy: 'minute'
      })
```

client\src\api\performance\index.js

```js
export const fetchTimeLine = (params) => {
  return axios.request({
    url: `project/${getProjectId()}/api/performance/url/overview`,
    method: 'get',
    params: {
      ...params
    }
  })
}
http://localhost:3000/project/1/api/performance/url/overview?st=1591977600000&et=1592054332424&url=localhost:9000%2F&summaryBy=minute
```

server\src\routes\api\performance\index.js

```js
let urlOverview = RouterConfigBuilder.routerConfigBuilder('/api/performance/url/overview', RouterConfigBuilder.METHOD_TYPE_GET, async (req, res) => {
  let projectId = _.get(req, ['fee', 'project', 'projectId'], 0)
  let request = _.get(req, ['query'], {});
}
async function getUrlOverviewInSameMonth (projectId, urlList, startAt, endAt, countType) {
}
```

### 四、总结

这个基于链家开发的前端监控系统是一个全面的工业级项目，涵盖了从数据采集、传输、存储到分析展示的完整链路。项目的亮点包括：

1. 全面的技术栈：结合了前端（Vue）、后端（Node.js）、数据库（MySQL、Redis）和网络服务（Nginx）等多种技术。
2. 高性能设计：使用Redis进行缓存，优化数据读写速度。
3. 可扩展架构：分层设计允许系统在未来easily扩展新功能。
4. 实时监控能力：能够及时发现并报警潜在问题。
5. 数据驱动决策：通过数据可视化，为业务决策提供支持。

这个项目不仅展示了现代web应用的复杂性，也体现了大规模系统设计的挑战。它要求开发者具备全栈技能，同时对性能优化、安全性和可扩展性有深入理解。这种综合性项目为开发团队提供了宝贵的学习经验，也为公司的技术实力提升做出了重要贡献。
