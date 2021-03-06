# homebridge-switchmate
A [Homebridge](https://github.com/nfarina/homebridge) platform plugin for [Switchmate](http://www.myswitchmate.com).  Switchmate is a Bluetooth LE lightswitch cover which allows for the automation of lightswitches without needing to rewire your home.

This plugin was developed using the "Rocker" models of the Switchmate (RSM0001 & RSM0002), though the Toggle models (TSM0001 & TSM0002)  will ***hopefully*** work too.   
This is still somewhat "experimental" and definitely will need further refinement.

## Prerequisites & Installation
Be sure to install the following pre-requisites before installing homebridge-switchmate.  The prerequisites and their detailed installation instructions are provided on their GitHub pages and websites:

* **[Node.js](https://nodejs.org)**
* **[Noble](https://github.com/sandeepmistry/noble#prerequisites)** ```npm install -g noble```
* **[Noble-Device](https://github.com/sandeepmistry/noble-device#prerequisites)**
* **[Node-Switchmate](https://github.com/emmcc/node-switchmate#readme)** ```npm install -g node-switchmate```

### Note for Raspberry Pi 3 Users:
If you are using a Raspberry Pi 3, you may wish to use a third-party USB Bluetooth adapter.  There have been issues with the Pi disconnecting, especially if its internal Wi-Fi is in use.  The [IOGEAR GBU521](https://www.amazon.com/dp/B007GFX0PY/) is a decent and compact Bluetooth 4.0 adapter which works really well with the Pi 3.

### Installing homebridge-switchmate
1. After installing the pre-requisites, install homebridge-switchmate with the Node Package Manager: ```npm install -g homebridge-switchmate```

## Adding Switchmate to Homebridge:
1. Follow the Switchmate pairing instructions at the [node-switchmate](https://github.com/emmcc/node-switchmate#readme) project page to receive and test your auth code.

## Sample Configuration file:
 ```
        "platforms": [
            {
                "platform": "Switchmate",
                "switchmates": [
                    {
                        "displayName": "Porch Light",
                        "id": "fe5c32ba4c95",
                        "authCode": "VCcHQA==",
                        "model": "RSM001W"
                    }
                ]
            }
        ]
 ```


## Important Considerations:
### Reversed Light Switches:
If your light switches are reversed, you can open the Switchmate App on your smartphone and set it to 'reversed mode'. There is nothing you need to do with this API, as the orientation will be correct in this API after the setting is applied in your Switchmate app.

### Avoiding an accidental Switchmate Reset:
If you provide the **wrong** authCode in your config.json, there is a good chance your Switchmate will reset itself.  This means you will need to relink it to your Smartphone and re-create any timers or schedules you have setup within the Switchmate app.
It is imperative to run the toggle command using your authCode before adding a Switchmate to your config.json file.
