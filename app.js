const express = require('express')
const Client = require("ioredis");
const {default:Redlock} = require("redlock");
const client = new Client(process.env.REDIS_URL);

const app = express()
const response = (res, success, code, message, data) => {
    return res.status(code).json({
      success,
      message,
      data
    })
  };
  
  

const redlock = new Redlock(
    [client],
    {
      driftFactor: 0.01,
      retryCount: 20,
      retryDelay: 300, 
      retryJitter: 1000,
      automaticExtensionThreshold: 1000,
    }
  );
 const manageSession = async (req, res, next)=>{
    try {
        let key = `user_${req.params.id}`
        console.log(key)
        await redlock.using(key, 10000, async (signal) => {
            let key_exist = await client.exists(key) === 1;
            if(key_exist){
                return response(res, false, 409, "Duplicate requests made, wait a moment and try again");
            }
            client.setex(key, 10, "session");
            if (signal.aborted) {
                console.log(signal.error)
                console.log("aborted")
                return response(res, false, 500, "Something went wrong while processing this request.")
            }
            return response(res, true, 200, "Got through")
          });
          return 
    } catch (error) {
        console.log(error.message)
    }
}

app.get('/:id',manageSession)

app.listen(process.env.PORT,()=>{
    console.log("connected")
})