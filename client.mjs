import fetch from 'node-fetch'
import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
import cron from 'node-cron'

dotenv.config()
const {API_KEY, EMAIL_PW, SENDER_EMAIL} = process.env


let vehicleList = [
    {
        "vehicle_plate": "GBE3785Z",
        "serial": "003F000CE0"
    },
    {
        "vehicle_plate": "GBB4735C",
        "serial": "003F000843"
    },
    {
        "vehicle_plate": "YN3983Z",
        "serial": "003F000B9F"
    },
    {
        "vehicle_plate": "YP3460E",
        "serial": "003F0006B5"
    },
    {
        "vehicle_plate": "GBC1410D",
        "serial": "003F0011D8"
    },
    {
        "vehicle_plate": "GBA6281L",
        "serial": "003F0008E2"
    },
]
    // Convert date to milliseconds
    const dateToMillis = (date) => {
        let d = new Date(date)
        return d.getTime()
    }

const runEmail = async(vehicles) => {

    let date = new Date();
    let todayMillis = dateToMillis(date)
    todayMillis = todayMillis + (8*60*60*1000)
    let todayDate = new Date(todayMillis)
    // let todayDate = date.toISOString().slice(0, 10)
    todayDate.setDate(todayDate.getDate() - 1);
    let yesterdayDate = todayDate.toISOString().slice(0, 10)
    let threshold = 2 * 60 * 1000 // Milliseconds
    // Convert milliseconds to hh:mm:ss format
    const msToHMS = ( ms ) => {
        // 1- Convert to seconds:
        let seconds = ms / 1000;
        // 2- Extract hours:
        const hours = parseInt( seconds / 3600 ); // 3,600 seconds in 1 hour
        seconds = seconds % 3600; // seconds remaining after extracting hours
        // 3- Extract minutes:
        const minutes = parseInt( seconds / 60 ); // 60 seconds in 1 minute
        // 4- Keep only seconds not extracted to minutes:
        seconds = seconds % 60;
        return (hours+":"+minutes+":"+seconds)
    }



    // Calculate duration between two times
    const calculateDuration = (items) => {
        let idleDuration = 0;
        let drivingDuration = 0;
        let totalDuration = 0;

        for(let i = 1; i < items.length; i++){
            if(items[i]["speed"] == 0){
                let duration = dateToMillis(items[i]["gpstime"]) - dateToMillis(items[i-1]["gpstime"])
                totalDuration += duration
                drivingDuration += duration
            }else if(items[i]["speed"] > 0){
                let duration = dateToMillis(items[i]["gpstime"]) - dateToMillis(items[i-1]["gpstime"])
                totalDuration += duration
                idleDuration += duration
            }
        }

        return {
            totalDuration,
            idleDuration,
            drivingDuration
        }

    }

    // Call API and retrieve data
    let total_data = await Promise.all(vehicles.map(async(vehicle, index) => {
        vehicle["data"] = await fetch('http://localhost:6200/gps', {
            "headers": {
                "Content-Type": "application/json"
            },
            "method": "POST",
            "mode": "no-cors",
            "body": JSON.stringify({
                "key": API_KEY,
                "terid": vehicle["serial"],
                "startdatetime": `${yesterdayDate} 00:00:00`,
                "enddatetime": `${yesterdayDate} 23:59:59`
            })
        })
        .then(response => response.json())
        .then(data => {
            return data
        })
        .catch(console.log)
        return vehicle
    })
    )
    
    // Filter for stop duration only 1 minute
    total_data.map(data => {
        let needRemovedIndex = 0
        
        let filteredData = data["data"].filter((item, index) => {
            if(index === 0){
                return item
            }
            else if(needRemovedIndex === 0){
                if(item.speed === 0){
                    
                    if(index === data["data"].length-1){
                        return item
                    }else {
                        // Check next element duration
                        let duration = dateToMillis(data["data"][index+1]["gpstime"]) - dateToMillis(item.gpstime)
                        if(duration > threshold){
                            return item
                        } else {
                            needRemovedIndex = index+1
                        }
                    }
                }else if(item.speed > 0){
                    return item
                }
            }else {
                // Dont return the element
                needRemovedIndex = 0
            }
        })

        data["data"] = [].concat(filteredData)

        let durationList = calculateDuration(filteredData) // This returns an object of duration with below info
        let Totalhours = msToHMS(durationList.totalDuration)
        let Idlehours = msToHMS(durationList.idleDuration)
        let Drivehours = msToHMS(durationList.drivingDuration)
        data["Totalhours"] = Totalhours;
        data["Idlehours"] = Idlehours;
        data["Drivehours"] = Drivehours
        return data
    })

    // let filteredData = data.filter((item, index) => {
    //     if(index === 0){
    //         return item
    //     }
    //     else if(needRemovedIndex === 0){
    //         if(item.speed === 0){
                
    //             if(index === data.length-1){
    //                 return item
    //             }else {
    //                 // Check next element duration
    //                 let duration = dateToMillis(data[index+1]["time"]) - dateToMillis(item.time)
    //                 if(duration > threshold){
    //                     return item
    //                 } else {
    //                     needRemovedIndex = index+1
    //                 }
    //             }
    //         }else if(item.speed > 0){
    //             return item
    //         }
    //     }else {
    //         // Dont return the element
    //         needRemovedIndex = 0
    //     }
    // })


    // let durationList = calculateDuration(filteredData) // This returns an object of duration with below info

    // let Totalhours = msToHMS(durationList.totalDuration)
    // let Idlehours = msToHMS(durationList.idleDuration)
    // let Drivehours = msToHMS(durationList.drivingDuration)


    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: SENDER_EMAIL,
          pass: EMAIL_PW
        }
    });
    // <td>${ (index === item["data"].length -1 )? `Next Day/ ${yesterdayDate} 23:59:59` : item["data"][index+1]["time"] }</td>
    // <td>${(index === item["data"].length -1 )? `Next Day/ ${( new Date(`${yesterdayDate} 23:59-59`)- new Date(detail["time"]) )/1000}` : (
    //     (new Date(item["data"][index+1]["time"]) - new Date(detail["time"]) )/1000
    //     )}
    // </td>
    

    var mailOptions = {
    from: SENDER_EMAIL,
    to: ['kahwaitnts@gmail.com'],
    subject: `TGuard Trip Daily Email Report ${yesterdayDate}`,
    html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css" integrity="sha384-MCw98/SFnGE8fJT3GXwEOngsV7Zt27NXFoaoApmYm81iuXoPkFOJwJ8ERdknLPMO" crossorigin="anonymous">
        <title>Trip Report</title>
        <style>
            td {
                margin-right: 1.2rem;
                margin-bottom: .6rem;
                text-align: center;
            }

            table {
                margin-bottom: 1.5rem;
            }

            thead tr {
                background-color: grey;
                font-weight: bold
            }
        </style>
        </head>
        <body>
        ${
            total_data.map((item, index) => {
                return (`
                    <h1>${item.vehicle_plate}</h1>
                    <h3>Total Duration: ${item.Totalhours}</h3>
                    <h3>Driving Duration: ${item.Idlehours}</h3>
                    <h3>Idle Duration: ${item.Drivehours}</h3>
                    <table style="width:80%">
                        <thead>
                            <tr>
                                <th scope="col">Maximum Speed</th>
                                <th scope="col">Location</th>
                                <th scope="col">Start Time</th>
                                <th scope="col">End Time</th>
                                <th scope="col">Duration(s)</th>
                                <th scope="col">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${
                                item["data"].map((detail, index) => {
                                    if(index === item["data"].length-1){
                                        return null
                                    }
                                    return (`
                                        <tr style=${detail.speed >0 ? "font-weight:bold;background-color:whitesmoke;" : "color:grey;"}>
                                            <td>${detail.maxspeed} km/h</td>
                                            <td>${detail.location}</td>
                                            <td>${detail.gpstime}</td>
                                            <td>${ item["data"][index+1]["gpstime"] }</td>
                                            <td>${((new Date(item["data"][index+1]["gpstime"]) - new Date(detail["gpstime"]) )/1000)}</td>
                                            <td>${ (detail.speed === 0 )? `<p style="color:red">Idle</p>` : `<p style="color:green">Driving</p>` }</td>
                                        </tr>
                                    `)
                                }).join('')
                            }
                            <tr>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td></td>
                                <td>Total Duration: ${item.Totalhours}</td>
                            </tr>
                        </tbody>
                    </table>
                `)
            }).join("")
        }
        </body>
    `
    };
    
    transporter.sendMail(mailOptions, function(error, info){
    if (error) {
        console.log(error);
    } else {
        console.log('Email sent: ' + info.response);
        console.log(filteredData.length)
    }
    });
    
}

// cron.schedule('52 11 * * *', function() {
    runEmail(vehicleList)
// });
