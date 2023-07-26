class Proxy 
{
    constructor(Item, hardwareItem)
    {
        this.proxyItem = Item;
        this.hardwareItem = hardwareItem;

        this._hasForward = false;
        this._hasUpdate = false;
    }

    forward(callback, delay) {
        const name = "PROXY forward " + this.proxyItem + " commands to " + this.hardwareItem;
        
        const delayms = ((typeof delay === 'number') ? delay : 0) * 1000;

        const c = command => {
            if (callback === undefined) {
                items.getItem(this.hardwareItem).sendCommand(command);
            } else if (typeof callback === 'function') {
                const v = callback(command);
                if (v !== undefined) items.getItem(this.hardwareItem).sendCommand(v);
            }
            
        }

        rules.JSRule({
            name: name,
            description: "Proxy forward",
            triggers: [triggers.ItemCommandTrigger(this.proxyItem)],
            overwrite: true,
            ruleGroup: "PROXY forward",
            execute: event => {

                if (this.delayTimer) {
                    clearInterval(this.delayTimer);
                }

                if (delayms > 0) {
                    this.delayTimer = setTimeout(function(){
                        c(event.receivedCommand);
                   }, delayms);
                } else {
                    if (this.pooled !== undefined) {
                        delete this.pooled;
                    }

                    c(event.receivedCommand);
                }
            },
            tags: ['PROXY', 'forward', this.hardwareItem, this.proxyItem]
        });
        this._hasForward = true;
        if (this._hasUpdate) {
            items.getItem(this.hardwareItem).replaceMetadata('autoupdate', 'false');
        }

        return this;
    }

    update(callback, interval)
    {
        const name = "PROXY update " + this.hardwareItem + " state to " + this.proxyItem;

        let t = [
            triggers.ItemStateChangeTrigger(this.hardwareItem),
            triggers.SystemStartlevelTrigger(40)
        ];
        let seconds = 0;
        if (typeof interval === 'number') {
            seconds = parseInt(interval);
            t.push(triggers.GenericCronTrigger('0/' + parseInt(interval) + ' * * ? * * *')); 
        }

        const c = state => {
            if (callback === undefined) {
                if (state !== undefined) items.getItem(this.proxyItem).postUpdate(state);
            } else if (typeof callback === 'function') {
                const v = callback(state);
                if (v !== undefined) items.getItem(this.proxyItem).postUpdate(v);
            }
        }

        rules.JSRule({
            name: name,
            description: "Proxy update",
            triggers: t,
            overwrite: true,
            ruleGroup: "PROXY update",
            execute: event => {
                if (seconds > 0) {
                    
                    if (event.eventType !== 'change') { // timer
                        if (this.pooled === undefined) {
                            this.pooled = items.getItem(this.hardwareItem).state;
                        }

                        c(this.pooled);
                    } else {
                        this.pooled = event.newState;
                    }
                } else {
                    c(event.newState);
                }
            },
            tags: ['PROXY', 'update', this.hardwareItem, this.proxyItem]
        });
        this._hasUpdate = true;
        if (this._hasForward) {
            items.getItem(this.hardwareItem).replaceMetadata('autoupdate', 'false');
        }

        return this;
    }
    
    updateEveryMinute(callback) {
        return this.update(callback, 60);
    }

    item() {
        return rules.when().item(this.proxyItem);
    }

    hardware() {
        return rules.when().item(this.hardwareItem);
    }
}



exports.bind = (Item, hardwareItem) => {

    return new Proxy(Item, hardwareItem);
}
