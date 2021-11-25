# Read Me - 25th Nov 2021


## Objective
*The objective of this project is to create a system where we get GPS data (Coordinates) on vehicle and call Google Reverse Geocoding API to obtain the location name. It is then processed to group it with several filter conditions such as duration of idling and minimum speed etc to be displayed it in a report which send regularly to end user by email*

*The end product might be used for several usage such as comparing driver handwritten job card by HR, track the travelling of vehicle to understand more about route etc.*


### Pseudocode
1. Get GPS data through our API
2. Filter the data based on condition (Example: Ignore the speed 0 duration that is not more than 1 minute and more than 0 speed that is not more than 1 minute etc.)
3. Call Google Reverse Geocoding to get location name while also processing Speed data for driving period (In order to obtain maximum speed achieved)
4. Display in HTML template using nodemailer with styling
5. Email Sent


### For anyone who might be interested on the application no matter you want to give feedback or work as business together, feel free to contact me
Email: <jeffreyhodev@gmail.com>
Contact No: (+65) 8427 6055