import express from 'express'
import fetch from 'node-fetch'
import bodyParser from 'body-parser'
import cors from 'cors'


const app = express()

const port = 6200
const jsonParser = bodyParser.json()
app.use(jsonParser)
app.use(cors())

// key = zT908g2j9nhExsAmW2pQahTvmGt8B2QZ9Gk5pIky7N4%3D

// Get secret API key
app.post('/getKey', async(req,res) => {
    try {
        var clientIp = requestIp.getClientIp(req);
        console.log(clientIp);
        const username = req.body.username;
        const password = req.body.password;
        let response = await fetch(`http://tnts-eye2a.dvrdns.org:12056/api/v1/basic/key?username=${username}&password=${password}`)
        let data = await response.json()
        res.json(data)
    }catch(err){
        res.json(err)
    }
})

const dateToMillis = (date) => {
    let d = new Date(date)
    return d.getTime()
}

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}

// Get GPS
app.post('/gps', async(req, res) => {
    try{
        const key = req.body.key // String
        const terid = req.body.terid // terminal
        const startdatetime = req.body.startdatetime // string
        const enddatetime = req.body.enddatetime

        let response = await fetch('http://tnts-eye2a.dvrdns.org:12056/api/v1/basic/gps/detail', {
            headers: {
                'Content-type': 'application/json'
            },
            body: JSON.stringify({
                "key": key,
                "terid": terid,
                "starttime": startdatetime,
                "endtime": enddatetime
            }),
            method: "POST"
        })

        let returnData = await response.json()
        let threshold = 1 * 60 * 1000 // Milliseconds
        let previousSpeed = 0
        let previousTime = 0
        let maxSpeed = 0
        let recordSpeed = []
        let processedData = await returnData["data"].filter((item, index) => {
            if(item.speed > maxSpeed){
                maxSpeed = item.speed
            }
            if(index == 0) {
                // dateToMillis(item.time)
                previousTime = dateToMillis(item.time)
                previousSpeed =  parseInt(item.speed)
                return item
            }else if(previousSpeed !== 0 && item.speed == 0 && (dateToMillis(item.time) - previousTime >= threshold) ) {
                // await console.log(dateToMillis(item.time))
                previousTime = dateToMillis(item.time)
                previousSpeed =  parseInt(item.speed)
                recordSpeed.push(maxSpeed)
                maxSpeed = 0
                item["maxSpeed"] = 0
                return item
            }else if(previousSpeed === 0 && item.speed !== 0 && (dateToMillis(item.time) - previousTime >= threshold)){
                // await console.log(dateToMillis(item.time))
                previousTime = dateToMillis(item.time)
                previousSpeed =  parseInt(item.speed)
                return item
            }

            
        })
        console.log(recordSpeed)

        let callAPI = async(url) => {
            let location = null
            do{
                let response = await fetch(url)
                location = await response.json()
                if(location.status === 'OK'){
                    sleep(30000)
                    return location["results"][0]["formatted_address"]
                }
                else {
                    location = null
                }
            }while(!location)             
        }
        
        let finalData = await Promise.all(processedData.map(async (item,index) => {
                try {

                    let locationName = await callAPI(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${parseFloat(item.gpslat)},${parseFloat(item.gpslng)}&key=AIzaSyDr5VKsAqZqgN8zfppjow65NxlgfiB8pds`)
                    sleep(30000)
                    item["location"] = locationName
                    return item

                }catch(err){

                }
            })
        )
    
        for(let i=0; i < finalData.length; i++){
            if(finalData[i]["speed"] > 0 && i == 0){
                finalData[i]["maxspeed"] = recordSpeed[0]
                recordSpeed.shift()
            }else if(finalData[i]["speed"] == 0 && i == 0) {
                finalData[i]["maxspeed"] = 0
            }else if(finalData[i]["speed"] > 0){
                finalData[i]["maxspeed"] = recordSpeed[0]
                recordSpeed.shift()
            }else {
                finalData[i]["maxspeed"] = 0
            }
        }
        
        console.log(finalData.length)
        res.json(finalData)
             
    }catch(err){
        res.json(err)
    }
})


app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})

