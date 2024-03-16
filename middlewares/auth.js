const express = require('express')
const {OAuth2Client} = require('google-auth-library');
const oauthClient = new OAuth2Client();
/**
 *
 *
 * @param {*} req
 * @param {*} res
 * @param {*} next
 * @return {*} 
 */
const verifyToken = async (req,res,next)=>{
    
    if(req.headers['authorization'] === undefined){
        return res.status(400).send('authorization missing');
    }
    else if(req.headers['authorization'].split(' ')[0] !== 'Bearer'){
        return res.status(400).send('Invalid Bearer Token');
    }
    try{
        const ticket = await oauthClient.verifyIdToken({
            idToken:req.headers['authorization'].split(' ')[1],
            // audience:process.env.CLIENT_ID
            audience:"884410805783-a7vb00kolldp94nj1i3293g6e3e7r0j2.apps.googleusercontent.com"
        });
        const payload = ticket.getPayload();
        next();
        
    }
    catch(err){
        console.log(err);
        res.status(401).send('Unauthorized');
    }
}

module.exports = verifyToken;
