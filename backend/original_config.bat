@echo off
setlocal enabledelayedexpansion

REM Define the JSON payload
set "json={
    \"groups\": {
        \"stripA\":  [\"100-4858\"],
        \"stripB\":  [\"5100-9858\"],
        \"stripC\":  [\"10100-14858\"],
        \"stripD\":  [\"15100-19858\"],
        \"proj\":    [\"20000\"]
    },
    \"universes\": {
        \"ctrl45\": [
            {\"ip\":\"192.168.1.45\",\"universe\":0,\"channel\":1},
            {\"ip\":\"192.168.1.45\",\"universe\":1,\"channel\":1},
            {\"ip\":\"192.168.1.45\",\"universe\":2,\"channel\":1},
            {\"ip\":\"192.168.1.45\",\"universe\":31,\"channel\":1}
        ],
        \"ctrl46\": [
            {\"ip\":\"192.168.1.46\",\"universe\":32,\"channel\":1},
            {\"ip\":\"192.168.1.46\",\"universe\":63,\"channel\":1}
        ],
        \"ctrl47\": [
            {\"ip\":\"192.168.1.47\",\"universe\":64,\"channel\":1},
            {\"ip\":\"192.168.1.47\",\"universe\":95,\"channel\":1}
        ],
        \"ctrl48\": [
            {\"ip\":\"192.168.1.48\",\"universe\":96,\"channel\":1},
            {\"ip\":\"192.168.1.48\",\"universe\":127,\"channel\":1}
        ],
        \"projector\": [
            {\"ip\":\"192.168.1.45\",\"universe\":200,\"channel\":1}
        ]
    },
    \"routes\": [
        {\"group\":\"stripA\", \"uniBank\":\"ctrl45\", \"channel\":1, \"select\":\"RGB\", \"enable\":true},
        {\"group\":\"stripB\", \"uniBank\":\"ctrl46\", \"channel\":1, \"select\":\"RGB\", \"enable\":true},
        {\"group\":\"stripC\", \"uniBank\":\"ctrl47\", \"channel\":1, \"select\":\"RGB\", \"enable\":true},
        {\"group\":\"stripD\", \"uniBank\":\"ctrl48\", \"channel\":1, \"select\":\"RGB\", \"enable\":true},
        {\"group\":\"proj\", \"uniBank\":\"projector\", \"channel\":1, \"select\":\"RGB\", \"enable\":true},
        {\"group\":\"proj\", \"uniBank\":\"projector\", \"channel\":2, \"select\":\"W\", \"enable\":true}
    ],
    \"patch\": [],
    \"max_fps\": 30,
    \"ehub_port\": 7000,
    \"artnet_port\": 6454
}"

REM Send the PUT request using curl
curl -X PUT http://localhost:8080/api/config ^
         -H "Content-Type: application/json" ^
         --data "!json!"