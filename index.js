class Proxy {
    constructor(Item, hardwareItem)
    {
        
        this._item = items.getItem(Item);
        this._hardware = items.getItem(hardwareItem);
    }

    forward(callback) {
        const name = "Forward " + this._item.name + " -> " + this._hardware.name;

        rules.when().item(this._item.name).receivedCommand().then(event => {
            //console.log(event);
            if (callback === undefined) {
                this._hardware.sendCommandIfDifferent(event.receivedCommand);
            } else if (typeof callback === 'function') {
                const v = callback(event.receivedCommand);
                if (v !== undefined) this._hardware.sendCommandIfDifferent(v);
            }
        }).build(name, "Proxy forward");

        return this;
    }

    update(callback) {
        const name = "Update " + this._hardware.name + " -> " + this._item.name;
        rules.when().item(this._hardware.name).receivedUpdate().then(event => {
            //console.log(event);
            if (callback === undefined) {
                if (this._item.state !== this._hardware.state) this._item.postUpdate(this._hardware.state);
            } else if (typeof callback === 'function') {
                const v = callback(this._hardware.state);
                if (v !== undefined) this._item.postUpdate(v);
            }
        }).build(name, "Proxy update");

        return this;
    }

    item() {
        return rules.when().item(this._item.name);
    }

    hardware() {
        return rules.when().item(this._hardware.name);
    }
}


exports.bind = (Item, hardwareItem) => {
    return new Proxy(Item, hardwareItem);
}