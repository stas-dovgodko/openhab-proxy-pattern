JS wrapper to implement common used Proxy Item pattern

[Pattern explanation](https://community.openhab.org/t/design-pattern-proxy-item/15991)

# Usage examples

```js
let proxy = require('openhab-proxy-pattern');

/*
proxy.bind(proxy_item_name, hardware_item_name).update([callback]).forward([callback]);
*/

// one direction proxy
proxy.bind('Equipment_WF_OutTemperature', 'SmartMAC_D105_1_T2').update();

// bi-directional proxy
proxy.bind("GF_Toilet_MirrorLight", "Shelly_25R_3_1Output")
    .forward()
    .update();

// proxy with custom values
proxy.bind('Equipment_ElectricityInverterBattery_Voltage', 'PZEM_1_Voltage')
    .update(function(value) {

        if (typeof value == 'string') {
            const v = parseInt(value) / 100;
            return `${v} V`;
        } else {
            return undefined;
        }
    });

// wide-options proxy
let phases = ['A', 'B', 'C'];

const v = function(value) {
    if (typeof value == 'string') {
        const v = parseInt(value);
        return `${v} V`;
    } else return undefined;
};

phases.forEach(function(phase) {
    proxy.bind(`Equipment_ElectricityHomeV${phase}`, `Shelly_EM3_2_${phase}Voltage`)
    .update(v);
});

```

