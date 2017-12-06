"use strict";
var SwitchmateManager = require('./SwitchmateManager');
var Accessory, Service, Characteristic, UUIDGen;

module.exports = function(homebridge) {

    Accessory = homebridge.platformAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;

    homebridge.registerPlatform("homebridge-switchmate", "Switchmate", SwitchmatePlatform);
};

function SwitchmatePlatform(log, config, api) {
    this.log = log;
    this.config = config;
    this.switchmates = this.config.switchmates || [];
    this.accessories = [];
    this.parents = {};
    this.setup = {};
    this.SmManager = new SwitchmateManager();

    if (api) {
        this.api = api;
        this.api.on('didFinishLaunching', this.didFinishLaunching.bind(this));
    }
}
;

SwitchmatePlatform.prototype.configureAccessory = function(accessory) {
    var accessoryId = accessory.context.id;

    this.setService(accessory);
    this.accessories[accessoryId] = accessory;
};

SwitchmatePlatform.prototype.didFinishLaunching = function() {
    var platform = this;
    if (!this.switchmates.length) {
        platform.log.error("No Switchmates configured. Please check your 'config.json' file!");
    } else {
        for (var i in platform.switchmates) {
            var data = platform.switchmates[i];
            if (Array.isArray(data.devices)) {
                data.name = "Switchmate Group " + data.devices.map(device => device.id).join('-');
                platform.log("Adding " + data.name + ": (" + data.displayName + ")");
            } else {
                data.name = "Switchmate " + data.id;
                platform.log("Adding " + data.name + ": (" + data.displayName + ")");
            }
            platform.addAccessory(data);
        }

        for (var id in platform.accessories) {
            var switchmate = platform.accessories[id];
            if (!switchmate.reachable) {
                platform.removeAccessory(switchmate);
            }
        }
        platform.SmManager.event.on('smSetup', function(smid) {
            if (platform.accessories[smid]) {
                platform.log('smSetup Individual');
                platform.accessories[smid].getService(Service.Switch)
                    .getCharacteristic(Characteristic.On).getValue();
            } else if (platform.parents[smid]) {
                platform.log('smSetup Group');
                var parentAccessory = platform.accessories[platform.parents[smid]],
                    isReady = false;
                if (parentAccessory && Array.isArray(parentAccessory.context.devices)) {
                    platform.setup[smid] = true;
                    platform.log("** Setup", smid);
                    isReady = parentAccessory.context.devices.every(device => platform.setup[device.id]);
                }
                if (isReady) {
                    platform.log("** is Ready", platform.parents[smid]);
                    parentAccessory.getService(Service.Switch)
                        .getCharacteristic(Characteristic.On).getValue();
                } else {
                    platform.SmManager.GetSwitchmateState(smid)
                }
            } else {
                platform.log('smSetup not found', smid, JSON.stringify(platform.parents));
            }
        });
        platform.SmManager.event.on('smToggleStateChange', function(smid, state) {
            if (platform.accessories[smid]) {
                platform.accessories[smid].getService(Service.Switch)
                    .getCharacteristic(Characteristic.On).getValue();
            } else if (platform.parents[smid]) {
                var parentAccessory = platform.accessories[platform.parents[smid]],
                    isReady = false;
                if (parentAccessory && Array.isArray(parentAccessory.context.devices)) {
                    isReady = parentAccessory.context.devices.every(device => platform.setup[device.id]);
                }
                if (isReady) {
                    parentAccessory.getService(Service.Switch)
                        .getCharacteristic(Characteristic.On).getValue();
                } else {
                    platform.SmManager.GetSwitchmateState(smid)
                }
            }
        });

        platform.SmManager.Initialize(platform.switchmates, platform.log);
    }
};

SwitchmatePlatform.prototype.addAccessory = function(data) {
    var platform = this,
        newAccessory,
        id = Array.isArray(data.devices) ? data.devices.map(device => device.id).join('-') : data.id;

    this.log('***** add id', id);

    if (Array.isArray(data.devices)) {
        data.devices.forEach(device => {
            platform.parents[device.id] = id;
            platform.setup[device.id] = false;
        });
    }

    if (!this.accessories[id]) {
        var uuid = UUIDGen.generate(id);
        newAccessory = new Accessory(id, uuid, 8);

        newAccessory.reachable = true;
        newAccessory.context.name = (Array.isArray(data.devices) ? "Switchmate Group " : "Switchmate ") + id;
        newAccessory.context.displayName = data.displayName;
        newAccessory.context.id = id;
        newAccessory.context.devices = data.devices;

        newAccessory.addService(Service.Switch, data.displayName);

        platform.setService(newAccessory);

        platform.api.registerPlatformAccessories("homebridge-switchmate", "Switchmate", [newAccessory]);
    } else {
        newAccessory = platform.accessories[id];

        newAccessory.updateReachability(true);
    }

    platform.getInitState(newAccessory, data);

    platform.accessories[id] = newAccessory;
};

SwitchmatePlatform.prototype.removeAccessory = function(accessory) {
    if (accessory) {
        var name = accessory.context.name;
        var id = accessory.context.id;
        this.log.warn("Removing Switchmate: " + name + ". No longer configured.");
        this.api.unregisterPlatformAccessories("homebridge-switchmate", "Switchmate", [accessory]);
        delete this.accessories[id];
    }
};

SwitchmatePlatform.prototype.setService = function(accessory) {
    accessory.getService(Service.Switch)
        .getCharacteristic(Characteristic.On)
        .on('set', this.setToggleState.bind(this, accessory, accessory.context))
        .on('get', this.getToggleState.bind(this, accessory.context));

    accessory.on('identify', this.identify.bind(this, accessory.context));
};

SwitchmatePlatform.prototype.getInitState = function(accessory, data) {
    var info = accessory.getService(Service.AccessoryInformation);

    accessory.context.manufacturer = "Switchmate";
    info.setCharacteristic(Characteristic.Manufacturer, accessory.context.manufacturer);

    accessory.context.model = data.model || "";
    info.setCharacteristic(Characteristic.Model, accessory.context.model);

    info.setCharacteristic(Characteristic.SerialNumber, accessory.context.id);

    accessory.getService(Service.Switch)
        .getCharacteristic(Characteristic.On)
        .getValue();
};

SwitchmatePlatform.prototype.setToggleState = function(accessory, context, powerState, callback) {
    var platform = this;
    platform.log("Setting %s (%s) to: %s", context.displayName, context.name, (powerState ? "ON" : "OFF"));

    var currentState = null,
        firstState = null,
        ids = context.devices ? context.devices.map(device => device.id) : [context.id];

    ids.forEach((id, i) => {
        currentState = currentState ^ platform.SmManager.GetSwitchmateState(id);
        if (i === 0) firstState = currentState;
    });

    if (currentState === powerState) return callback();

    (firstState ^ 1) ? platform.SmManager.On(ids[0]) : platform.SmManager.Off(ids[0]);

    var tries = 10;
    (function checkStatus() {
        setTimeout(function() {
            tries--;
            var status = platform.SmManager.GetSwitchmateState(ids[0]);
            if (status == powerState) return callback();
            if (tries <= 0) return callback(true);
            checkStatus();
        }, 1000);
    })();
};

SwitchmatePlatform.prototype.getToggleState = function(context, callback) {
    var platform = this,
        currentState = null,
        ids = context.devices ? context.devices.map(device => device.id) : [context.id];

    ids.forEach(id => {
        currentState = currentState ^ platform.SmManager.GetSwitchmateState(id);
    });

    platform.log("Status of %s (%s) is: %s", context.displayName, context.name, (currentState ? "ON" : "OFF"));
    callback(null, currentState);

};

SwitchmatePlatform.prototype.identify = function(mySwitchmate, paired, callback) {
    var platform = this;
    platform.log("Identify requested for " + mySwitchmate.name);
    callback();
};