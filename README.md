<img src="JamesBot.jpg" align="right" alt="JamesBot in Action" width="400"/>

# JamesBot
JamesBot A Telegram Reminder Bot for Birthdays and Garbage Dates. 

# Backend
JamesBot is deployed as three different NodeJS AWS Lambda functions (two for sending reminder messages via chron events, one for processing user requests).
An AWS API Gateway is used for polling in order to process user requests directly. Jamesbot is mainly written in Typescript. The main framework used for the telegram mechanics is [telegraf](https://github.com/telegraf/telegraf).


