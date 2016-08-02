'use strict';

class BehaviourRuleBuilder {
    constructor() {
        this.reset();
    }

    reset() {
        this.rule = {
            _entity: 'rule'
        };
    }

    setEvent(className, partName) {
        this.rule.condition = {
            _entity:  'event',
            class:    className,
            partName: partName
        };
        return this;
    }

    addMethod(componendId, methodId) {
        if (this.rule.actions === undefined) {
            this.rule.actions = [];
        }

        this.rule.actions.push({
            _entity: 'call',
            componentId: componendId,
            methodId: methodId
        });

        return this;
    }

    create() {
        let output = this.rule;
        this.reset();
        return output;
    }
}