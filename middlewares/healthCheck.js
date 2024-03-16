const { createClient } = require('redis');
const client = createClient();
const passport = require('passport')
const GoogleStrategy = require('passport-google-oidc') 
const redisConnection =async function (req) {
    return new Promise( async (resolve,reject)=>{
        try {
            // console.log(req.path);
            await client.connect();
            resolve("Redis Connect")
            }
        catch (err) {
            reject(err)
        }
    })
}

const healthCheck = async (req,res,next)=>{
    try{
        if(!client.isOpen){
         await redisConnection();
         console.log("Called connect");
        }
        else{
         // next();
         console.log("Client is alread open")
        }
        console.log("Calling next")
        next()
    }
    catch(err){
        res.status(500).send(err);
    }
 
 }

module.exports = [healthCheck,client]
