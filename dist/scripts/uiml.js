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

    addMethod(componendId, methodId, parameters) {
        if (this.rule.actions === undefined) {
            this.rule.actions = [];
        }

        this.rule.actions.push({
            _entity: 'call',
            componentId: componendId,
            methodId: methodId,
            params: parameters.map(a => this.transformParameterEntry(a))
        });

        return this;
    }

    create() {
        let output = this.rule;
        this.reset();
        return output;
    }

    transformParameterEntry(entry) {
        if (entry.type === 'Literal') {
            return {
                _entity: 'param',
                value: entry.value
            }
        }

        if (entry.type === 'MemberExpression') {
            return {
                _entity: 'param',
                name: entry.value.split('.')[1],
                value: {
                    _entity: 'property',
                    partName: entry.value.split('.')[0]
                }
            };
        }

        if (entry.type === 'CallExpression') {
            return {
                _entity: 'param',
                value: {
                    _entity: 'call',
                    componentId: entry.value.split('.')[0],
                    methodId: entry.value.split('.')[1],
                    // params: entry.parameters.map(a => this.transformParameterEntry(a))
                }
            };
        }

        if (entry.type === 'Identifier') {
            return {
                _entity: 'param',
                value: {
                    _entity: 'property',
                    partName: entry.value
                }
            };
        }

        return entry;
    }
}

class StructurePartBuilder {
    constructor() {
        this.reset();
    }
    reset() {
        this.parts = [];
    }
    addPart() {

    }
    addChildPart() {

    }
}