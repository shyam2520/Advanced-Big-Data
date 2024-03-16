var express = require('express');
var planRouter = express.Router();
const [healthCheck, client] = require('../middlewares/healthCheck');
const etagCreater = require('../middlewares/etagCreater');
const AJV = require('ajv');
const verifyToken = require('../middlewares/auth');
const ajv = new AJV();
const dataSchema = require('../dataSchema');

planRouter.post('/plan', healthCheck,verifyToken, async (req, res) => {
    if (req._body == false || req.get('Content-length') == 0 || !req.body['objectId'] || ajv.validate(dataSchema, req.body) == false){
        return res.status(400).send('Bad Request');
    }
    client.set(req.body['objectId'], JSON.stringify(req.body),
        (err, reply) => {
            if (err) {
                return res.status(500).send();
            }
            //   console.log("Reply : ", reply)
        })
    const response = await client.get(req.body['objectId']);
    res.set('Etag', etagCreater(JSON.stringify(response)));
    return res.status(201).send(req.body);
})

planRouter.get('/plan', healthCheck,verifyToken, async (req, res) => {
    try {
        const keys = await client.keys('*');
        let result = [];
        for (let key of keys) {
            const value = await client.get(key);
            result.push(JSON.parse(value));
        }
        const etagRes = etagCreater(JSON.stringify(result))
        if(req.get('If-None-Match') && etagRes== req.get('If-None-Match')){
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

planRouter.get('/plan/:id', healthCheck, verifyToken,async (req, res) => {
    try {
        const reponse = await client.get(req.params.id);
        if (reponse == null) {
            return res.status(404).send('Not Found');
        }
        const etagRes = etagCreater(JSON.stringify(reponse))
        if(req.get('If-None-Match') && etagRes == req.get('If-None-Match')){
            return res.status(304).send();
        }
        res.set('Etag', etagRes);
        return res.status(200).send(JSON.parse(reponse));
    }
    catch (err) {
        console.log(err)
       return  res.status(500).send();
    }
})

planRouter.put('/plan/:id', healthCheck,verifyToken, async (req, res) => {
    if (req._body == false || req.get('Content-length') == 0 || !req.body['objectId'] || ajv.validate(dataSchema, req.body) == false){
        return res.status(400).send('Bad Request');
    }
    const response = await client.get(req.params.id);
    if (response == null) {
        return res.status(404).send('Not Found');
    }

    if(req.get('If-Match') !== etagCreater(JSON.stringify(response))){
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


planRouter.patch('/plan/:id', healthCheck,verifyToken, async (req, res) => {
    if (req._body == false || req.get('Content-length') == 0 || !req.body['objectId'] || ajv.validate(dataSchema, req.body) == false){
        return res.status(400).send('Bad Request');
    }
    const response = await client.get(req.params.id);
    if (response == null) {
        return res.status(404).send('Not Found');
    }

    if(req.get('If-Match') !== etagCreater(JSON.stringify(response))){
        return res.status(412).send('Precondition Failed');
    }
    
    const oldResponse = JSON.parse(response);
    // const newResponse = {...oldResponse, ...req.body};

    for(let [key, value] of Object.entries(req.body)){
        if(dataSchema.properties[key].type=='array'){
            const oldArray = oldResponse[key];
            const newArray = value;
            for(let i=0; i<newArray.length; i++){
                const oldData = oldArray.filter((item) => item.objectId == newArray[i].objectId);
                if(oldData.length == 0){
                    oldArray.push(newArray[i]);
                }
                else{
                    oldArray[oldArray.indexOf(oldData[0])] = newArray[i];
                }
            }
        }
        else{
            oldResponse[key] = value;
        }
    }
    client.set(req.params.id, JSON.stringify(oldResponse),
        (err, reply) => {
            if (err) {
                return res.status(500).send();
            }
            //   console.log("Reply : ", reply)
        })
    const etagRes = etagCreater(JSON.stringify(oldResponse))
    res.set('Etag', etagRes);
    return res.status(201).send(oldResponse);
})


planRouter.delete('/plan/:id', healthCheck,verifyToken, async (req, res) => {
    try {
        const response = await client.del(req.params.id);
        if (response == 0) {
            return res.status(404).send('Not Found');
        }
        return res.status(204).send();
    }
    catch (err) {
        console.log(err)
        return res.status(500).send();
    }
})

module.exports = planRouter;
