const Base = require('./base.js');
const moment = require('moment');
const qiniu=require('qiniu')
const fs = require("fs");
const path = require("path");
var nodeExcel = require('excel-export');
var http = require('http');

module.exports=class extends Base{
  async exportExcelAction(){
    const model = this.model("goods");
    let conf = {};//创建一个写入格式map，其中cols(表头)，rows(每一行的数据);
    let cols = ['ID', '姓名', '简介','数量(sort)','图片','是否删除'];//手动创建表头中的内容
    conf.cols = [];//在conf中添加cols
    for(let i = 0; i < cols.length; i++) {
        let tits = {}; //创建表头数据所对应的类型,其中包括 caption内容 type类型
        tits.caption = cols[i];//添加内容
        tits.type = 'string';//添加对应类型，这类型对应数据库中的类型，入number，data但一般导出的都是转换为string类型的
        conf.cols.push(tits);//将每一个表头加入cols中
    } 
    
    const data=await model.where({
      is_delete: 0,
    }).select()
    return this.success(data)
  }
}

/*     let rows =['id','',	'','name',	'','',	'',	'',	'',	'',	'',	'goods_brief'	,''	,'sort_order','',''	,''	,'',	'list_pic_url',	'',	'',	'is_delete']
    let datas =[];//用于承载数据库中的数据
    for(let i = 0; i < data.length; i++){ //循环数据库得到的数据
        let row =[];//用来装载每次得到的数据
        for(let j = 0; j < rows.length; j++){//内循环取出每个字段的数据
            rows[j]==''?'':row.push(data[i][rows[j]].toString());
        }
        datas.push(row);//将每一个{ }中的数据添加到承载中
    }
    conf.rows = datas;
    let result =nodeExcel.execute(conf); //将所有数据写入nodeExcel中
    //res.setHeader('Content-Type', 'application/vnd.openxmlformats;charset=utf-8');//设置响应头，在Content-Type中加入编码格式为utf-8即可实现文件内容支持中文
    //res.setHeader("Content-Disposition", "attachment; filename="+ encodeURI('用户信息表') + ".xlsx");//设置下载文件命名，中文文件名可以通过编码转化写入到header中。
    http.header('Content-Type', 'application/vnd.openxmlformats;charset=utf-8');
    http.header("Content-Disposition", "attachment; filename="+ encodeURI('用户信息表') + ".xlsx");
    res.end(result,'binary');//将文件内容传入 */


