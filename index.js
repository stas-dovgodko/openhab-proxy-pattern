class ProxyPattern 
{
    constructor(Item, hardwareItem)
    {
        this._updateUndefined = false;
        this._map = new Map(); // proxy => hardware

        let isString = value => typeof value === 'string' || value instanceof String;

        
        if (Item instanceof Map) {
            Item.forEach((value, key) => {
                this._map.set(key, {hardware: value, forward: false, update: false});
            });
        } else if (Item instanceof Object) {
            for (const [key, value] of Object.entries(Item)) {
                this._map.set(key, {hardware: value, forward: false, update: false});
            };
        } else if (isString(Item) && isString(hardwareItem)) {
            this._map.set(Item, {hardware: hardwareItem, forward: false, update: false});
        }
        // make name
        this._name = ""; let i = 0;
        this._map.forEach((value, key) => {
            this._name = this._name.concat(key,"-",value.hardware);
            if (this._map.size > ++i) {
                this._name = this._name.concat(", ");
            }
        });
    }

    undefinedState(state = true)
    {
        this._updateUndefined = state;

        return this;
    }

    get withUndefined()
    {
        return this.undefinedState();
    }

    // forward proxy to hardware
    forward(callback, delay) {
        const delayms = ((typeof delay === 'number') ? delay : 0) * 1000;

        const c = (name, command) => {
            if (callback === undefined) {
                if (command !== undefined) items.getItem(name).sendCommand(command);
            } else if (typeof callback === 'function') {
                const v = callback(command);
                if (v !== undefined) items.getItem(name).sendCommand(v);
            }
            
        }

        let forward_triggers = [];
        this._map.forEach((value, key) => {
            forward_triggers.push(triggers.ItemCommandTrigger(key));
            value.forward = true;
            if (value.update) {
                items.getItem(value.hardware).replaceMetadata('autoupdate', 'false');
            }
        });
        if (forward_triggers.length > 0) {
            rules.JSRule({
                name: "proxy forward [".concat(this._name, "]"),
                triggers: forward_triggers,
                overwrite: true,
                id: "forward: "+this._name,
                tags: ['ProxyManager'],
                execute: event => {
                    let proxy_name = event.itemName;

                    let v = this._map.get(proxy_name);
                    if (v.timer) {
                        clearInterval(v.timer);
                    }
                    if (delayms > 0) {
                        v.timer = setTimeout((function(){
                            c(this.item, items.getItem(this.item).state);
                        }).bind({item: v.hardware, state: event.receivedCommand}), delayms);
                    } else {
                        if (v.pooled !== undefined) {
                            delete v.pooled;
                        }
    
                        c(v.hardware, event.receivedCommand);
                    }
                }
            });
        }

        return this;
    }

    update(callback, interval)
    {
        let update_triggers = [
            triggers.SystemStartlevelTrigger(100)
        ];
        let seconds = 0;
        if (typeof interval === 'number') {
            seconds = parseInt(interval);
            update_triggers.push(triggers.GenericCronTrigger('0/' + parseInt(interval) + ' * * ? * * *')); 
        }
        this._map.forEach((value, key) => {
            update_triggers.push(triggers.ItemStateChangeTrigger(value.hardware));
            value.update = true;
            if (value.forward) {
                items.getItem(value.hardware).replaceMetadata('autoupdate', 'false');
            }
        });

        const c = (name, state) => {
            let v = undefined;
            if (callback === undefined) {
                v = state;
            } else if (typeof callback === 'function') {
                v = callback(state);
            }
            if (v === undefined) {
                if (this._updateUndefined === true) {
                    items.getItem(name).postUpdate('UNDEF');
                } else if (typeof this._updateUndefined !== false) items.getItem(name).postUpdate(this._updateUndefined);
            } else {
                items.getItem(name).postUpdate(v);
            }

        }

        if (update_triggers.length > 0) {
            rules.JSRule({
                name: "proxy update [".concat(this._name, "]"),
                triggers: update_triggers,
                overwrite: true,
                id: "update: "+this._name,
                tags: ['ProxyManager'],
                execute: event => {
                    this._map.forEach((value, key) => {
                        if (event.eventType === 'change') {
                            if (value.hardware === event.itemName) {
                                // found item
                                if (seconds > 0) {
                                    value.pooled = event.newState;
                                } else {
                                    c(key, event.newState);
                                }
                            }

                        } else if (event.eventType === 'time') {

                            if (value.pooled === undefined) {
                                value.pooled = items.getItem(value.hardware).state;
                            }

                            c(key, value.pooled);
                        } else {
                            c(key, items.getItem(value.hardware).state);
                        }
                    });
                }
            });

            // initial state
            this._map.forEach((value, key) => {
                c(key, items.getItem(value.hardware).state);
            });
        }

        return this;
    }
    
    updateEveryMinute(callback) {
        return this.update(callback, 60);
    }
}

// proxy.softItem.update('hardware', callback).everySeconds(15)
// proxy.softItem.forward('hardware', callback).delaySeconds(15)



exports.bind = (Item, hardwareItem) => {

    return new ProxyPattern(Item, hardwareItem);
}
