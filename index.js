class Proxy {
    constructor(Item, hardwareItem, seconds)
    {
        this._item = items.getItem(Item);
        this._hardware = items.getItem(hardwareItem);

        this._seconds = seconds;
    }

    forward(callback) {
        const name = "Forward " + this._item.name + " -> " + this._hardware.name;

        rules.JSRule({
            name: name,
            description: "Proxy forward",
            triggers: [triggers.ItemCommandTrigger(this._item.name)],
            overwrite: true,
            ruleGroup: "PROXY forward",
            execute: event => {
                if (callback === undefined) {
                    this._hardware.sendCommandIfDifferent(event.receivedCommand);
                } else if (typeof callback === 'function') {
                    const v = callback(event.receivedCommand);
                    if (v !== undefined) this._hardware.sendCommandIfDifferent(v);
                }
            },
            tags: [this._hardware.name, this._item.name]
        });

        return this;
    }

    update(callback)
    {
        const name = "Update " + this._hardware.name + " -> " + this._item.name;

        let t = [
            triggers.ItemStateUpdateTrigger(this._hardware.name)
        ];
        if (this._seconds > 0) {
            t.push(triggers.GenericCronTrigger('0/' + parseInt(this._seconds) + ' * * ? * * *'));
        }

        const c = state => {
            if (callback === undefined) {
                if (state !== undefined) this._item.postUpdate(state);
            } else if (typeof callback === 'function') {
                const v = callback(state);
                if (v !== undefined) this._item.postUpdate(v);
            }
        }

        rules.JSRule({
            name: name,
            description: "Proxy update",
            triggers: t,
            overwrite: true,
            ruleGroup: "PROXY update",
            execute: event => {
                if (this._seconds > 0) {
                    if (event.eventType !== 'update') { // timer
                        if (this.pooled !== undefined) {
                            c(this.pooled);

                            delete this.pooled;
                        }
                    } else {
                        this.pooled = this._hardware.state;
                    }
                } else {
                    c(this._hardware.state);
                }
            },
            tags: [this._hardware.name, this._item.name]
        });

        return this;
    }

    item() {
        return rules.when().item(this._item.name);
    }

    hardware() {
        return rules.when().item(this._hardware.name);
    }
}


exports.bind = (Item, hardwareItem, seconds) => {

    return new Proxy(Item, hardwareItem, (typeof seconds === 'number') ? seconds : 0);
}
