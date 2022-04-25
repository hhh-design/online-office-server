const Base = require('./base.js');
const moment = require('moment');
const qiniu=require('qiniu')
const fs = require("fs");
const path = require("path");

module.exports=class extends Base{
  async getQiniuTokenAction() {
    
    const TokenSerivce = this.service('qiniu'); // 服务里返回token
    let data = await TokenSerivce.getQiniuToken(); // 取得token值 goods
    let qiniuToken = data.uploadToken;
    let domain = data.domain;
    let info ={
        uptoken:qiniuToken,
        url:domain
    };
    return this.success(info);



    var accessKey = 'H69z0nAdI_-G4Dgg0gImSmxZunovyaY4xRFLW5-7'; //可在个人中心=》秘钥管理查看
    var secretKey = '8P4nXwe5ckjtivTQa9dJ0p806CDxaJNHxz-dnK1_'; //可在个人中心=》秘钥管理查看
    var bucket = "office-automation-system";  //存储空间名称
    var mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
    var options = {
      scope: bucket
    }
    var putPolicy = new qiniu.rs.PutPolicy(options);
    var uploadToken = putPolicy.uploadToken(mac);
    return this.success(uploadToken)
  }

  async onSubmitInfoAction(){
    const values = this.post("info");
    const specData = this.post("specData");
    const specValue = this.post("specValue");
    const cateId = this.post("cateId");
    const model = this.model("goods");
    let picUrl = values.list_pic_url;
    let goods_id = values.id;
    values.category_id = cateId;
    values.is_index = values.is_index ? 1 : 0;
    values.is_new = values.is_new ? 1 : 0;
    let id = values.id;
    if (id > 0) {
      await model
        .where({
          id: id,
        })
        .update(values);
      await this.model("cart")
        .where({
          goods_id: id,
        })
        .update({
          checked: values.is_on_sale,
          is_on_sale: values.is_on_sale,
          list_pic_url: picUrl,
          freight_template_id: values.freight_template_id,
        });
      await this.model("product")
        .where({
          goods_id: id,
        })
        .update({
          is_delete: 1,
        });
      await this.model("goods_specification")
        .where({
          goods_id: id,
        })
        .update({
          is_delete: 1,
        });
      for (const item of specData) {
        if (item.id > 0) {
          await this.model("cart")
            .where({
              product_id: item.id,
              is_delete: 0,
            })
            .update({
              retail_price: item.retail_price,
              goods_specifition_name_value: item.value,
              goods_sn: item.goods_sn,
            });
          delete item.is_delete;
          item.is_delete = 0;
          await this.model("product")
            .where({
              id: item.id,
            })
            .update(item);
          let specificationData = {
            value: item.value,
            specification_id: specValue,
            is_delete: 0,
          };
          await this.model("goods_specification")
            .where({
              id: item.goods_specification_ids,
            })
            .update(specificationData);
        } else {
          let specificationData = {
            value: item.value,
            goods_id: id,
            specification_id: specValue,
          };
          let specId = await this.model("goods_specification").add(
            specificationData
          );
          item.goods_specification_ids = specId;
          item.goods_id = id;
          await this.model("product").add(item);
        }
      }
    } else {
      delete values.id;
      goods_id = await model.add(values);
      for (const item of specData) {
        let specificationData = {
          value: item.value,
          goods_id: goods_id,
          specification_id: specValue,
        };
        let specId = await this.model("goods_specification").add(
          specificationData
        );
        item.goods_specification_ids = specId;
        item.goods_id = goods_id;
        item.is_on_sale = 1;
        await this.model("product").add(item);
      }
    }
    let pro = await this.model("product")
      .where({
        goods_id: goods_id,
        is_on_sale: 1,
        is_delete: 0,
      })
      .select();
    if (pro.length > 1) {
      let goodsNum = await this.model("product")
        .where({
          goods_id: goods_id,
          is_on_sale: 1,
          is_delete: 0,
        })
        .sum("goods_number");
      let retail_price = await this.model("product")
        .where({
          goods_id: goods_id,
          is_on_sale: 1,
          is_delete: 0,
        })
        .getField("retail_price");
      let maxPrice = Math.max(...retail_price);
      let minPrice = Math.min(...retail_price);
      let cost = await this.model("product")
        .where({
          goods_id: goods_id,
          is_on_sale: 1,
          is_delete: 0,
        })
        .getField("cost");
      let maxCost = Math.max(...cost);
      let minCost = Math.min(...cost);
      let goodsPrice = "";
      if (minPrice == maxPrice) {
        goodsPrice = minPrice;
      } else {
        goodsPrice = minPrice + "~" + maxPrice;
      }
      let costPrice = minCost + "~" + maxCost;
      await this.model("goods")
        .where({
          id: goods_id,
        })
        .update({
          goods_number: goodsNum,
          retail_price: goodsPrice,
          cost_price: costPrice,
          min_retail_price: minPrice,
          min_cost_price: minCost,
        });
    } else {
      let info = {
        goods_number: pro[0].goods_number,
        retail_price: pro[0].retail_price,
        cost_price: pro[0].cost,
        min_retail_price: pro[0].retail_price,
        min_cost_price: pro[0].cost,
      };
      await this.model("goods")
        .where({
          id: goods_id,
        })
        .update(info);
    }
    return this.success(values);
  }

  async uploadHttpsImageAction() {
    let url = this.post("url");
    let accessKey = think.config("qiniuHttps.access_key");
    let secretKey = think.config("qiniuHttps.secret_key");
    let domain = think.config("qiniuHttps.domain");
    var mac = new qiniu.auth.digest.Mac(accessKey, secretKey);
    var config = new qiniu.conf.Config();
    let zoneNum = think.config("qiniuHttps.zoneNum");
    if (zoneNum == 0) {
      config.zone = qiniu.zone.Zone_z0;
    } else if (zoneNum == 1) {
      config.zone = qiniu.zone.Zone_z1;
    } else if (zoneNum == 2) {
      config.zone = qiniu.zone.Zone_z2;
    } else if (zoneNum == 3) {
      config.zone = qiniu.zone.Zone_na0;
    } else if (zoneNum == 4) {
      config.zone = qiniu.zone.Zone_as0;
    }
    var bucketManager = new qiniu.rs.BucketManager(mac, config);
    let bucket = think.config("qiniuHttps.bucket");
    let key = think.uuid(32);
    await think.timeout(500);
    const uploadQiniu = async () => {
      return new Promise((resolve, reject) => {
        try {
          bucketManager.fetch(
            url,
            bucket,
            key,
            function (err, respBody, respInfo) {
              if (err) {
                console.log(err);
                //throw err;
              } else {
                if (respInfo.statusCode == 200) {
                  resolve(respBody.key);
                } else {
                  console.log(respInfo.statusCode);
                }
              }
            }
          );
        } catch (e) {
          return resolve(null);
        }
      });
    };
    const httpsUrl = await uploadQiniu();
    console.log(httpsUrl);
    let lastUrl = domain + httpsUrl;
    return this.success(lastUrl);
  }

}