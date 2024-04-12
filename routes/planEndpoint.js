var express = require('express');
var planRouter = express.Router();
const [healthCheck, client] = require('../middlewares/healthCheck');
const etagCreater = require('../middlewares/etagCreater');
const AJV = require('ajv');
const verifyToken = require('../middlewares/auth');
const ajv = new AJV();
const dataSchema = require('../dataSchema');
const { type, send } = require('express/lib/response');
const sender = require('../ pubsub/sender');
const {elasticClient,elasticServiceConnection} = require('../services/elasticServiceConnection');



const flattenKeys = async (data) =>{
    const parentKey=`${data.objectType}:${data.objectId}`;
    let newObj = {}; 
    // console.log("Current Parent Key = ",parentKey+"\n")
    // await client.set(parentKey, JSON.stringify(data),
    //     (err, reply) => {
    //         if (err) {
    //             return res.status(500).send();
    //         }
    //     })
    for(let [key,value] of Object.entries(data)){
        if(typeof value == 'object' && !Array.isArray(value)){
            // console.log(key);
            // await client.set(`${parentKey}:${key}`, JSON.stringify(value),(err, reply) => {
            //     if (err) {
            //         return res.status(500).send();
            //     }
            // })
            const newKey = `${parentKey}:${key}`;
            const res = await flattenKeys(value);
            await client.set(newKey, JSON.stringify(res),(err, reply) => {
                if (err) {
                    return res.status(500).send();
                }
            })
            newObj[key] =newKey; 
        }
        else if(Array.isArray(value)){
            // console.log(key + ' is an array')
            let arr = [];
            // await client.set(`${parentKey}:${key}`, JSON.stringify(value),(err, reply) => {
            //     if (err) {
            //         return res.status(500).send();
            //     }
            // })
            for(let i=0;i<value.length;i++){
                arr.push(await flattenKeys(value[i]));
            }
            const newKey = `${parentKey}:${key}`;
            await client.set(newKey, JSON.stringify(arr),(err, reply) => {
                if (err) {
                    return res.status(500).send();
                }
            })
            newObj[key] = newKey;
        }
        else{
            // console.log("remamining keys of the parent which are neither object nor array \n"+key+"\n")
            newObj[key] = value;
        }
    }
    // console.log(parentKey," = ",newObj)
    await client.set(parentKey, JSON.stringify(newObj),(err, reply) => {
        if (err) {
            return res.status(500).send();
        }
    })
    return parentKey;
}

const unflattenKeys = async (parentKey) =>{
    let response = await client.get(parentKey);
    // console.log("Parent Key = ",parentKey+"\n")
    // console.log("Response = ",response+"\n")

    let data = JSON.parse(response);
    // console.log("Data = ",data+"\n")
    let newObj = {};
    if(typeof data == 'string'){
        if(data.split(':').length > 1){
            return unflattenKeys(data);
        }
    }
    else if(Array.isArray(data)){
        let arr = [];
        for(let i=0;i<data.length;i++){
            if(data[i].split(':').length > 1){
                const res= await unflattenKeys(data[i]);
                arr.push(res);
            }
            // const res= await unflattenKeys(data[i]);
            // arr.push(res);
        }
        return arr;
    }
    for(let [key,value] of Object.entries(data)){
        if(typeof value == 'string'){
            value.split(':').length > 1 ? newObj[key] = await unflattenKeys(value) : newObj[key] = value;
        }
        else if(Array.isArray(value)){
            let arr = [];
            for(let i=0;i<value.length;i++){
                const res= await unflattenKeys(value[i]);
                arr.push(res);
            }
            newObj[key] = arr;
        }
        else{
            newObj[key] = value;
        }        
    }
    return newObj;
}

planRouter.post('/plan', healthCheck,verifyToken, async (req, res) => {
    if (req._body == false || req.get('Content-length') == 0 || !req.body['objectId'] || ajv.validate(dataSchema, req.body) == false){
        return res.status(400).send('Bad Request');
    }
    const checkIfExist = await client.get(req.body['objectId']);
    if (checkIfExist != null) {
        return res.status(409).send('Conflict already exists');
    }

    await flattenKeys(req.body);
    sender({operation:"POST",body:req.body}); 
    res.set('Etag', etagCreater(JSON.stringify(req.body)));
    return res.status(201).send(req.body);
})


planRouter.get('/plan', healthCheck, verifyToken, async (req, res) => {
    try {
        const keys = await client.keys('*');
        let result = [];
        for (let key of keys) {
            const value = await client.get(key);
            result.push(JSON.parse(value));
        }
        const etagRes = etagCreater(JSON.stringify(result))
        if (req.get('If-None-Match') && etagRes == req.get('If-None-Match')) {
            return res.status(304).send();
        }
        res.set('Etag', etagRes);
        return res.status(200).send(result);
    }
    catch (err) {
        console.log(err)
        return res.status(500).send();
    }
})

planRouter.get('/plan/:id', healthCheck, verifyToken, async (req, res) => {
    try {
        const parentKey = `plan:${req.params.id}`;
        const response = await unflattenKeys(parentKey);
        if(response == null){
            return res.status(404).send('Not Found');
        }

        const etagRes = etagCreater(JSON.stringify(response))
        if (req.get('If-None-Match') && etagRes == req.get('If-None-Match')) {
            return res.status(304).send();
        }
        res.set('Etag', etagRes);
        return res.status(200).send(response);
        // return res.status(200).send();
    }
    catch (err) {
        console.log(err)
        return res.status(500).send();
    }
})

planRouter.put('/plan/:id', healthCheck, verifyToken, async (req, res) => {
    if (req._body == false || req.get('Content-length') == 0 || !req.body['objectId'] || ajv.validate(dataSchema, req.body) == false) {
        return res.status(400).send('Bad Request');
    }
    const response = await client.get(req.params.id);
    if (response == null) {
        return res.status(404).send('Not Found');
    }

    if (req.get('If-Match') !== etagCreater(JSON.stringify(response))) {
        return res.status(412).send('Precondition Failed');
    }

    client.set(req.params.id, JSON.stringify(req.body),
        (err, reply) => {
            if (err) {
                return res.status(500).send();
            }
            //   console.log("Reply : ", reply)
        })
    const etagRes = etagCreater(JSON.stringify(req.body))
    res.set('Etag', etagRes);
    return res.status(200).send(req.body);
})


planRouter.patch('/plan/:id', healthCheck, verifyToken, async (req, res) => {
    if (req._body == false || req.get('Content-length') == 0 || !req.body['objectId'] || ajv.validate(dataSchema, req.body) == false) {
        return res.status(400).send('Bad Request');
    }
    const parentKey = `plan:${req.params.id}`;  
    const response = await unflattenKeys(parentKey);
    if (response == null) {
        return res.status(404).send('Not Found');
    }

    if (req.get('If-Match') !== etagCreater(JSON.stringify(response))) {
        return res.status(412).send('Precondition Failed');
    }

    const oldResponse = await unflattenKeys(parentKey);
    // const newResponse = {...oldResponse, ...req.body};
    for (let [key, value] of Object.entries(req.body)) {
        if (dataSchema.properties[key].type == 'array') {
            const oldArray = oldResponse[key];
            const newArray = value;
            for (let i = 0; i < newArray.length; i++) {
                const oldData = oldArray.filter((item) => item.objectId == newArray[i].objectId);
                if (oldData.length == 0) {
                    oldArray.push(newArray[i]);
                }
                else {
                    oldArray[oldArray.indexOf(oldData[0])] = newArray[i];
                }
            }
        }
        else {
            oldResponse[key] = value;
        }
    }
    await flattenKeys(oldResponse);
    // const newresponse = await client.get(req.params.id);
    const etagRes = etagCreater(JSON.stringify(req.body))
    res.set('Etag', etagRes);
    return res.status(201).send(oldResponse);

    // const oldResponse = JSON.parse(response);
    // // const newResponse = {...oldResponse, ...req.body};

    // for (let [key, value] of Object.entries(req.body)) {
    //     if (dataSchema.properties[key].type == 'array') {
    //         const oldArray = oldResponse[key];
    //         const newArray = value;
    //         for (let i = 0; i < newArray.length; i++) {
    //             const oldData = oldArray.filter((item) => item.objectId == newArray[i].objectId);
    //             if (oldData.length == 0) {
    //                 oldArray.push(newArray[i]);
    //             }
    //             else {
    //                 oldArray[oldArray.indexOf(oldData[0])] = newArray[i];
    //             }
    //         }
    //     }
    //     else {
    //         oldResponse[key] = value;
    //     }
    // }
    // client.set(req.params.id, JSON.stringify(oldResponse),
    //     (err, reply) => {
    //         if (err) {
    //             return res.status(500).send();
    //         }
    //         //   console.log("Reply : ", reply)
    //     })
})

const deleteAllKeys = async (parentKey) =>{
    const res = await client.get(parentKey);
    const data = JSON.parse(res);
    // console.log(`${parentKey} = ${data}`)
    if(data == null) return ;
    if(typeof data == 'string'){
        if(data.split(':').length > 1){
            await deleteAllKeys(data);
        }
        // return ;
    }
    else if(Array.isArray(data)){
        for(let i=0;i<data.length;i++){
            if(data[i].split(':').length > 1){
                await deleteAllKeys(data[i]);
            }
        }
        // return ; 
    }
    else{
        for(let [key,value] of Object.entries(data)){
            if(typeof value == 'string'){
                if(value.split(':').length > 1){
                    await deleteAllKeys(value);
                }
            }
            else if(Array.isArray(value)){
                for(let i=0;i<value.length;i++){
                    await deleteAllKeys(value[i]);
                }
            }
        }

    }
    // if(await client.exists(parentKey) == 1){
        await client.del(parentKey);
    // }
    // await client.del(parentKey);
}
planRouter.delete('/plan/:id', healthCheck, verifyToken, async (req, res) => {
    try {
        const parentKey = `plan:${req.params.id}`;
        const response = await client.get(parentKey);
        if (response == null) {
            return res.status(404).send('Not Found');
        }
        await deleteAllKeys(parentKey);
        // const response = await client.del(req.params.id);
        // if (response == 0) {
        //     return res.status(404).send('Not Found');
        // }
        return res.status(204).send();
    }
    catch (err) {
        console.log(err)
        return res.status(500).send();
    }
})

module.exports = planRouter;
